import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", title: /Online Personal Trainer/, h1: /started/i },
  { path: "/about", title: /About/, h1: /addictive personality/i },
  { path: "/coaching", title: /Coaching/, h1: /Someone reading your numbers/i },
  { path: "/results", title: /Results/, h1: /Men with jobs, kids/i },
  { path: "/apply", title: /Apply/, h1: /where you're at/i },
  { path: "/terms-coaching", title: /Terms/, h1: /The terms/i },
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
      const ours = ["/", "/about", "/coaching", "/results", "/apply", "/terms-coaching"];
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
  await page.route("**/formspree.io/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "{}",
  }));
  await page.goto("/apply");
  await page.fill("#f-name", "Dave");
  await page.fill("#f-age", "42");
  await page.fill("#f-contact", "dave@example.com");
  await page.getByText("Lose fat", { exact: true }).click();
  await page.fill("#f-tried", "Fall off by week three.");
  await page.getByText("12 months", { exact: true }).click();
  await page.getByRole("button", { name: /send my application/i }).click();
  await expect(page.locator("#applyDone")).toBeVisible();
  await expect(page.locator("#applyText")).toContainText("Name: Dave");
  await expect(page.locator("#applyText")).toContainText("Plan: 12 months");
  const href = await page.locator("#applySend").getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/447359838866\?text=/);
  expect(decodeURIComponent(href)).toContain("Fall off by week three.");
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
  await page.route("**/api/lead.php", async (route) => {
    posted = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, download: "/guides/the-five-foundations.pdf" }),
    });
  });
  await page.goto("/#guide");
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
  const text = await page.locator("main").innerText();
  const folded = text.toLowerCase();
  const order = [
    "get the five foundations",
    "apply for 1:1 coaching",
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
  await expect(page.locator('a[data-ev="Apply click"]')).toHaveAttribute(
    "href",
    "/apply?utm_source=instagram&utm_medium=bio",
  );
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
  const js = await (await request.get("/assets/js/calc-gate.js?v=1")).text();
  const rule = "/(^|\\.)callumbcoaching\\.co\\.uk$/";
  expect(js).toContain(rule);
  expect(js).toContain("https://callumb-coaching.vercel.app/api/lead.php");
  expect(js).toContain('"/api/lead.php"');
  expect(js).not.toContain("formspree");
  expect(js).not.toContain("\u2014");
  expect(js).not.toContain("\u2013");
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
