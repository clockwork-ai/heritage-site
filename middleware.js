import { applySeasonalOg, inSeason } from "./seasonal/og-share.mjs";

export const config = {
  matcher: ["/((?!api/|seasonal/|assets/|brand_assets/|guides/|chat/).*)"],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname.includes(".")) return;
  if (!inSeason()) return;

  const response = await fetch(request);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  const html = await response.text();
  const next = applySeasonalOg(html);
  if (next === html) return new Response(html, response);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(next, { status: response.status, headers });
}
