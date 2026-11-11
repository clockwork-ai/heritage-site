import { applySeasonalOg, inSeason } from "./seasonal/og-share.mjs";

export const config = {
  matcher: ["/((?!api/|seasonal/|assets/|brand_assets/|guides/|chat/).*)"],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  // The inner fetch carries this so it is not rewritten again.
  if (url.searchParams.has("_static")) return;
  if (url.pathname.includes(".")) return;
  if (!inSeason()) return;

  url.searchParams.set("_static", "1");
  const response = await fetch(url, { headers: request.headers, redirect: "manual" });
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  const html = await response.text();
  const next = applySeasonalOg(html);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(next, { status: response.status, headers });
}
