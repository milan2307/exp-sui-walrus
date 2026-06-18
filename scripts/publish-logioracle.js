import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageDir = join(repoRoot, "logioracle");
const localSuiDir = join(repoRoot, "artifacts", "local-sui");
const localPubfilePath = join(localSuiDir, "Pub.local.toml");
const suiCli = join(
  dirname(repoRoot),
  "MilanGPT-OS",
  ".tools",
  "sui",
  "sui.exe"
);

const argv = process.argv.slice(2);
const execute = argv.includes("--execute");
const printOnly = argv.includes("--print");
const gasBudgetIndex = argv.indexOf("--gas-budget");
const gasBudget = gasBudgetIndex === -1 ? "100000000" : argv[gasBudgetIndex + 1];
const envIndex = argv.indexOf("--env");
const clientEnv = envIndex === -1 ? undefined : argv[envIndex + 1];
const pubfilePathIndex = argv.indexOf("--pubfile-path");
const pubfilePath =
  pubfilePathIndex === -1 ? localPubfilePath : argv[pubfilePathIndex + 1];
const usesEphemeralPublish = clientEnv === "local" || clientEnv === "devnet";

function quoteForPowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const publishArgs = ["client"];

if (clientEnv) {
  publishArgs.push("--client.env", clientEnv);
}

if (usesEphemeralPublish) {
  mkdirSync(localSuiDir, { recursive: true });
}

publishArgs.push(
  usesEphemeralPublish ? "test-publish" : "publish",
  packageDir,
  "--gas-budget",
  gasBudget,
  "--json"
);

if (usesEphemeralPublish) {
  publishArgs.push("--build-env", "testnet", "--pubfile-path", pubfilePath);
}

if (!execute) {
  publishArgs.push("--dry-run");
}

const commandText = [suiCli, ...publishArgs]
  .map((part) => quoteForPowerShell(part))
  .join(" ");

console.log("Prepared LogiOracle package publish");
console.log(`mode=${execute ? "execute" : "dry-run"}`);
if (clientEnv) {
  console.log(`env=${clientEnv}`);
}
console.log(commandText);

if (printOnly) {
  process.exit(0);
}

const result = spawnSync(suiCli, publishArgs, {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
