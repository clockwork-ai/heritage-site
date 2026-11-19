import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const TRACKER = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|connect\.facebook\.net|facebook\.com\/tr|doubleclick\.net|googleadservices\.com/;

const freshPages = ["/", "/coaching", "/pricing", "/start", "/apply", "/privacy", "/terms-coaching"];
const choicePages = ["/", "/coaching", "/apply", "/privacy"];

function trackerUrls(urls) {
  return urls.filter((url) => TRACKER.test(url));
}

function watch(page) {
  const urls = [];
  page.on("request", (req) => urls.push(req.url()));
  return urls;
}

async function banner(page) {
  const dialog = page.getByRole("dialog", { name: "Cookie consent" });
  await expect(dialog).toBeVisible();
  const link = dialog.getByRole("link", { name: "Privacy policy" });
  await expect(link).toHaveAttribute("href", "/privacy");
  const decline = dialog.getByRole("button", { name: "Decline", exact: true });
  const accept = dialog.getByRole("button", { name: "Accept", exact: true });
  await expect(decline).toBeVisible();
  await expect(accept).toBeVisible();
  const declineBox = await decline.boundingBox();
  const acceptBox = await accept.boundingBox();
  expect(Math.abs(declineBox.width - acceptBox.width)).toBeLessThan(2);
  expect(Math.abs(declineBox.height - acceptBox.height)).toBeLessThan(2);
  const declineStyle = await decline.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.backgroundColor + " " + s.color + " " + s.borderTopColor;
  });
  const acceptStyle = await accept.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.backgroundColor + " " + s.color + " " + s.borderTopColor;
  });
  expect(declineStyle).toBe(acceptStyle);
  expect(declineStyle).toBe("rgb(201, 169, 110) rgb(11, 26, 19) rgb(201, 169, 110)");
  return dialog;
}

test("every public page includes the one consent script", () => {
  const root = process.cwd();
  const html = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (["node_modules", "public", "tools", "playwright-report", "test-results", "cpanel", "deploy"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) html.push(full);
    }
  };
  walk(root);
  expect(html.length).toBeGreaterThan(20);
  for (const file of html) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    expect(text.split('src="/assets/js/consent.js?v=2"').length - 1, rel).toBe(1);
    expect(text, rel).not.toContain("privacy.html");
    expect(text, rel).not.toContain("\u2014");
    expect(text, rel).not.toContain("\u2013");
  }
  const consent = fs.readFileSync(path.join(root, "assets/js/consent.js"), "utf8");
  expect(consent).toContain('PIXEL_ID = "1778009826073109"');
  expect(consent).toContain('GA_ID = "G-092ML2YGQ2"');
  expect(consent).toContain('href = "/privacy"');
  expect(consent).toContain("60 * 60 * 24 * 180");
  expect(consent).not.toContain("\u2014");
  expect(consent).not.toContain("\u2013");
  const main = fs.readFileSync(path.join(root, "assets/js/main.js"), "utf8");
  expect(main).not.toContain("fbevents");
  expect(main).not.toContain("googletagmanager");
  expect(main).not.toContain("cb-consent");
  expect(main).not.toContain("privacy.html");
});

for (const pagePath of freshPages) {
  test(`fresh visit ${pagePath} shows the banner and loads no GA4 or Meta tag`, async ({ page }) => {
    const urls = watch(page);
    await page.goto(pagePath, { waitUntil: "domcontentloaded" });
    await banner(page);
    await expect(page.locator('script[src*="plausible.io/js/"]')).toHaveCount(1);
    await expect(page.locator('script[src*="googletagmanager.com"], script[src*="fbevents.js"]')).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(trackerUrls(urls), trackerUrls(urls).join("\n")).toEqual([]);
    expect(urls.some((url) => url.includes("plausible.io/js/"))).toBe(true);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(1);
  });
}

