// Static server for the heritage site. node serve.mjs  ->  http://localhost:3000
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve("."); const PORT = 3000;
const T = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".webp":"image/webp",".avif":"image/avif",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".json":"application/json",".pdf":"application/pdf",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};
http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/guides/five-numbers.pdf") {
    res.writeHead(301, { Location: "/guides/the-five-foundations.pdf" });
    res.end();
    return;
  }
  const gone = {
    "/pricing": "/rebuild",
    "/pricing/": "/rebuild",
    "/start": "/rebuild",
    "/start/": "/rebuild",
    "/os-setup": "/rebuild",
    "/os-setup/": "/rebuild",
    "/the-ninety": "/rebuild",
    "/the-ninety/": "/rebuild",
    "/muscle": "/rebuild",
    "/muscle/": "/rebuild",
    "/magnum-opus": "/rebuild",
    "/magnum-opus/": "/rebuild",
    "/physique-os": "/rebuild",
    "/physique-os/": "/rebuild",
    "/head-start": "/rebuild",
    "/head-start/": "/rebuild",
    "/headstart": "/rebuild",
    "/headstart/": "/rebuild",
    "/the-head-start": "/rebuild",
    "/the-head-start/": "/rebuild",
    "/new-year-head-start": "/rebuild",
    "/new-year-head-start/": "/rebuild",
    "/head-start-challenge": "/rebuild",
    "/head-start-challenge/": "/rebuild",
    "/8-week": "/rebuild",
    "/8-week/": "/rebuild",
    "/8-week-challenge": "/rebuild",
    "/8-week-challenge/": "/rebuild",
    "/8-week-guarantee": "/rebuild",
    "/8-week-guarantee/": "/rebuild",
    "/eight-week": "/rebuild",
    "/eight-week/": "/rebuild",
    "/eight-week-challenge": "/rebuild",
    "/eight-week-challenge/": "/rebuild",
    "/challenge": "/rebuild",
    "/challenge/": "/rebuild",
    "/the-standard": "/rebuild",
    "/the-standard/": "/rebuild",
    "/standard": "/rebuild",
    "/standard/": "/rebuild",
    "/the-90": "/rebuild",
    "/the-90/": "/rebuild",
    "/the90": "/rebuild",
    "/the90/": "/rebuild",
    "/ninety": "/rebuild",
    "/ninety/": "/rebuild",
    "/90-day": "/rebuild",
    "/90-day/": "/rebuild",
    "/foundation": "/rebuild",
    "/foundation/": "/rebuild",
    "/transformation": "/rebuild",
    "/transformation/": "/rebuild",
    "/structured": "/rebuild",
    "/structured/": "/rebuild",
    "/physique": "/rebuild",
    "/physique/": "/rebuild",
    "/physiqueos": "/rebuild",
    "/physiqueos/": "/rebuild",
    "/magnum": "/rebuild",
    "/magnum/": "/rebuild",
    "/opus": "/rebuild",
    "/opus/": "/rebuild"
  };
  if (gone[u]) {
    const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    res.writeHead(301, { Location: gone[u] + q });
    res.end();
    return;
  }
  if (u === "/api/chat" && req.method === "GET") {
    res.writeHead(200, {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
    res.end("{}");
    return;
  }
  let f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) return res.writeHead(403).end();
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  if (!fs.existsSync(f)) return res.writeHead(404).end("not found");
  res.writeHead(200, {"Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control":"no-store"});
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log("http://localhost:" + PORT));
