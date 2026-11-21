import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", title: /Online Personal Trainer/, h1: /started/i },
  { path: "/about", title: /About/, h1: /addictive personality/i },
  { path: "/coaching", title: /Coaching/, h1: /Your numbers checked in on/i },
  { path: "/results", title: /Results/, h1: /Men with jobs, kids/i },
  { path: "/apply", title: /Apply/, h1: /where you're at/i },
  { path: "/rebuild", title: /The Full Rebuild/, h1: /drank every night/i },
  { path: "/terms-coaching", title: /Terms/, h1: /The terms/i },
  { path: "/body-recomposition-calculator", title: /Body Recomposition Calculator/, h1: /lose fat and build/i },
];

// scroll to the bottom in steps so scroll-triggered reveals and lazy images run
async function walk(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
    scrollTo(0, 0);
  });
}

for (const p of pages) {
  test.describe(p.path, () => {
    test("loads cleanly", async ({ page }) => {
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      page.on("console", m => m.type() === "error" && errors.push(m.text()));
      const res = await page.goto(p.path);
      expect(res.status()).toBe(200);
      await expect(page).toHaveTitle(p.title);
      await expect(page.locator("h1")).toContainText(p.h1);
      await walk(page);
      expect(errors, errors.join("\n")).toEqual([]);
    });

    test("no em dashes in the copy", async ({ page }) => {
      await page.goto(p.path);
      expect(await page.locator("body").innerText()).not.toContain(String.fromCharCode(8212));
    });

    test("every image loads", async ({ page }) => {
      await page.goto(p.path);
      await walk(page);
      await page.waitForLoadState("networkidle").catch(() => {});
      const broken = await page.$$eval("img", imgs => imgs.filter(i => i.loading !== "lazy" || i.complete).filter(i => i.complete && i.naturalWidth === 0).map(i => i.src));
      expect(broken).toEqual([]);
    });

    test("page never scrolls sideways", async ({ page }) => {
      await page.goto(p.path);
      await walk(page);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(over).toBeLessThanOrEqual(1);
    });

    test("Apply buttons go to the form", async ({ page }) => {
      await page.goto(p.path);
      const applies = page.locator("a.btn", { hasText: /apply/i });
      const n = await applies.count();
      for (let i = 0; i < n; i++) await expect(applies.nth(i)).toHaveAttribute("href", "/apply");
    });

    test("internal links resolve", async ({ page, request }) => {
      await page.goto(p.path);
      const hrefs = await page.$$eval("a[href]", as => [...new Set(as.map(a => a.getAttribute("href")))]);
      const ours = ["/", "/about", "/coaching", "/results", "/apply", "/terms-coaching", "/rebuild"];
      const local = hrefs.map(h => h.split("#")[0] || "/").filter(h => ours.includes(h));
      for (const h of new Set(local)) expect((await request.get(h)).status(), h).toBe(200);
      expect(hrefs.filter(h => /^[\w-]+\.html/.test(h)), "links should use clean addresses").toEqual([]);
    });

    test("screenshot", async ({ page }, info) => {
      await page.goto(p.path);
      await walk(page);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `test-results/shots/${info.project.name}${p.path === "/" ? "/home" : p.path}.png`, fullPage: true });
    });
  });
}

test("apply form builds the WhatsApp message", async ({ page }) => {
  const copies = [];
  const forwarded = [];
  let direct = 0;
  await page.route("**/formspree.io/**", (route) => {
    direct += 1;
    return route.abort();
  });
  await page.route("**/api/apply**", async (route) => {
    const url = route.request().url();
    if (url.includes("apply-forward")) {
      forwarded.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: "{\"ok\":true}" });
      return;
    }
    copies.push(route.request().postDataJSON());
    await route.fulfill({ status: 500, contentType: "application/json", body: "{\"ok\":false}" });
  });
  await page.goto("/apply");
  await expect(page.locator("#applyRecipient")).toBeVisible();
  await expect(page.locator("#applyRecipient")).toContainText("Callum Broadfoot (CALLUM.B)");
  await expect(page.locator("#applyRecipient")).toContainText("Formspree");
  await expect(page.locator("#applyRecipient a")).toHaveAttribute("href", "/privacy");
  await expect(page.locator("#healthConsentLabel")).toBeHidden();
  await page.fill("#f-name", "Dave");
  await page.fill("#f-age", "42");
  await page.fill("#f-contact", "dave@example.com");
  await page.getByText("Lose fat", { exact: true }).click();
  await page.fill("#f-tried", "Fall off by week three.");
  await page.getByText("12 months", { exact: true }).click();
  await page.getByRole("button", { name: /send my application/i }).click();
  await expect(page.locator("#applyDone")).toBeVisible();
  await expect(page.locator("#doneHead")).toHaveText("Got it. I'll be in touch within 24 hours.");
  await expect(page.locator("#applyText")).toContainText("Name: Dave");
  await expect(page.locator("#applyText")).toContainText("Plan: 12 months");
  const href = await page.locator("#applySend").getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/447359838866\?text=/);
  expect(decodeURIComponent(href)).toContain("Fall off by week three.");
  await expect.poll(() => copies.length).toBe(1);
  expect(copies[0]).toEqual({
    name: "Dave",
    contact: "dave@example.com",
    marketingConsent: "",
    website: "",
  });
  expect(forwarded[0].plan).toBe("12 months, Structured Development");
  expect(forwarded[0].drinking).toBeUndefined();
  expect(forwarded[0].healthConsent).toBeUndefined();
  expect(direct).toBe(0);
});

test("health consent is required only when a drinking detail is given", async ({ page }) => {
  const forwarded = [];
  await page.route("**/formspree.io/**", (route) => route.abort());
  await page.route("**/api/apply**", async (route) => {
    if (!route.request().url().includes("apply-forward")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{\"ok\":true}" });
      return;
    }
    forwarded.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: "{\"ok\":true}" });
  });
  await page.goto("/apply");
  await expect(page.locator("#healthConsentLabel")).toBeHidden();
  await expect(page.locator("#f-marketing")).not.toBeChecked();
  await page.fill("#f-name", "Dave");
  await page.fill("#f-contact", "dave@example.com");
  await page.getByText("Get my health back", { exact: true }).click();
  await page.getByRole("button", { name: /send my application/i }).click();
  await expect(page.locator("#applyDone")).toBeVisible();
  expect(forwarded.at(-1).healthConsent).toBeUndefined();
  expect(forwarded.at(-1).drinking).toBeUndefined();

  await page.goto("/apply");
  await page.fill("#f-name", "Dave");
  await page.fill("#f-contact", "dave@example.com");
  await page.locator("#applyForm").getByText("The Full Rebuild", { exact: true }).click();
  await page.locator("#applyForm").getByText("I've stopped", { exact: true }).click();
  await expect(page.locator("#healthConsentLabel")).toBeHidden();
  await page.getByRole("button", { name: /send my application/i }).click();
  await expect(page.locator("#applyDone")).toBeVisible();
  expect(forwarded.at(-1).drinking).toBeUndefined();
  expect(forwarded.at(-1).amount).toBeUndefined();

  await page.goto("/apply");
  await page.fill("#f-name", "Dave");
  await page.fill("#f-contact", "dave@example.com");
  await page.locator("#applyForm").getByText("The Full Rebuild", { exact: true }).click();
  await page.locator("#applyForm").getByText("Every night", { exact: true }).click();
  await expect(page.locator("#healthConsentLabel")).toBeVisible();
  await expect(page.locator("#f-health-consent")).not.toBeChecked();
  const before = forwarded.length;
  await page.getByRole("button", { name: /send my application/i }).click();
  await expect(page.locator("#applyForm")).toBeVisible();
  await expect(page.locator("#healthConsentErr")).toBeVisible();
  await expect(page.locator("#healthConsentErr")).toHaveText("Please tick this box so I can read your answers.");
  expect(forwarded.length).toBe(before);
  await page.locator("#f-health-consent").check();
  await page.getByRole("button", { name: /send my application/i }).click();
  await expect(page.locator("#applyDone")).toBeVisible();
  expect(forwarded.at(-1).drinking).toBe("Every night");
  expect(forwarded.at(-1).healthConsent).toBe("yes");
  expect(forwarded.at(-1).amount).toBeUndefined();
});