for (const pagePath of choicePages) {
  test(`accept on ${pagePath} loads GA4 and the Meta Pixel`, async ({ page }) => {
    const urls = watch(page);
    await page.goto(pagePath, { waitUntil: "domcontentloaded" });
    const dialog = await banner(page);
    expect(trackerUrls(urls)).toEqual([]);
    const ga = page.waitForRequest((req) => req.url().includes("googletagmanager.com/gtag/js") && req.url().includes("G-092ML2YGQ2"));
    const pixel = page.waitForRequest((req) => req.url().includes("connect.facebook.net/") && req.url().includes("fbevents.js"));
    await dialog.getByRole("button", { name: "Accept", exact: true }).click();
    const gaReq = await ga;
    const pixelReq = await pixel;
    expect(gaReq.url()).toContain("id=G-092ML2YGQ2");
    expect(pixelReq.url()).toContain("fbevents.js");
    await expect(dialog).toBeHidden();
    await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(1);
    await expect(page.locator('script[src*="fbevents.js"]')).toHaveCount(1);
    expect(await page.evaluate(() => document.cookie)).toContain("cb-consent=granted");
    const again = page.waitForRequest((req) => req.url().includes("googletagmanager.com/gtag/js") && req.url().includes("G-092ML2YGQ2"));
    const pixelAgain = page.waitForRequest((req) => req.url().includes("fbevents.js"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await again;
    await pixelAgain;
    await expect(page.getByRole("dialog", { name: "Cookie consent" })).toHaveCount(0);
  });

  test(`decline on ${pagePath} keeps GA4 and the Meta Pixel off`, async ({ page }) => {
    const urls = watch(page);
    await page.goto(pagePath, { waitUntil: "domcontentloaded" });
    const dialog = await banner(page);
    await dialog.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.waitForTimeout(800);
    expect(trackerUrls(urls), trackerUrls(urls).join("\n")).toEqual([]);
    await expect(page.locator('script[src*="googletagmanager.com"], script[src*="fbevents.js"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.cookie)).toContain("cb-consent=denied");
    expect(await page.evaluate(() => localStorage.getItem("cb-consent"))).toBeNull();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    expect(trackerUrls(urls), trackerUrls(urls).join("\n")).toEqual([]);
    await expect(page.getByRole("dialog", { name: "Cookie consent" })).toHaveCount(0);
    await expect(page.locator('script[src*="googletagmanager.com"], script[src*="fbevents.js"]')).toHaveCount(0);
  });
}

test("an earlier Decline saved in local storage stays off and moves into the cookie", async ({ page }) => {
  const urls = watch(page);
  await page.addInitScript(() => localStorage.setItem("cb-consent", "denied"));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await expect(page.getByRole("dialog", { name: "Cookie consent" })).toHaveCount(0);
  expect(trackerUrls(urls)).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).toContain("cb-consent=denied");
  expect(await page.evaluate(() => localStorage.getItem("cb-consent"))).toBeNull();
});

test("privacy cookie section names Plausible, GA4 and the Meta Pixel", async ({ page }) => {
  await page.goto("/privacy");
  const copy = await page.locator("main").innerText();
  expect(copy).toContain("On a first visit, a banner offers Accept and Decline. Your choice is stored for 180 days in an essential cookie named cb-consent. That cookie only remembers Accept or Decline. Use the Cookie settings link at the bottom of any page to change your choice.");
  expect(copy).toContain("Plausible");
  expect(copy).toContain("G-092ML2YGQ2");
  expect(copy).toContain("1778009826073109");
  expect(copy).toContain("Google Analytics then sets cookies on this site named _ga and _ga_092ML2YGQ2, each for about two years. The Pixel sends the visit to Meta. It may also set a first-party cookie on this site named _fbp, usually for 90 days.");
  expect(copy).toContain("If you open the booking calendar, Cal.com may set its own cookies on cal.com to run the booking form.");
  expect(copy).not.toContain("tucked behind");
  expect(copy).not.toContain("privacy.html");
  expect(copy).not.toContain("\u2014");
  expect(copy).not.toContain("\u2013");
});

for (const pagePath of ["/", "/coaching", "/start", "/links", "/privacy", "/supplements/"]) {
  test(`cookie settings on ${pagePath} reopens the banner`, async ({ page }) => {
    await page.goto(pagePath, { waitUntil: "domcontentloaded" });
    const settings = page.locator("footer [data-cookie-settings]");
    await settings.scrollIntoViewIfNeeded();
    await expect(settings).toHaveText("Cookie settings");
    const colour = await settings.evaluate((el) => getComputedStyle(el).color);
    expect(colour).toBe("rgb(201, 169, 110)");
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Cookie consent" })).toHaveCount(0);
    await settings.click();
    const dialog = page.getByRole("dialog", { name: "Cookie consent" });
    await expect(dialog).toBeVisible();
    const card = dialog.locator(":scope > div");
    expect(await card.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(11, 26, 19)");
  });
}

test("switching from Accept to Decline clears Google cookies and stops the tags", async ({ page }) => {
  const urls = watch(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const ga = page.waitForRequest((req) => req.url().includes("googletagmanager.com/gtag/js"));
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await ga;
  await expect.poll(async () => page.evaluate(() => document.cookie)).toContain("_ga=");
  await page.locator("footer [data-cookie-settings]").click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await expect.poll(async () => page.evaluate(() => document.cookie), { timeout: 2000 }).not.toContain("_ga");
  expect(await page.evaluate(() => document.cookie)).toContain("cb-consent=denied");
  expect(await page.evaluate(() => document.cookie)).not.toContain("_fbp");
  const beforeReload = urls.length;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const afterReload = urls.slice(beforeReload);
  expect(trackerUrls(afterReload), trackerUrls(afterReload).join("\n")).toEqual([]);
  await expect(page.locator('script[src*="googletagmanager.com"], script[src*="fbevents.js"]')).toHaveCount(0);
});
