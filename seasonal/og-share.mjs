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
