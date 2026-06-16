import { spawn } from "node:child_process";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const webRoot = join(repoRoot, "web", "dashboard");
const tradeproofDir = join(repoRoot, "artifacts", "tradeproof");
const port = Number(process.env.TRADEPROOF_DASHBOARD_PORT ?? 4173);

const commands = {
  evidence: ["scripts/create-tradeproof-evidence.js"],
  localDemo: ["scripts/run-local-demo.js"],
  moveTest: ["scripts/verify-logioracle.js"],
  walrusRead: ["scripts/walrus-http-read.js"],
  walrusUpload: ["scripts/walrus-http-upload.js"],
  walrusVerify: ["scripts/walrus-http-verify.js"],
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

function readJsonArtifact(name) {
  const path = join(tradeproofDir, name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function readTextArtifact(name) {
  const path = join(tradeproofDir, name);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function statePayload() {
  return {
    demoSummary: readJsonArtifact("demo-summary.json"),
    eventsProof: readJsonArtifact("events-proof.json"),
    evidence: readJsonArtifact("evidence.json"),
    manifest: readJsonArtifact("manifest.json"),
    walrusHttpReceipt: readJsonArtifact("walrus-http-receipt.json"),
    walrusHttpVerification: readJsonArtifact("walrus-http-verification.json"),
    walrusReadback: readTextArtifact("walrus-readback.json"),
  };
}

function runCommand(name, response) {
  const args = commands[name];
  if (!args) {
    sendJson(response, 404, { error: `Unknown command: ${name}` });
    return;
  }

  const startedAt = new Date().toISOString();
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env: process.env,
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("error", (error) => {
    sendJson(response, 500, {
      command: name,
      error: error.message,
      startedAt,
      state: statePayload(),
    });
  });

  child.on("close", (code) => {
    sendJson(response, code === 0 ? 200 : 500, {
      command: name,
      code,
      ok: code === 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout,
      stderr,
      state: statePayload(),
    });
  });
}

function serveStatic(request, response) {
  const rawPath = new URL(request.url, `http://${request.headers.host}`).pathname;
  const relativePath = rawPath === "/" ? "index.html" : rawPath.slice(1);
  const filePath = normalize(join(webRoot, relativePath));

  if (!filePath.startsWith(webRoot) || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/api/state") {
    sendJson(response, 200, statePayload());
    return;
  }

  if (request.method === "POST" && request.url?.startsWith("/api/run/")) {
    runCommand(request.url.split("/").pop(), response);
    return;
  }

  if (request.method === "GET") {
    serveStatic(request, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`TradeProof dashboard: http://127.0.0.1:${port}`);
});
