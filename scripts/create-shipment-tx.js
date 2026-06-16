import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(repoRoot, "artifacts", "tradeproof", "manifest.json");
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
    } else if (arg === "--recipient") {
      parsed.recipient = argv[++index];
    } else if (arg === "--origin") {
      parsed.origin = argv[++index];
    } else if (arg === "--destination") {
      parsed.destination = argv[++index];
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
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function quoteForPowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

if (!existsSync(manifestPath)) {
  throw new Error("Missing artifacts/tradeproof/manifest.json. Run npm run demo:evidence first.");
}

const args = parseArgs(process.argv.slice(2));
if (!args.packageId) {
  throw new Error("Missing --package <published-package-id>.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const recipient = args.recipient ?? process.env.SUI_RECIPIENT;
if (!recipient) {
  throw new Error("Missing --recipient <sui-address> or SUI_RECIPIENT in .env.");
}

const origin = args.origin ?? "Nairobi";
const destination = args.destination ?? "Mombasa";
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
  "create_and_transfer",
  "--args",
  manifest.shipment_id,
  manifest.proof_type,
  origin,
  destination,
  manifest.walrus_blob_id,
  manifest.evidence_hash,
  recipient,
  "--gas-budget",
  gasBudget,
);

if (args.dryRun) {
  callArgs.push("--dry-run");
}

const commandText = [suiCli, ...callArgs]
  .map((part) => quoteForPowerShell(part))
  .join(" ");

console.log("Prepared Sui shipment proof transaction");
console.log(`package=${args.packageId}`);
console.log(`recipient=${recipient}`);
if (args.clientEnv) {
  console.log(`env=${args.clientEnv}`);
}
console.log(`walrus_blob_id=${manifest.walrus_blob_id}`);
console.log(`evidence_hash=${manifest.evidence_hash}`);
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