test("Full Rebuild screen carries drinking answers into the application", async ({ page }) => {
  await page.route("**/formspree.io/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "{}",
  }));
  await page.goto("/rebuild");
  await page.locator("#screen").scrollIntoViewIfNeeded();
  const gate = page.locator("#rebuildGate");
  await gate.getByText("Every night", { exact: true }).click();
  await page.locator("#rb-amount").fill("A bottle of wine");
  await gate.getByText(/I've read that/).click();
  await expect(page.locator("#rebuildRecipient")).toBeVisible();
  await expect(page.locator("#rb-health-consent")).not.toBeChecked();
  await page.getByRole("button", { name: /continue to the form/i }).click();
  await expect(page).toHaveURL(/\/rebuild/);
  await expect(page.locator("#rbHealthConsentErr")).toBeVisible();
  await page.locator("#rb-health-consent").check();
  await page.getByRole("button", { name: /continue to the form/i }).click();
  await page.waitForURL(/\/apply\?plan=The(?:\+|%20)Full(?:\+|%20)Rebuild/);
  await expect(page.locator('input[name="plan"][value="The Full Rebuild"]')).toBeChecked();
  await expect(page.locator("#rebuildFields")).toBeVisible();
  await expect(page.locator('#applyForm input[value="Every night"]')).toBeChecked();
  await expect(page.locator("#f-amount")).toHaveValue("A bottle of wine");
  await expect(page.locator('#applyForm input[name="gp"]')).toBeChecked();
  await expect(page.locator("#f-health-consent")).not.toBeChecked();
  await page.fill("#f-name", "Dave");
  await page.fill("#f-contact", "dave@example.com");
  await page.getByRole("button", { name: /send my application/i }).click();
  await expect(page.locator("#applyDone")).toBeHidden();
  await expect(page.locator("#healthConsentErr")).toBeVisible();
  await expect(page.locator("#healthConsentErr")).toHaveText("Please tick this box so I can read your answers.");
  await page.locator("#f-health-consent").check();
  await page.getByRole("button", { name: /send my application/i }).click();
  await expect(page.locator("#applyText")).toContainText("Plan: The Full Rebuild");
  await expect(page.locator("#applyText")).toContainText("Drinking: Every night");
  await expect(page.locator("#applyText")).toContainText("A bottle of wine");
  await expect(page.locator("#applyText")).toContainText("GP note");
});

test("discovery call does not send drinking answers without consent", async ({ page }) => {
  const posts = [];
  let direct = 0;
  await page.route("**/formspree.io/**", (route) => {
    direct += 1;
    return route.abort();
  });
  await page.route("**/api/apply-forward", async (route) => {
    posts.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: "{\"ok\":true}" });
  });
  await page.goto("/rebuild");
  await page.locator("#screen").scrollIntoViewIfNeeded();
  const gate = page.locator("#rebuildGate");
  await expect(page.locator("#rebuildRecipient")).toContainText("I use it only to get ready for your call and reply.");
  await expect(page.locator("#rebuildRecipient a")).toHaveAttribute("href", "/privacy");
  await expect(page.locator("#rbHealthLabel")).toBeHidden();
  await page.getByRole("button", { name: /book the discovery call/i }).click();
  await page.waitForURL(/\/book/);
  expect(posts.at(-1).drinking).toBeUndefined();
  expect(posts.at(-1).healthConsent).toBeUndefined();

  await page.goto("/rebuild");
  await page.locator("#screen").scrollIntoViewIfNeeded();
  await gate.getByText("I've stopped", { exact: true }).click();
  await expect(page.locator("#rbHealthLabel")).toBeHidden();
  await page.getByRole("button", { name: /continue to the form/i }).click();
  await page.waitForURL(/\/apply/);
  await page.goto("/rebuild");
  await page.locator("#screen").scrollIntoViewIfNeeded();
  await gate.getByText("Every night", { exact: true }).click();
  await page.locator("#rb-amount").fill("A bottle of wine");
  await gate.getByText(/I've read that/).click();
  await expect(page.locator("#rbHealthLabel")).toBeVisible();
  await expect(gate.getByText("to get ready for my discovery call")).toBeVisible();
  await expect(page.locator("#rb-health-consent")).not.toBeChecked();
  const before = posts.length;
  await page.getByRole("button", { name: /book the discovery call/i }).click();
  await expect(page).toHaveURL(/\/rebuild/);
  await expect(page.locator("#rbHealthConsentErr")).toBeVisible();
  await expect(page.locator("#rbHealthConsentErr")).toHaveText("Please tick this box so I can read your answers.");
  expect(posts.length).toBe(before);
  await page.locator("#rb-health-consent").check();
  await page.getByRole("button", { name: /book the discovery call/i }).click();
  await page.waitForURL(/\/book/);
  expect(posts.at(-1)).toMatchObject({
    source: "rebuild",
    _subject: "Full Rebuild: drinking screen, booking the call",
    plan: "The Full Rebuild",
    drinking: "Every night",
    amount: "A bottle of wine",
    gp: "yes",
    healthConsent: "yes",
  });
  expect(direct).toBe(0);
});

test("rebuild shows the consent error when the server refuses", async ({ page }) => {
  await page.route("**/formspree.io/**", (route) => route.abort());
  await page.route("**/api/apply-forward", (route) => route.fulfill({
    status: 422,
    contentType: "application/json",
    body: "{\"ok\":false,\"error\":\"consent\"}",
  }));
  await page.goto("/rebuild");
  await page.locator("#screen").scrollIntoViewIfNeeded();
  const gate = page.locator("#rebuildGate");
  await expect(gate.getByText("I ask the drinking questions so I can judge whether The Full Rebuild is right for you. If you'd rather tell me on the call, pick that option.")).toBeVisible();
  await gate.getByText("Every night", { exact: true }).click();
  await page.locator("#rb-amount").fill("A bottle of wine");
  await page.locator("#rb-health-consent").check();
  const book = page.getByRole("button", { name: /book the discovery call/i });
  await book.click();
  await expect(page).toHaveURL(/\/rebuild/);
  await expect(page.locator("#rbHealthConsentErr")).toBeVisible();
  await expect(page.locator("#rbHealthConsentErr")).toHaveText("Please tick this box so I can read your answers.");
  await expect(book).toBeEnabled();
});

test("home: client app tabs switch screens", async ({ page }) => {
  await page.goto("/");
  await page.locator(".cli").scrollIntoViewIfNeeded();
  await page.locator('.cli__tabs button[data-s="2"]').click();
  await expect(page.locator(".cli__screen")).toHaveAttribute("data-s", "2");
  await expect(page.locator('.cli__tabs button[data-s="2"]')).toHaveAttribute("aria-selected", "true");
});

test("home: video feedback plays when in view", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.locator(".vf").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  const playing = await page.locator(".vf video").evaluate(v => !v.paused && v.currentTime > 0);
  expect(playing).toBe(true);
});

test.describe("with Reduce Motion on", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("sections still fade in and numbers still count", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(".fails .panel").first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/\bin\b/);
    await page.waitForTimeout(1200);
    expect(await card.evaluate(e => getComputedStyle(e).opacity)).toBe("1");
    expect(await card.evaluate(e => getComputedStyle(e).transform)).toBe("none");
    const n = page.locator(".sdr__n [data-count]");
    await n.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(n).not.toHaveText("89");
    await expect(n).toHaveText("89");
  });
  test("research row stays still", async ({ page }) => {
    await page.goto("/coaching");
    const track = page.locator(".evtrack");
    await track.scrollIntoViewIfNeeded();
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});

for (const path of ["/", "/coaching", "/results"]) {
  test(`five foundations guide on ${path}`, async ({ page }) => {
    await page.goto(path + "#guide");
    const section = page.locator("#guide");
    await expect(section).toContainText("five foundations");
    await expect(section).toContainText("Protein at every meal");
    await expect(section).toContainText("Daily steps");
    await expect(section).toContainText("Three short sessions a week");
    await expect(section).toContainText("Sleep");
    await expect(section).toContainText("One weekly check-in");
    await expect(section.locator('a[data-ev="Guide download"]')).toHaveAttribute("href", "/guides/the-five-foundations.pdf");
    const text = await section.innerText();
    expect(text.toLowerCase()).not.toContain("five numbers");
    expect(text).not.toContain("Blood pressure");
    expect(text).not.toContain("\u2014");
    expect(text).not.toContain("\u2013");
  });
}

