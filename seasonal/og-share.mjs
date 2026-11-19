/* Share-card switch. Same London window as seasonal/config.js.
   Crawlers do not run the page script, so the HTML tags are rewritten
   on the server while the window is open. */

export const OG_FROM = "https://callumbcoaching.co.uk/og-image.jpg";
export const OG_TO = "https://callumbcoaching.co.uk/og-christmas-2026.jpg";
export const WINDOW_START = "2026-11-11";
export const WINDOW_END = "2027-01-06";

export function londonDate(now) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  let year = "";
  let month = "";
  let day = "";
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") day = part.value;
  }
  return `${year}-${month}-${day}`;
}

export function inSeason(now = new Date()) {
  const today = londonDate(now);
  return today >= WINDOW_START && today <= WINDOW_END;
}

const PAGES = new Map([
  ["/", "index.html"],
  ["/about", "about.html"],
  ["/apply", "apply.html"],
  ["/book", "book.html"],
  ["/coaching", "coaching.html"],
  ["/free/framework", "free/framework.html"],
  ["/glp1-blueprint", "glp1-blueprint.html"],
  ["/glp1-nutrition", "glp1-nutrition.html"],
  ["/guide", "guide/index.html"],
  ["/is-online-personal-training-worth-it", "is-online-personal-training-worth-it.html"],
  ["/links", "links/index.html"],
  ["/magnum-opus", "magnum-opus/index.html"],
  ["/muscle", "muscle/index.html"],
  ["/nutrition", "nutrition.html"],
  ["/offset-calculator", "offset-calculator.html"],
  ["/online-personal-trainer-cost", "online-personal-trainer-cost.html"],
  ["/online-personal-trainer-stockport", "online-personal-trainer-stockport.html"],
  ["/online-vs-in-person-personal-trainer", "online-vs-in-person-personal-trainer.html"],
  ["/os-setup", "os-setup/index.html"],
  ["/pricing", "pricing/index.html"],
  ["/privacy", "privacy.html"],
  ["/protein-calculator", "protein-calculator.html"],
  ["/rebuild", "rebuild.html"],
  ["/results", "results.html"],
  ["/start", "start/index.html"],
  ["/supplements", "supplements/index.html"],
  ["/tdee-calculator", "tdee-calculator.html"],
  ["/terms", "terms.html"],
  ["/terms-coaching", "terms-coaching.html"],
  ["/the-inches-you-keep", "the-inches-you-keep/index.html"],
  ["/the-ninety", "the-ninety/index.html"],
  ["/trt-starter", "trt-starter/index.html"],
]);

export function pageFile(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return PAGES.get(clean) || "";
}

export function applySeasonalOg(html) {
  if (!html.includes(OG_FROM)) return html;
  let out = html.split(OG_FROM).join(OG_TO);
  if (!out.includes("og:image:width")) {
    out = out.replace(
      /(<meta\s+property=["']og:image["'][^>]*>)/i,
      '$1\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">',
    );
  }
  return out;
}
