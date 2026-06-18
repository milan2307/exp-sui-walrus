import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const artifactsDir = join(repoRoot, "artifacts", "local-sui");
const logPath = join(artifactsDir, "sui-local.log");
const pidPath = join(artifactsDir, "sui-local.pid");
const suiCli = join(
  dirname(repoRoot),
  "MilanGPT-OS",
  ".tools",
  "sui",
  "sui.exe"
);

mkdirSync(artifactsDir, { recursive: true });

if (existsSync(pidPath)) {
  console.log(`Local Sui PID file already exists: ${pidPath}`);
  console.log("If the process is stale, remove the PID file and rerun this command.");
  process.exit(0);
}

const out = await import("node:fs").then(({ openSync }) => openSync(logPath, "a"));
const child = spawn(
  suiCli,
  ["start", "--force-regenesis", "--with-faucet", "--fullnode-rpc-port", "9000"],
  {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", out, out],
    windowsHide: true,
  }
);

child.unref();
writeFileSync(pidPath, `${child.pid}\n`);

console.log("Started local Sui network");
console.log(`pid=${child.pid}`);
console.log(`rpc=http://127.0.0.1:9000`);
console.log(`log=${logPath}`);