test("old guide address redirects to the new pdf", async ({ request }) => {
  const next = await request.get("/guides/the-five-foundations.pdf");
  expect(next.status()).toBe(200);
  expect(next.headers()["content-type"] || "").toMatch(/pdf/);
  const bytes = await next.body();
  expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
  const old = await request.get("/guides/five-numbers.pdf", { maxRedirects: 0 });
  expect(old.status()).toBe(301);
  expect(old.headers().location).toBe("/guides/the-five-foundations.pdf");
});

test("cPanel hostname calls the vercel chat and lead paths", async ({ request }) => {
  const widget = await (await request.get("/chat/widget.js")).text();
  const components = await (await request.get("/components.js")).text();
  const rule = "/(^|\\.)callumbcoaching\\.co\\.uk$/";
  expect(widget).toContain(rule);
  expect(widget).toContain("https://callumb-coaching.vercel.app/api/chat");
  expect(widget).toContain('"/api/chat"');
  expect(components).toContain(rule);
  expect(components).toContain("https://callumb-coaching.vercel.app/api/lead.php");
  expect(components).toContain('"/api/lead.php"');
  expect(widget).not.toContain("api-base.js");
  expect(components).not.toContain("api-base.js");
});

test("guide form posts to lead.php on this origin", async ({ page }) => {
  let posted = "";
  let body = null;
  await page.route("**/api/lead.php", async (route) => {
    posted = route.request().url();
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, download: "/guides/the-five-foundations.pdf" }),
    });
  });
  await page.goto("/#guide");
  const box = page.locator('#guide input[name="marketing-consent"]');
  await expect(box).not.toBeChecked();
  await page.locator("#guide input[name=name]").fill("Test");
  await page.locator("#guide input[name=email]").fill("test@example.com");
  await page.locator("#guide button[type=submit]").click();
  await expect(page.locator("#guide .leadok")).toBeVisible();
  await expect(page.locator('#guide a[data-ev="Guide download"]')).toHaveAttribute(
    "href",
    "/guides/the-five-foundations.pdf",
  );
  expect(posted).toMatch(/\/api\/lead\.php$/);
  expect(posted).not.toContain("vercel.app");
  expect(body["marketing-consent"]).toBe("no");
});

test("links page keeps the content loop and the campaign", async ({ page }) => {
  const events = [];
  await page.addInitScript(() => {
    window.__events = [];
    window.plausible = (name, opts) => {
      window.__events.push({ name, props: (opts && opts.props) || {} });
    };
  });
  await page.route("**/plausible.io/**", (route) => route.abort());
  let body = null;
  await page.route("**/api/lead.php", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, download: "/guides/the-five-foundations.pdf" }),
    });
  });
  await page.goto("/links/?utm_source=instagram&utm_medium=bio");
  await expect(page.locator("h1")).toContainText("already full");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /coaching options/i);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /package/i);
  const text = await page.locator("main").innerText();
  const folded = text.toLowerCase();
  const order = [
    "coaching options",
    "physique os",
    "the 90",
    "one-to-one",
    "the full rebuild",
    "get the five foundations",
    "book a free call",
    "free tools",
    "tdee calculator",
    "protein calculator",
    "more guides",
    "5 signs guide",
    "glp-1 blueprint",
    "trt starter",
    "instagram",
  ];
  let at = -1;
  for (const label of order) {
    const next = folded.indexOf(label);
    expect(next, label).toBeGreaterThan(at);
    at = next;
  }
  await expect(page.locator('a[data-ev="Head Start click"]')).toHaveCount(0);
  await expect(page.locator('a[href*="GK689386"]')).toHaveCount(0);
  const linksHtml = await page.content();
  expect(linksHtml).toContain("HEAD START PAUSED");
  expect(linksHtml).toContain("£47 one-off");
  expect(linksHtml).toContain("9 Nov 2026 to 3 Jan 2027");
  expect(linksHtml).toContain("Late joiners finish with the group");
  const linksLive = linksHtml.replace(/<!--[\s\S]*?-->/g, "");
  expect(linksLive).not.toContain("GK689386");
  expect(linksLive).toContain("https://coach.everfit.io/package/NW877413");
  await expect(page.locator('a[data-ev="Physique OS click"]')).toHaveAttribute(
    "href",
    /https:\/\/coach\.everfit\.io\/package\/NW877413\?.*utm_source=instagram/,
  );
  await expect(page.locator('a[data-ev="Physique OS click"]')).toHaveAttribute("rel", "noopener");
  await expect(page.locator('a[data-ev="Physique OS click"]')).toContainText("£29 a month");
  await expect(page.locator('a[data-ev="The 90 click"]')).toHaveAttribute(
    "href",
    "/the-ninety?utm_source=instagram&utm_medium=bio",
  );
  await expect(page.locator('a[data-ev="The 90 click"]')).toContainText("£297 one-off");
  await expect(page.locator('a[data-ev="Apply click"]')).toHaveAttribute(
    "href",
    "/apply?utm_source=instagram&utm_medium=bio",
  );
  await expect(page.locator('a[data-ev="Apply click"]')).toContainText("Application only");
  await expect(page.locator('a[data-ev="Rebuild click"]')).toHaveAttribute(
    "href",
    "/rebuild?utm_source=instagram&utm_medium=bio",
  );
  await expect(page.locator('a[data-ev="Rebuild click"]')).toContainText("£12,000");
  await expect(page.locator('a[data-ev="Rebuild click"]')).not.toContainText(/8 weeks/i);
  await expect(page.locator('a[data-ev="Rebuild click"]')).not.toContainText(/check-?in/i);
  const fold = await page.locator('a[data-ev="Apply click"]').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { bottom: rect.bottom, top: rect.top, height: window.innerHeight, width: window.innerWidth };
  });
  expect(fold.top, "one-to-one starts on screen").toBeGreaterThanOrEqual(0);
  expect(fold.bottom, "four packages fit above the fold").toBeLessThanOrEqual(fold.height);
  await expect(page.locator('a[data-ev="TDEE click"]')).toHaveAttribute(
    "href",
    "/tdee-calculator?utm_source=instagram&utm_medium=bio",
  );
  await expect(page.locator('a[data-ev="Protein click"]')).toHaveAttribute(
    "href",
    "/protein-calculator?utm_source=instagram&utm_medium=bio",
  );
  await expect(page.locator('a[data-ev="5 Signs click"]')).toHaveAttribute(
    "href",
    "/guide/?utm_source=instagram&utm_medium=bio",
  );
  await expect(page.locator('a[data-ev="GLP-1 click"]')).toHaveAttribute(
    "href",
    "/glp1-blueprint?utm_source=instagram&utm_medium=bio",
  );
  await expect(page.locator('a[data-ev="TRT click"]')).toHaveAttribute(
    "href",
    "/trt-starter/?utm_source=instagram&utm_medium=bio",
  );
  await expect(page.locator('a[data-ev="Instagram click"]')).toHaveAttribute(
    "href",
    /utm_source=instagram/,
  );
  await page.locator("#lf-email-links").fill("test@example.com");
  await page.locator('#guide button[type=submit]').click();
  await expect(page.locator("#guide .leadok")).toBeVisible();
  expect(body).toMatchObject({
    email: "test@example.com",
    src: "links",
    utm_source: "instagram",
    utm_medium: "bio",
    "marketing-consent": "no",
  });
  expect(text).not.toContain("\u2014");
  expect(text).not.toContain("\u2013");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  const tracked = await page.evaluate(() => window.__events.map((event) => event.name));
  expect(tracked).toContain("Guide form click");
  expect(tracked).toContain("Guide signup");
  await page.locator('a[data-ev="TDEE click"]').evaluate((a) => {
    a.addEventListener("click", (event) => event.preventDefault(), true);
  });
  await page.locator('a[data-ev="TDEE click"]').click();
  const tdee = await page.evaluate(() => window.__events.find((event) => event.name === "TDEE click"));
  expect(tdee.props.utm_source).toBe("instagram");
  expect(tdee.props.utm_medium).toBe("bio");
  expect(tdee.props.page).toBe("/links/");
  await page.locator('a[data-ev="Protein click"]').evaluate((a) => {
    a.addEventListener("click", (event) => event.preventDefault(), true);
  });
  await page.locator('a[data-ev="Protein click"]').click();
  const protein = await page.evaluate(() => window.__events.find((event) => event.name === "Protein click"));
  expect(protein.props.utm_source).toBe("instagram");
  await page.locator('a[data-ev="5 Signs click"]').evaluate((a) => {
    a.addEventListener("click", (event) => event.preventDefault(), true);
  });
  await page.locator('a[data-ev="5 Signs click"]').click();
  const signs = await page.evaluate(() => window.__events.find((event) => event.name === "5 Signs click"));
  expect(signs.props.utm_medium).toBe("bio");
});

