import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const root = join(dirname(dirname(fileURLToPath(import.meta.url))), "web", "verify");
const port = 4174;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
};

const server = createServer((req, res) => {
  const rel = new URL(req.url, `http://localhost`).pathname;
  const file = normalize(join(root, rel === "/" ? "index.html" : rel.slice(1)));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  res.writeHead(200, { "content-type": mime[extname(file)] ?? "text/html; charset=utf-8" });
  createReadStream(file).on("error", () => {
    res.writeHead(404); res.end("Not found");
  }).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`TradeProof Verify: ${url}`);
  exec(`start ${url}`);
});
