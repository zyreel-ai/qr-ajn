import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 4173);

const headers = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-opener-policy": "same-origin-allow-popups"
};
const types = {
  ".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".svg":"image/svg+xml",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",".webp":"image/webp",".ico":"image/x-icon"
};

function sendFile(res, file, cache = false) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    ...headers,
    "content-type": types[ext] || "application/octet-stream",
    "cache-control": cache ? "public, max-age=300" : "no-store"
  });
  createReadStream(file).pipe(res);
}

const server = http.createServer((req,res)=>{
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const safe = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const candidate = path.join(PUBLIC, safe || "index.html");
    if (candidate.startsWith(PUBLIC) && existsSync(candidate) && statSync(candidate).isFile()) {
      return sendFile(res, candidate, !candidate.endsWith("index.html"));
    }
    return sendFile(res, path.join(PUBLIC, "index.html"), false);
  } catch {
    res.writeHead(500, {...headers, "content-type":"text/plain; charset=utf-8"});
    res.end("Internal server error");
  }
});
server.listen(PORT, "0.0.0.0", ()=>console.log(`QR AJN running on http://localhost:${PORT}`));