test("pricing Head Start uses the live cohort dates", async ({ page }) => {
  await page.goto("/pricing");
  const head = page.locator("article.plan", { has: page.getByRole("heading", { name: "Head Start" }) });
  await expect(head).toContainText("£47");
  await expect(head).toContainText("Cohort, 9 Nov 2026 to 3 Jan 2027. Late joiners finish with the group.");
  await expect(head).not.toContainText(/8[- ]weeks?/i);
  await expect(head).not.toContainText(/check-?in/i);
  await expect(head).toContainText("Paused until January");
  await expect(head.locator("a.btn")).toHaveCount(0);
  await expect(head.locator('a[href*="everfit.io"]')).toHaveCount(0);
  const pricingHtml = await page.content();
  expect(pricingHtml).toContain("HEAD START PAUSED");
  expect(pricingHtml).toContain("https://coach.everfit.io/package/GK689386");
  const pricingLive = pricingHtml.replace(/<!--[\s\S]*?-->/g, "");
  expect(pricingLive).not.toContain("GK689386");
  expect(pricingLive).not.toContain("Get your spot");
  const os = page.locator("article.plan", { has: page.getByRole("heading", { name: "Physique OS" }) });
  await expect(os).toContainText("£29");
  await expect(os).toContainText("Run the system yourself.");
  await expect(os.locator("a.btn")).toHaveAttribute("href", "https://coach.everfit.io/package/NW877413");
  const ninety = page.locator("article.plan", { has: page.getByRole("heading", { name: "The Ninety" }) });
  await expect(ninety).toContainText("£297");
  await expect(ninety).toContainText("90 days with a monthly call and review.");
  const coaching = page.locator("article.plan", { has: page.getByRole("heading", { name: "1:1 coaching" }) });
  await expect(coaching).toContainText("£67");
  await expect(coaching).toContainText("Application only, for men 30 and over.");
  const text = await page.locator("main").innerText();
  expect(text).not.toContain("\u2014");
  expect(text).not.toContain("\u2013");
  expect(text).not.toMatch(/8[- ]weeks?/i);
});

test("Physique OS trial buttons go to the Everfit checkout", async ({ page }) => {
  const checkout = "https://coach.everfit.io/package/NW877413";
  await page.goto("/start");
  await expect(page.locator("h1")).toContainText(/yourself/i);
  await expect(page.locator("main")).toContainText("the 4-weekly self-review that keeps progress moving");
  const trials = page.locator("a.btn-solid", { hasText: /start/i });
  expect(await trials.count()).toBeGreaterThan(0);
  const n = await trials.count();
  for (let i = 0; i < n; i++) await expect(trials.nth(i)).toHaveAttribute("href", checkout);
  await page.locator("#ptMonthly").click();
  await expect(page.locator("#ptCta")).toHaveAttribute("href", checkout);
  await expect(page.locator("#ptPrice")).toHaveText("£29");
  await page.locator("#ptAnnual").click();
  await expect(page.locator("#ptCta")).toHaveAttribute("href", checkout);
  await expect(page.locator("#ptPrice")).toHaveText("£249");
  await expect(page.locator('nav a[href="/the-ninety/"]')).toHaveCount(1);
  await expect(page.locator('a[href="/coaching"]')).toHaveCount(1);
  const programmes = [
    "Home or Minimal Equipment 3-Day",
    "Beginner 3-Day Full Body",
    "Intermediate 4-Day Upper/Lower",
    "Advanced 5-Day Split",
    "Fat Loss 3-Day Strength + Conditioning",
  ];
  for (const name of programmes) await expect(page.locator("main")).toContainText(name);
  await expect(page.locator("main")).toContainText("7 days free");
  await expect(page.locator("main")).toContainText("SAVE £99");
  await expect(page.locator("main")).not.toContainText("I'll activate the next rung");
  const quotes = await page.locator("main").innerText();
  expect(quotes).toContain("Waist went 119cm to 101cm");
  expect(quotes).toContain("Fed up of feeling heavy on site");
  expect(quotes).toContain("Never trained properly before");
  expect(quotes).not.toContain("\u2014");
  expect(quotes).not.toContain("\u2013");
});

test("physique-os redirects to the start page", async ({ request }) => {
  for (const path of ["/physique-os", "/physique-os/"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(301);
    expect(res.headers().location).toBe("/start");
  }
});

test("os-setup is self-led and does not offer to load the plan", async ({ page }) => {
  await page.goto("/os-setup");
  await expect(page.locator("h1")).toContainText("in");
  const text = await page.locator("body").innerText();
  await expect(page.locator("body")).toContainText("Set your numbers");
  await expect(page.locator("body")).toContainText("Where are you starting?");
  await expect(page.locator("body")).toContainText("Nobody builds a plan from it.");
  await expect(page.locator("body")).toContainText("Home or Minimal Equipment 3-Day");
  await expect(page.locator("body")).toContainText("Fat Loss 3-Day Strength + Conditioning");
  expect(text).not.toContain("I'll have your macros");
  expect(text).not.toContain("I'm loading your macros");
  expect(text).not.toContain("Build my setup");
  expect(text).not.toContain("\u2014");
  expect(text).not.toContain("\u2013");
  await expect(page.locator("#setup")).toHaveCount(0);
});

function noDashes(text) {
  expect(text).not.toContain("\u2014");
  expect(text).not.toContain("\u2013");
}

async function watchLead(page) {
  const posted = [];
  await page.addInitScript(() => {
    window.__events = [];
    window.plausible = (name, opts) => {
      window.__events.push({ name, props: (opts && opts.props) || {} });
    };
  });
  await page.route("**/plausible.io/**", (route) => route.abort());
  await page.route("**/api/lead.php", async (route) => {
    posted.push({ url: route.request().url(), body: route.request().postDataJSON() });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, download: "/guides/the-five-foundations.pdf" }),
    });
  });
  return posted;
}

test("calculator gate uses the guide lead endpoint", async ({ request }) => {
  const js = await (await request.get("/assets/js/calc-gate.js?v=2")).text();
  const rule = "/(^|\\.)callumbcoaching\\.co\\.uk$/";
  expect(js).toContain(rule);
  expect(js).toContain("https://callumb-coaching.vercel.app/api/lead.php");
  expect(js).toContain('"/api/lead.php"');
  expect(js).not.toContain("formspree");
  expect(js).not.toContain("\u2014");
  expect(js).not.toContain("\u2013");
});

test("TDEE coaching button opens 1:1 coaching", async ({ page }) => {
  await page.goto("/tdee-calculator");
  const coaching = page.getByRole("link", { name: "See 1:1 online coaching" });
  await expect(coaching).toHaveAttribute("href", "/coaching");
  await coaching.click();
  await expect(page).toHaveURL(/\/coaching$/);
  await expect(page.locator("h1")).toContainText("Your numbers checked in on");
  await expect(page.getByText("Premium 1:1 coaching", { exact: false }).first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/in-person/i);
});

