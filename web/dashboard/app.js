const output = document.querySelector("#output");
const runState = document.querySelector("#runState");
const lastCommand = document.querySelector("#lastCommand");
const buttons = [...document.querySelectorAll("[data-command]")];

const fields = {
  blobId: document.querySelector("#blobId"),
  createTx: document.querySelector("#createTx"),
  evidenceHash: document.querySelector("#evidenceHash"),
  objectId: document.querySelector("#objectId"),
  packageId: document.querySelector("#packageId"),
  shipmentId: document.querySelector("#shipmentId"),
  shipmentStatus: document.querySelector("#shipmentStatus"),
  statusTx: document.querySelector("#statusTx"),
};

function valueOrDash(value) {
  return value || "-";
}

function setRunning(isRunning) {
  runState.textContent = isRunning ? "Running" : "Idle";
  buttons.forEach((button) => {
    button.disabled = isRunning;
  });
}

function renderState(state) {
  const manifest = state.manifest ?? {};
  const demo = state.demoSummary ?? {};
  const evidence = state.evidence ?? {};

  fields.shipmentId.textContent = valueOrDash(manifest.shipment_id ?? evidence.shipment_id);
  fields.shipmentStatus.textContent = valueOrDash(demo.final_status ?? evidence.status);
  fields.blobId.textContent = valueOrDash(manifest.walrus_blob_id);
  fields.evidenceHash.textContent = valueOrDash(manifest.evidence_hash);
  fields.packageId.textContent = valueOrDash(demo.package);
  fields.objectId.textContent = valueOrDash(demo.shipment_object);
  fields.createTx.textContent = valueOrDash(demo.create_tx);
  fields.statusTx.textContent = valueOrDash(demo.status_tx);
}

async function refresh() {
  const response = await fetch("/api/state");
  if (!response.ok) throw new Error(`State request failed: ${response.status}`);
  renderState(await response.json());
}

async function run(command) {
  setRunning(true);
  lastCommand.textContent = command;
  output.textContent = `Running ${command}...\n`;

  try {
    const response = await fetch(`/api/run/${command}`, { method: "POST" });
    const result = await response.json();
    renderState(result.state ?? {});
    output.textContent = [result.stdout ?? "", result.stderr ? `\n[stderr]\n${result.stderr}` : ""]
      .join("")
      .trim() || JSON.stringify(result, null, 2);
    runState.textContent = response.ok && result.ok ? "Passed" : "Failed";
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : String(error);
    runState.textContent = "Failed";
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

buttons.forEach((button) => {
  button.addEventListener("click", () => run(button.dataset.command));
});

document.querySelector("#refresh").addEventListener("click", async () => {
  setRunning(true);
  try {
    await refresh();
    runState.textContent = "Idle";
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : String(error);
    runState.textContent = "Failed";
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
});

await refresh();
