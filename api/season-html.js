import { readFile } from "node:fs/promises";
import path from "node:path";
import { applySeasonalOg, pageFile } from "../seasonal/og-share.mjs";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const file = pageFile(url.searchParams.get("path") || "/");
  if (!file) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const html = await readFile(path.join(process.cwd(), file), "utf8");
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=0, must-revalidate");
  res.end(applySeasonalOg(html));
}