test("recomp calculator runs at maintenance with 2 to 2.2 g/kg protein", async ({ page }) => {
  const posted = await watchLead(page);
  await page.goto("/body-recomposition-calculator");
  await expect(page.locator("#rc-wait")).toBeVisible();
  await expect(page.locator("#rc-cals")).toBeHidden();
  await page.locator("#user-bf").fill("70");
  await expect(page.locator("#bf-msg")).toContainText("between 3 and 60");
  await page.locator("#user-bf").fill("25");
  await expect(page.locator("#rc-wait")).toBeHidden();
  // Same maintenance as /tdee-calculator for the same inputs.
  await expect(page.locator("#rc-cals")).toHaveText("2820");
  await expect(page.locator("#rc-bmr")).toHaveText("1820");
  await expect(page.locator("#rc-protein")).toHaveText("128 to 140");
  await expect(page.locator(".calc-gate .calc-detail")).toBeHidden();
  await page.getByRole("button", { name: "See the full setup" }).click();
  await page.locator("#rc-name").fill("Sam");
  await page.locator("#rc-email").fill("sam@example.com");
  await page.getByRole("button", { name: "Show my setup" }).click();
  await expect(page.locator(".calc-gate .calc-detail")).toBeVisible();
  await expect(page.locator("#m-protein")).toHaveText("140");
  await expect(page.locator("#m-carbs")).toHaveText("438");
  await expect(page.locator("#m-fat")).toHaveText("56");
  await expect(page.locator("#m-basis")).toContainText("lean mass (64 kg)");
  expect(posted).toHaveLength(1);
  expect(posted[0].body.src).toBe("recomp-calculator");
  await page.locator("#user-bf").fill("10");
  await expect(page.locator("#rc-protein")).toHaveText("170 to 187");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => JSON.parse(t)["@type"] === "FAQPage")).toBe(true);
  await page.goto("/tdee-calculator");
  await expect(page.locator('#how-tdee-works a[href="/body-recomposition-calculator"]')).toHaveCount(1);
});

test("TDEE keeps the calorie result and gates the breakdown", async ({ page }) => {
  const posted = await watchLead(page);
  await page.goto("/tdee-calculator?utm_source=instagram&utm_medium=bio");
  await expect(page.locator("#tdee-wait")).toBeVisible();
  await expect(page.locator("#tdee-wait")).toContainText("Add your body fat %");
  await expect(page.locator("#target-cals")).toBeHidden();
  await expect(page.getByRole("button", { name: "See the full breakdown" })).toBeHidden();
  await expect(page.locator("#user-bf")).toHaveAttribute("required", "");
  await page.locator("#user-bf").fill("70");
  await expect(page.locator("#bf-msg")).toContainText("between 3 and 60");
  await expect(page.locator("#target-cals")).toBeHidden();
  await page.locator("#user-bf").fill("25");
  await expect(page.locator("#tdee-wait")).toBeHidden();
  await expect(page.locator("#bf-msg")).toBeHidden();
  await expect(page.locator("#target-cals")).toHaveText("2250");
  await expect(page.locator("#tdee")).toHaveText("2820");
  await expect(page.locator("#bmr")).toHaveText("1820");
  await expect(page.locator("#goal-label")).toHaveText("Your fat-loss target");
  await expect(page.locator("#tdee-gate-form")).toBeHidden();
  await expect(page.locator(".calc-gate .calc-detail")).toBeHidden();
  await expect(page.getByRole("link", { name: "Get this built around me" })).toBeVisible();
  const coaching = page.getByRole("link", { name: "See 1:1 online coaching" });
  await expect(coaching).toBeVisible();
  await expect(coaching).toHaveAttribute("href", "/coaching");

  await page.getByRole("button", { name: "See the full breakdown" }).click();
  await expect(page.locator("#tdee-gate-form")).toBeVisible();
  await expect(page.locator("#target-cals")).toHaveText("2250");
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.locator("#tdee-gate-form")).toBeHidden();
  await expect(page.locator(".calc-gate .calc-detail")).toBeHidden();
  await expect(page.locator("#target-cals")).toHaveText("2250");
  expect(posted).toHaveLength(0);

  await page.getByRole("button", { name: "See the full breakdown" }).click();
  await expect(page.locator('#tdee-gate-form a[href="/privacy"]')).toBeVisible();
  await page.getByRole("button", { name: "Show my breakdown" }).click();
  await expect(page.locator("#tdee-gate-form .leadf__msg")).toHaveText("Add your first name.");
  await page.locator("#tdee-name").fill("Sam");
  await page.locator("#tdee-email").fill("not-an-email");
  await page.getByRole("button", { name: "Show my breakdown" }).click();
  await expect(page.locator("#tdee-gate-form .leadf__msg")).toContainText("doesn't look right");
  expect(posted).toHaveLength(0);
  await expect(page.locator("#target-cals")).toHaveText("2250");

  await page.locator("#tdee-email").fill("sam@example.com");
  await page.getByRole("button", { name: "Show my breakdown" }).click();
  await expect(page.locator(".calc-gate .calc-detail")).toBeVisible();
  await expect(page.locator("#m-protein")).toHaveText("183");
  await expect(page.locator("#m-carbs")).toHaveText("254");
  await expect(page.locator("#m-fat")).toHaveText("56");
  await expect(page.locator("#m-basis")).toContainText("lean mass (64 kg)");
  await expect(page.locator("#cut-cals")).toHaveText("2250");
  await expect(page.locator("#gain-cals")).toHaveText("3100");
  await expect(page.locator(".calc-guide")).toHaveAttribute("href", "/guides/the-five-foundations.pdf");
  await expect(page.locator("#target-cals")).toHaveText("2250");
  expect(posted).toHaveLength(1);
  expect(posted[0].url).toMatch(/\/api\/lead\.php$/);
  expect(posted[0].url).not.toContain("vercel.app");
  expect(posted[0].body).toEqual({
    name: "Sam",
    email: "sam@example.com",
    website: "",
    src: "tdee-calculator",
    utm_source: "instagram",
    utm_medium: "bio",
    "marketing-consent": "no",
  });

  await page.locator("#goal").selectOption("0.1");
  await expect(page.locator("#target-cals")).toHaveText("3100");
  await expect(page.locator("#goal-label")).toHaveText("Your muscle-gain target");
  await expect(page.locator("#m-protein")).toHaveText("141");
  await expect(page.locator("#m-fat")).toHaveText("56");
  await expect(page.locator("#m-carbs")).toHaveText("508");
  await expect(page.locator("#cut-cals")).toHaveText("2250");
  await expect(page.locator("#gain-cals")).toHaveText("3100");

  // 20% or under works off full body weight
  await page.locator("#goal").selectOption("-0.2");
  await page.locator("#user-bf").fill("15");
  await expect(page.locator("#m-protein")).toHaveText("244");
  await expect(page.locator("#m-carbs")).toHaveText("187");
  await expect(page.locator("#m-fat")).toHaveText("59");
  await expect(page.locator("#m-basis")).toContainText("full body weight");
  await page.locator("#goal").selectOption("0.1");
  await expect(page.locator("#m-protein")).toHaveText("187");
  await expect(page.locator("#m-fat")).toHaveText("75");
  await expect(page.locator("#m-carbs")).toHaveText("419");

  // 15 to 25% blends from full weight to lean mass
  await page.locator("#goal").selectOption("-0.2");
  await page.locator("#user-bf").fill("20");
  await expect(page.locator("#m-protein")).toHaveText("219");
  await expect(page.locator("#m-carbs")).toHaveText("192");
  await expect(page.locator("#m-fat")).toHaveText("67");
  await expect(page.locator("#m-basis")).toContainText("Adjusted for your body fat");
  await page.locator("#goal").selectOption("0.1");

  // clearing body fat hides the numbers again
  await page.locator("#user-bf").fill("");
  await expect(page.locator("#tdee-wait")).toBeVisible();
  await expect(page.locator("#m-protein")).toBeHidden();
  await page.locator("#user-bf").fill("15");

  const events = await page.evaluate(() => window.__events);
  expect(events.map((event) => event.name).filter((name) => name.startsWith("TDEE"))).toEqual([
    "TDEE unlock",
    "TDEE unlock",
    "TDEE submit",
  ]);
  expect(events.find((event) => event.name === "TDEE submit").props).toMatchObject({
    page: "/tdee-calculator",
    src: "tdee-calculator",
    utm_source: "instagram",
    utm_medium: "bio",
  });

  noDashes(await page.locator("main").innerText());
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.reload();
  await expect(page.locator("#target-cals")).toBeHidden();
  await page.locator("#user-bf").fill("25");
  await expect(page.locator("#target-cals")).toHaveText("2250");
  await expect(page.locator("#tdee-gate-form")).toBeHidden();
  await expect(page.locator(".calc-gate .calc-detail")).toBeVisible();
  await expect(page.locator("#m-protein")).toHaveText("183");
  expect(posted).toHaveLength(1);
});

