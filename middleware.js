import { next, rewrite } from "@vercel/functions";
import { inSeason, pageFile } from "./seasonal/og-share.mjs";

export const config = {
  matcher: ["/((?!api/|seasonal/|assets/|brand_assets/|guides/|chat/|tools/).*)"],
};

export default function middleware(request) {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") return next();
  if (url.pathname.includes(".")) return next();
  if (!inSeason() || !pageFile(url.pathname)) return next();

  const dest = new URL(request.url);
  dest.pathname = "/api/season-html";
  dest.search = "";
  dest.searchParams.set("path", url.pathname);
  return rewrite(dest);
}
