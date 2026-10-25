// Static server for the heritage site. node serve.mjs  ->  http://localhost:3000
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve("."); const PORT = 3000;
const T = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".json":"application/json",".pdf":"application/pdf"};
http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/guides/five-numbers.pdf") {
    res.writeHead(301, { Location: "/guides/the-five-foundations.pdf" });
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