test("a failed TDEE signup leaves the free calories in place", async ({ page }) => {
  await page.addInitScript(() => {
    window.__events = [];
    window.plausible = (name, opts) => {
      window.__events.push({ name, props: (opts && opts.props) || {} });
    };
  });
  await page.route("**/plausible.io/**", (route) => route.abort());
  await page.route("**/api/lead.php", (route) => route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ ok: false }),
  }));
  await page.goto("/tdee-calculator");
  await page.locator("#user-bf").fill("25");
  await page.getByRole("button", { name: "See the full breakdown" }).click();
  await page.locator("#tdee-name").fill("Sam");
  await page.locator("#tdee-email").fill("sam@example.com");
  await page.getByRole("button", { name: "Show my breakdown" }).click();
  await expect(page.locator("#tdee-gate-form .leadf__msg")).toContainText("Something went wrong");
  await expect(page.locator(".calc-gate .calc-detail")).toBeHidden();
  await expect(page.locator("#target-cals")).toHaveText("2250");
  await expect(page.locator("#tdee-gate-form")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("cb-calc-tdee-calculator"))).toBeNull();
  const names = await page.evaluate(() => window.__events.map((event) => event.name));
  expect(names).toContain("TDEE unlock");
  expect(names).not.toContain("TDEE submit");
});

test("protein keeps the daily target and gates the breakdown", async ({ page }) => {
  const posted = await watchLead(page);
  await page.goto("/protein-calculator?utm_source=instagram&utm_medium=bio");
  await expect(page.locator("#pcResults")).toBeHidden();
  await page.locator("#pcWeight").fill("82");
  await expect(page.locator("#pcBf")).toHaveAttribute("required", "");
  await page.locator("#pcCalc").click();
  await expect(page.locator("#pcBfMsg")).toContainText("Add your body fat % first");
  await expect(page.locator("#pcResults")).toBeHidden();
  await page.locator("#pcBf").fill("80");
  await page.locator("#pcCalc").click();
  await expect(page.locator("#pcBfMsg")).toContainText("between 3 and 60");
  await expect(page.locator("#pcResults")).toBeHidden();
  await page.locator("#pcBf").fill("25");
  await page.locator("#pcCalc").click();
  await expect(page.locator("#pcBfMsg")).toBeHidden();
  await expect(page.locator("#pcProtDay")).toContainText("176");
  await expect(page.locator(".calc-gate .calc-detail")).toBeHidden();
  await expect(page.locator("#pcProtMeal")).toBeHidden();

  await page.getByRole("button", { name: "See the full breakdown" }).click();
  await expect(page.locator("#pc-gate-form")).toBeVisible();
  await expect(page.locator('#pc-gate-form a[href="/privacy"]')).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.locator("#pc-gate-form")).toBeHidden();
  await expect(page.locator("#pcProtDay")).toContainText("176");
  await expect(page.locator(".calc-gate .calc-detail")).toBeHidden();
  expect(posted).toHaveLength(0);

  await page.getByRole("button", { name: "See the full breakdown" }).click();
  await page.locator("#pc-name").fill("Sam");
  await page.locator("#pc-email").fill("sam@example.com");
  await page.getByRole("button", { name: "Show my breakdown" }).click();
  await expect(page.locator(".calc-gate .calc-detail")).toBeVisible();
  await expect(page.locator("#pcProtMeal")).toContainText("35");
  await expect(page.locator("#pcMealBand")).toContainText("25 to 40 g");
  await expect(page.locator("#pcFat")).toHaveText("176 to 203 g");
  await expect(page.locator("#pcGain")).toHaveText("136 to 176 g");
  await expect(page.locator("#pcFatNote")).toContainText("lean mass (62 kg)");
  await expect(page.locator(".calc-guide")).toHaveAttribute("href", "/guides/the-five-foundations.pdf");
  await expect(page.locator("#pcProtDay")).toContainText("176");
  expect(posted).toHaveLength(1);
  expect(posted[0].body).toEqual({
    name: "Sam",
    email: "sam@example.com",
    website: "",
    src: "protein-calculator",
    utm_source: "instagram",
    utm_medium: "bio",
    "marketing-consent": "no",
  });
  const events = await page.evaluate(() => window.__events);
  expect(events.map((event) => event.name).filter((name) => name.startsWith("Protein"))).toEqual([
    "Protein unlock",
    "Protein unlock",
    "Protein submit",
  ]);
  expect(events.find((event) => event.name === "Protein submit").props.src).toBe("protein-calculator");

  noDashes(await page.locator("main").innerText());
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.reload();
  await page.locator("#pcWeight").fill("82");
  await page.locator("#pcBf").fill("15");
  await page.locator("#pcCalc").click();
  await expect(page.locator("#pc-gate-form")).toBeHidden();
  await expect(page.locator(".calc-gate .calc-detail")).toBeVisible();
  await expect(page.locator("#pcProtDay")).toContainText("235");
  await expect(page.locator("#pcProtMeal")).toContainText("47");
  await expect(page.locator("#pcFat")).toHaveText("235 to 271 g");
  await expect(page.locator("#pcGain")).toHaveText("181 to 235 g");
  await expect(page.locator("#pcFatNote")).toContainText("full body weight");
  expect(posted).toHaveLength(1);
});

test("protein target moves smoothly with body fat, no cliff", async ({ page }) => {
  await page.route("**/plausible.io/**", (route) => route.abort());
  await page.goto("/protein-calculator");
  await page.locator("#pcWeight").fill("82");
  const read = async (bf) => {
    await page.locator("#pcBf").fill(String(bf));
    await page.locator("#pcCalc").dispatchEvent("click");
    return parseInt((await page.locator("#pcProtDay").innerText()).replace(/\D/g, ""), 10);
  };
  expect(await read(10)).toBe(235);
  expect(await read(15)).toBe(235);
  expect(await read(20)).toBe(212);
  expect(await read(21)).toBe(205);
  expect(await read(25)).toBe(176);
  const a = await read(19.9);
  const b = await read(20.1);
  expect(a - b).toBeGreaterThanOrEqual(0);
  expect(a - b).toBeLessThanOrEqual(3);
  let prev = await read(5);
  for (let bf = 5.5; bf <= 40; bf += 0.5) {
    const now = await read(bf);
    expect(now, `at ${bf}%`).toBeLessThanOrEqual(prev);
    expect(prev - now, `step into ${bf}%`).toBeLessThanOrEqual(5);
    prev = now;
  }
});

test("book page offers the Cal.com call", async ({ page }) => {
  const calRequests = [];
  page.on("request", (req) => {
    if (req.url().includes("cal.com")) calRequests.push(req.url());
  });
  await page.goto("/book");
  await expect(page).toHaveTitle(/Book a free 20-minute call/);
  await expect(page.locator("h1.h2")).toHaveText(/Book a free 20-minute call/);
  await expect(page.locator("main")).toContainText("Just you and me, by phone.");
  await expect(page.locator("main")).toContainText("No pressure and no hard sell.");
  const html = await page.content();
  expect(html.toLowerCase()).not.toContain("calendly");
  expect(html).not.toContain("\u2014");
  expect(html).not.toContain("\u2013");
  const fallback = page.locator('a[href="https://cal.com/callumbcoaching/discovery-call"]');
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute("href", "https://cal.com/callumbcoaching/discovery-call");
  await expect(page.locator("#cal-inline")).toBeAttached();
  await page.waitForTimeout(400);
  expect(calRequests.filter((url) => url.includes("embed.js"))).toEqual([]);
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await page.getByRole("button", { name: "Show the calendar" }).click();
  await expect(page.locator("#cal-inline iframe")).toBeAttached({ timeout: 15000 });
  expect(calRequests.some((url) => url.includes("app.cal.com/embed/embed.js"))).toBe(true);
  await expect(fallback).toBeVisible();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(over).toBeLessThanOrEqual(1);
});

for (const path of ["/", "/coaching", "/apply", "/links"]) {
  test(`${path} offers a free call next to apply`, async ({ page }) => {
    await page.goto(path);
    const book = page.locator('a.btn[href="/book"]', { hasText: /book a free call/i });
    await expect(book.first()).toBeVisible();
    const apply = page.locator('a.btn[href="/apply"]');
    await expect(apply.first()).toBeVisible();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(over).toBeLessThanOrEqual(1);
  });
}

