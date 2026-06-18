import "dotenv/config";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const suiCli = join(
  dirname(repoRoot),
  "MilanGPT-OS",
  ".tools",
  "sui",
  "sui.exe"
);

function parseArgs(argv) {
  const parsed = {
    dryRun: true,
    execute: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--package") {
      parsed.packageId = argv[++index];
    } else if (arg === "--object") {
      parsed.objectId = argv[++index];
    } else if (arg === "--status") {
      parsed.status = argv[++index];
    } else if (arg === "--gas-budget") {
      parsed.gasBudget = argv[++index];
    } else if (arg === "--env") {
      parsed.clientEnv = argv[++index];
    } else if (arg === "--execute") {
      parsed.execute = true;
      parsed.dryRun = false;
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
      parsed.execute = false;
    } else if (arg === "--print") {
      parsed.printOnly = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function quoteForPowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const args = parseArgs(process.argv.slice(2));
if (!args.packageId) {
  throw new Error("Missing --package <published-package-id>.");
}
if (!args.objectId) {
  throw new Error("Missing --object <shipment-object-id>.");
}
if (!args.status) {
  throw new Error("Missing --status <new-status>.");
}

const gasBudget = args.gasBudget ?? "100000000";
const callArgs = ["client"];

if (args.clientEnv) {
  callArgs.push("--client.env", args.clientEnv);
}

callArgs.push(
  "call",
  "--package",
  args.packageId,
  "--module",
  "shipment",
  "--function",
  "update_status",
  "--args",
  args.objectId,
  args.status,
  "--gas-budget",
  gasBudget
);

if (args.dryRun) {
  callArgs.push("--dry-run");
}

if (args.json) {
  callArgs.push("--json");
}

const commandText = [suiCli, ...callArgs]
  .map((part) => quoteForPowerShell(part))
  .join(" ");

console.log("Prepared Sui shipment status update");
console.log(`package=${args.packageId}`);
console.log(`object=${args.objectId}`);
if (args.clientEnv) {
  console.log(`env=${args.clientEnv}`);
}
console.log(`status=${args.status}`);
console.log(commandText);

if (args.printOnly) {
  process.exit(0);
}

const result = spawnSync(suiCli, callArgs, {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