test("held copy uses the check-in wording and drops the unsourced muscle figures", async ({ page }) => {
  await page.goto("/coaching");
  await expect(page.locator("main")).toContainText("Your numbers checked in on");
  await expect(page.locator("main")).toContainText("Your weekly check-in, which I review.");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /a reviewed weekly check-in/);
  const coaching = await page.locator("main").innerText();
  expect(coaching).not.toContain("Every Sunday");
  expect(coaching).not.toContain("\u2014");
  expect(coaching).not.toContain("\u2013");

  await page.goto("/guide");
  await expect(page.locator("body")).toContainText("Some of the weight lost on a GLP-1 can be muscle");
  await expect(page.locator("body")).toContainText("How to protect your muscle while the scale drops.");
  await expect(page.locator("body")).toContainText("a weekly check-in that I review");
  const guide = await page.locator("body").innerText();
  expect(guide).not.toContain("40%");
  expect(guide).not.toContain("twelve years");
  expect(guide).not.toContain("Mark:");

  await page.goto("/muscle/");
  const loss = page.locator(".hgrid .cell").nth(0);
  const fix = page.locator(".hgrid .cell").nth(2);
  await expect(loss).toContainText("Some of it can be muscle");
  await expect(loss).not.toContainText("40%");
  await expect(fix).toContainText("helps you keep more of it");
  await expect(fix).not.toContainText("15 to 20%");
  const muscle = await page.locator("main").innerText();
  expect(muscle).not.toContain("40%");
  expect(muscle).not.toContain("15 to 20%");

  await page.goto("/protein-calculator");
  const protein = await page.locator(".pc-edu").last().textContent();
  expect(protein).toContain("some of what you lose can be muscle");
  expect(protein).not.toContain("40%");
  expect(protein).not.toContain("15 to 20%");
});

test("body-fat photo step shows the estimate the endpoint returns", async ({ page }) => {
  const posted = [];
  await page.route("**/formspree.io/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "{}",
  }));
  const mailerlite = [];
  await page.route("**/assets.mailerlite.com/**", (route) => {
    mailerlite.push(route.request().url());
    return route.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/bf", async (route) => {
    posted.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          valid: true,
          body_fat_percent: 22.9,
          range_low: 18,
          range_high: 27,
          confidence: "low",
          note: "Rough visual estimate, not a measurement.",
          method: "photo",
        },
      }),
    });
  });
  await page.goto("/tdee-calculator");
  await page.locator("#bf-file").setInputFiles({
    name: "progress.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
  });
  await expect(page.locator("#bf-file-name")).toBeVisible();
  await expect(page.locator("#bf-photo-consent")).not.toBeChecked();
  await page.locator("#bf-photo-consent").check();
  await page.getByRole("button", { name: /Reveal my body-fat/ }).click();
  await expect(page.locator("#bf-gate")).toBeVisible();
  await page.locator("#bf-email").fill("test+preview@callumbcoaching.co.uk");
  await page.getByRole("button", { name: "Unlock my result" }).click();
  await expect(page.locator("#bf-pct")).toHaveText("22.9");
  await expect(page.locator("#bf-range")).toHaveText("18 to 27%");
  await expect(page.locator("#bf-note")).toContainText("Rough visual estimate, not a measurement.");
  await expect(page.locator("#bf-note")).toContainText("confidence: low");
  expect(posted).toHaveLength(1);
  expect(posted[0].email).toBe("test+preview@callumbcoaching.co.uk");
  expect(posted[0].sex).toBe("male");
  expect(posted[0].age).toBe(30);
  expect(posted[0].height_cm).toBe(178);
  expect(posted[0].weight_kg).toBe(85);
  expect(posted[0]["photo-consent"]).toBe("yes");
  expect(mailerlite).toEqual([]);
  expect(String(posted[0].image)).toMatch(/^data:image\/jpeg;base64,/);
  const text = await page.locator("#bodyfat").innerText();
  expect(text).not.toContain("\u2014");
  expect(text).not.toContain("\u2013");
  expect(text).not.toContain("3 to 4%");
});

test("body-fat photo waits for the OpenAI box", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/bf", async (route) => {
    calls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { valid: true, body_fat_percent: 20, range_low: 16, range_high: 24, note: "Rough visual estimate.", method: "photo" },
      }),
    });
  });
  await page.goto("/tdee-calculator#bodyfat");
  await page.locator("#bf-file").setInputFiles({
    name: "progress.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
  });
  await expect(page.locator("#bf-file-name")).toBeVisible();
  await expect(page.locator("#bf-photo-consent")).not.toBeChecked();
  await expect(page.locator("label.consent", { has: page.locator("#bf-photo-consent") })).toContainText(
    "I agree to my photo being sent to OpenAI to estimate my body fat. I do not keep it.",
  );
  await page.getByRole("button", { name: /Reveal my body-fat/ }).click();
  await expect(page.locator("#bf-photo-err")).toHaveText("Please tick this box so I can send your photo.");
  await expect(page.locator("#bf-gate")).toBeHidden();
  expect(calls).toBe(0);
});

test("book page has no Stripe checkout", async ({ page, request }) => {
  const res = await page.goto("/the-inches-you-keep");
  expect(res.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("The Inches You Keep");
  const notes = page.locator("p", { hasText: "The book isn't available right now." });
  await expect(notes).toHaveCount(2);
  await expect(notes.first()).toBeVisible();
  await expect(notes.first().locator('a[href="/coaching"]')).toBeVisible();
  await expect(notes.first().locator('a[href="/book"]')).toBeVisible();
  await expect(page.locator('a[href*="stripe.com"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: /get the book/i })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const liveSitemap = sitemap.replace(/<!--[\s\S]*?-->/g, "");
  expect(liveSitemap).not.toContain("the-inches-you-keep");
});

test("phone menu opens and navigates", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only");
  await page.goto("/coaching");
  await expect(page.locator(".nav__links")).toBeHidden();
  await page.locator(".burger").click();
  await expect(page.locator("#mnav")).toBeVisible();
  await expect(page.locator(".burger")).toHaveAttribute("aria-expanded", "true");
  await page.locator('#mnav a[href="/results"]').click();
  await expect(page).toHaveURL(/\/results/);
});

test("seasonal skin stays behind the switch", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?season=off");
  await expect(page.locator("html")).not.toHaveClass(/season-christmas/);
  await expect(page.locator(".season-snow, .season-lights, .season-hero")).toHaveCount(0);
  await page.goto("/?season=christmas");
  await expect(page.locator("html")).toHaveClass(/season-christmas/);
  await expect(page.locator(".season-lights")).toHaveCount(1);
  await expect(page.locator(".season-hero")).toHaveCount(1);
  await expect(page.locator(".season-snow")).toHaveCount(1);
  const heroImg = page.locator(".season-hero img");
  await expect(heroImg).toHaveJSProperty("complete", true);
  expect(await heroImg.evaluate((el) => el.naturalWidth)).toBeGreaterThan(0);
  const snow = page.locator(".season-snow");
  await expect(snow).toHaveAttribute("aria-hidden", "true");
  expect(await snow.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  expect(await page.locator(".season-lights").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  expect(await page.locator(".season-hero").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("seasonal motion stops when reduced motion is on", async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/?season=christmas");
  const bulb = page.locator(".season-lights i").first();
  await expect(bulb).toBeAttached();
  expect(await bulb.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await page.waitForTimeout(400);
  await expect(page.locator(".season-snow")).toHaveCount(0);
  await context.close();
});

test("a ticked TDEE opt-in is sent and the breakdown still opens", async ({ page }) => {
  const posted = await watchLead(page);
  await page.goto("/tdee-calculator");
  await page.locator("#user-bf").fill("25");
  await page.getByRole("button", { name: "See the full breakdown" }).click();
  await page.locator("#tdee-name").fill("Sam");
  await page.locator("#tdee-email").fill("sam@example.com");
  await page.locator('#tdee-gate-form input[name="marketing-consent"]').check();
  await page.getByRole("button", { name: "Show my breakdown" }).click();
  await expect(page.locator(".calc-gate .calc-detail")).toBeVisible();
  expect(posted).toHaveLength(1);
  expect(posted[0].body["marketing-consent"]).toBe("yes");
});

test("a ticked home guide opt-in is sent and the download still opens", async ({ page }) => {
  let body = null;
  await page.route("**/api/lead.php", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, download: "/guides/the-five-foundations.pdf" }),
    });
  });
  await page.goto("/#guide");
  await page.locator("#guide input[name=name]").fill("Test");
  await page.locator("#guide input[name=email]").fill("test@example.com");
  await page.locator('#guide input[name="marketing-consent"]').check();
  await page.locator("#guide button[type=submit]").click();
  await expect(page.locator("#guide .leadok")).toBeVisible();
  expect(body["marketing-consent"]).toBe("yes");
});

async function countMailerlite(page) {
  const hits = [];
  await page.route("**/formspree.io/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "{}",
  }));
  await page.route("**/assets.mailerlite.com/**", (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, body: "" });
  });
  return hits;
}

test("body-fat subscribes only when the box is ticked", async ({ page }) => {
  const hits = await countMailerlite(page);
  await page.goto("/tdee-calculator#bodyfat");
  await page.locator('#bf-mode button[data-mode="tape"]').click();
  await page.locator("#bf-neck").fill("38");
  await page.locator("#bf-waist").fill("92");
  await page.getByRole("button", { name: /Reveal my body-fat/ }).click();
  await page.locator("#bf-email").fill("sam@example.com");
  await page.locator("#bf-consent").check();
  await page.getByRole("button", { name: "Unlock my result" }).click();
  await expect(page.locator("#bf-pct")).not.toHaveText("…");
  expect(hits.some((url) => url.includes("194528840040580437"))).toBe(true);
});

test("TRT downloads stay available and MailerLite waits for the box", async ({ page }) => {
  const hits = await countMailerlite(page);
  await page.goto("/trt-starter/");
  await page.locator("#t-name").fill("Sam");
  await page.locator("#t-email").fill("sam@example.com");
  await page.getByRole("button", { name: /Send me the framework/ }).click();
  await expect(page.locator('a[href="/assets/downloads/trt-what-it-involves.pdf"]')).toBeVisible();
  await expect(page.locator("[data-inbox-copy]")).toBeHidden();
  expect(hits).toEqual([]);

  await page.reload();
  await page.locator("#t-name").fill("Sam");
  await page.locator("#t-email").fill("sam@example.com");
  await page.locator('form.form input[name="marketing-consent"]').check();
  await page.getByRole("button", { name: /Send me the framework/ }).click();
  await expect(page.locator('a[href="/assets/downloads/trt-monitoring-framework.pdf"]')).toBeVisible();
  await expect(page.locator("[data-inbox-copy]")).toBeVisible();
  expect(hits.some((url) => url.includes("194528838488687781"))).toBe(true);
});

test("the GLP-1 guide page downloads without subscribing until the box is ticked", async ({ page }) => {
  const hits = await countMailerlite(page);
  await page.goto("/guide/");
  await page.locator("#name").fill("Sam");
  await page.locator("#email").fill("sam@example.com");
  await page.getByRole("button", { name: /Send Me The Guide/ }).click();
  await expect(page.locator('a[href="5-signs-guide.pdf"]')).toBeVisible();
  await expect(page.locator("[data-inbox-copy]")).toBeHidden();
  expect(hits).toEqual([]);

  await page.reload();
  await page.locator("#name").fill("Sam");
  await page.locator("#email").fill("sam@example.com");
  await page.locator('#guide-form input[name="marketing-consent"]').check();
  await page.getByRole("button", { name: /Send Me The Guide/ }).click();
  await expect(page.locator('a[href="5-signs-guide.pdf"]')).toBeVisible();
  await expect(page.locator("[data-inbox-copy]")).toBeVisible();
  expect(hits.some((url) => url.includes("194528835534849468"))).toBe(true);
});

test("the GLP-1 nutrition form subscribes only when the box is ticked", async ({ page }) => {
  const hits = await countMailerlite(page);
  await page.goto("/glp1-nutrition");
  await page.locator("#g1-name").fill("Sam");
  await page.locator("#g1-email").fill("sam@example.com");
  await page.getByRole("button", { name: /Send Me the Guide/ }).click();
  await expect(page.locator('a[href="assets/downloads/CallumB-GLP1-5-Signs.pdf"]')).toBeVisible();
  await expect(page.locator("[data-inbox-copy]")).toBeHidden();
  expect(hits).toEqual([]);

  await page.reload();
  await page.locator("#g1-name").fill("Sam");
  await page.locator("#g1-email").fill("sam@example.com");
  await page.locator('form.form input[name="marketing-consent"]').check();
  await page.getByRole("button", { name: /Send Me the Guide/ }).click();
  await expect(page.locator('a[href="assets/downloads/CallumB-GLP1-5-Signs.pdf"]')).toBeVisible();
  await expect(page.locator("[data-inbox-copy]")).toBeVisible();
  expect(hits.length).toBe(1);
});

test("chat lead form sends the opt-in and still posts the note", async ({ page }) => {
  const posted = [];
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() === "POST") posted.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "That's with Callum." }),
    });
  });
  await page.goto("/");
  const banner = page.getByRole("dialog", { name: "Cookie consent" });
  if (await banner.isVisible()) {
    await banner.getByRole("button", { name: "Decline", exact: true }).click();
  }
  await page.waitForSelector(".cw-launch", { state: "visible" });
  await page.locator(".cw-launch").click();
  await page.locator(".cw-form").evaluate((form) => {
    form.hidden = false;
    form.classList.add("is-open");
  });
  const box = page.locator('.cw-form input[name="marketing-consent"]');
  await expect(box).not.toBeChecked();
  await page.locator('.cw-form input[name="name"]').fill("Sam");
  await page.locator('.cw-form input[name="email"]').fill("sam@example.com");
  await page.locator('.cw-form input[name="goal"]').fill("Lose fat");
  await page.locator(".cw-form button[type=submit]").click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0].lead["marketing-consent"]).toBe("no");

  await page.locator(".cw-form").evaluate((form) => {
    form.hidden = false;
    form.classList.add("is-open");
    const consent = form.querySelector("[name=marketing-consent]");
    consent.checked = true;
    form.querySelector("[name=name]").value = "Sam";
    form.querySelector("[name=email]").value = "sam@example.com";
    form.querySelector("[name=goal]").value = "Lose fat";
    form.requestSubmit();
  });
  await expect.poll(() => posted.length).toBe(2);
  expect(posted[1].lead["marketing-consent"]).toBe("yes");
});

test("offset calculator subscribes only when the box is ticked", async ({ page }) => {
  const hits = await countMailerlite(page);
  await page.goto("/offset-calculator");
  await page.locator("#breakfast").fill("5");
  await expect(page.locator("#mailCard")).toBeVisible();
  await expect(page.locator("#os-consent")).not.toBeChecked();
  await page.locator("#osEmail").fill("sam@example.com");
  await page.getByRole("button", { name: "Send my numbers" }).click();
  await expect(page.locator("#osNote")).toContainText("stay on this page");
  await expect(page.locator("#annualCost")).toBeVisible();
  expect(hits).toEqual([]);

  await page.reload();
  await page.locator("#breakfast").fill("5");
  await page.locator("#osEmail").fill("sam@example.com");
  await page.locator("#os-consent").check();
  await page.getByRole("button", { name: "Send my numbers" }).click();
  await expect(page.locator("#osNote")).toContainText("Check your inbox");
  expect(hits.some((url) => url.includes("194528841373321023"))).toBe(true);
});

test("framework download subscribes only when the box is ticked", async ({ page }) => {
  const hits = await countMailerlite(page);
  await page.goto("/free/framework");
  await expect(page.locator("#fw-consent")).not.toBeChecked();
  await page.locator('#gate-form input[name="name"]').fill("Sam");
  await page.locator('#gate-form input[name="email"]').fill("sam@example.com");
  await page.getByRole("button", { name: /Send it to me/ }).click();
  await expect(page.locator('a[href="/assets/downloads/CallumB-Framework-Guide.pdf"]')).toBeVisible();
  await expect(page.locator("#success [data-inbox-copy]")).toBeHidden();
  expect(hits).toEqual([]);

  await page.reload();
  await page.locator('#gate-form input[name="name"]').fill("Sam");
  await page.locator('#gate-form input[name="email"]').fill("sam@example.com");
  await page.locator("#fw-consent").check();
  await page.getByRole("button", { name: /Send it to me/ }).click();
  await expect(page.locator('a[href="/assets/downloads/CallumB-Framework-Guide.pdf"]')).toBeVisible();
  await expect(page.locator("#success [data-inbox-copy]")).toBeVisible();
  expect(hits.some((url) => url.includes("194528842662021026"))).toBe(true);
});
