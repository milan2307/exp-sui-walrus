/**
 * wallet.js — TradeProof wallet connection layer
 *
 * Supports:
 *  - Sui Wallet browser extension (window.suiWallet)
 *  - Any wallet implementing the Wallet Standard (@mysten/wallet-standard)
 *
 * No build step. Import as ES module from any TradeProof page.
 *
 * Usage:
 *   import { wallet } from '/wallet.js';
 *   await wallet.connect();           // opens wallet picker / connects
 *   wallet.address                    // '0x...' or null
 *   wallet.on('connected', fn)        // emits { address }
 *   wallet.on('disconnected', fn)
 *   await wallet.signAndExecute(tx)   // executes a Transaction
 */

const TESTNET_RPC = 'https://fullnode.testnet.sui.io:443';

// ── Event emitter ────────────────────────────────────────────────────────────

class Emitter {
  #handlers = {};
  on(event, fn)  { (this.#handlers[event] ??= []).push(fn); return this; }
  off(event, fn) { this.#handlers[event] = (this.#handlers[event] ?? []).filter(h => h !== fn); }
  emit(event, data) { (this.#handlers[event] ?? []).forEach(fn => fn(data)); }
}

// ── Wallet ────────────────────────────────────────────────────────────────────

class TradeProofWallet extends Emitter {
  address    = null;
  #provider  = null;   // the underlying wallet object
  #providerName = null;

  get connected() { return !!this.address; }
  get name()      { return this.#providerName; }

  /** Returns a list of available wallet providers. */
  detect() {
    const found = [];

    // Wallet Standard (newer, preferred)
    if (typeof window !== 'undefined' && window.__wallet_standard__) {
      try {
        const registry = window.__wallet_standard__.wallets;
        for (const w of registry.get()) {
          if (w.features?.['sui:signAndExecuteTransactionBlock'] ||
              w.features?.['sui:signAndExecuteTransaction']) {
            found.push({ name: w.name, icon: w.icon, provider: w, type: 'standard' });
          }
        }
      } catch {}
    }

    // Legacy Sui Wallet extension
    if (typeof window !== 'undefined' && window.suiWallet) {
      if (!found.some(w => w.name === 'Sui Wallet')) {
        found.push({ name: 'Sui Wallet', icon: null, provider: window.suiWallet, type: 'legacy' });
      }
    }

    return found;
  }

  /** Connect to a specific provider, or auto-select if only one available. */
  async connect(providerEntry) {
    const wallets = this.detect();
    if (!wallets.length) throw new Error('NO_WALLET');

    const entry = providerEntry ?? wallets[0];
    const { provider, type } = entry;

    try {
      if (type === 'standard') {
        await provider.features['standard:connect'].connect({ silent: false });
        const accs = provider.accounts;
        if (!accs?.length) throw new Error('No accounts returned');
        this.address = accs[0].address;
      } else {
        // Legacy suiWallet API
        await provider.requestPermissions({ permissions: ['viewAccount'] });
        const accs = await provider.getAccounts();
        if (!accs?.length) throw new Error('No accounts returned');
        this.address = accs[0].address;
      }
      this.#provider     = provider;
      this.#providerName = entry.name;
      this.emit('connected', { address: this.address, name: this.#providerName });
      return this.address;
    } catch (err) {
      if (err.code === 4001 || err.message?.includes('rejected')) throw new Error('USER_REJECTED');
      throw err;
    }
  }

  disconnect() {
    this.address       = null;
    this.#provider     = null;
    this.#providerName = null;
    this.emit('disconnected', {});
  }

  /**
   * Sign and execute a Sui Transaction (PTB).
   * `tx` should be a serialised transaction (base64 bytes string) OR
   * a @mysten/sui Transaction object with .build() already called.
   *
   * Returns the full SuiTransactionBlockResponse (includes digest + effects).
   */
  async signAndExecute(txBytes) {
    if (!this.#provider) throw new Error('NOT_CONNECTED');

    // Standard wallet feature (preferred)
    if (this.#providerName !== 'Sui Wallet (legacy)') {
      try {
        const feat = this.#provider.features['sui:signAndExecuteTransaction'] ??
                     this.#provider.features['sui:signAndExecuteTransactionBlock'];
        if (feat) {
          const result = await feat.signAndExecuteTransaction({
            transaction: txBytes,
            account: this.#provider.accounts[0],
            chain: 'sui:testnet',
          });
          return result;
        }
      } catch (e) {
        if (!e.message?.includes('not supported')) throw e;
      }
    }

    // Legacy suiWallet API
    if (this.#provider.signAndExecuteTransactionBlock) {
      return this.#provider.signAndExecuteTransactionBlock({
        transactionBlock: txBytes,
        options: { showEffects: true, showEvents: true },
      });
    }

    throw new Error('SIGN_UNSUPPORTED');
  }

  /** Execute a raw JSON-RPC call and return result. */
  async rpc(method, params) {
    const r = await fetch(TESTNET_RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
  }

  /** Get all objects owned by an address of a specific type. */
  async getOwnedObjects(address, typeFilter) {
    const result = await this.rpc('suix_getOwnedObjects', [
      address,
      { filter: typeFilter ? { StructType: typeFilter } : null, options: { showContent: true, showType: true } },
      null,
      50,
    ]);
    return result?.data ?? [];
  }
}

export const wallet = new TradeProofWallet();

// ── UI helper — standard connect modal ──────────────────────────────────────
//
// Call mountConnectModal(containerId, onConnected) to show a wallet picker.
// The modal is injected into the container element.

export function mountConnectModal(containerId, onConnected) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const wallets = wallet.detect();
  const hasWallets = wallets.length > 0;

  container.innerHTML = `
    <div class="tp-modal-backdrop" onclick="if(event.target===this)this.parentElement.innerHTML=''">
      <div class="tp-modal">
        <div class="tp-modal-title">Connect to TradeProof</div>
        <div class="tp-modal-sub">
          ${hasWallets
            ? 'Choose a wallet to continue. Your Sui address will be used as your identity.'
            : 'No Sui wallet detected. Install the Sui Wallet extension, then refresh.'}
        </div>

        ${hasWallets ? wallets.map((w, i) => `
          <button class="tp-wallet-btn" data-idx="${i}">
            ${w.icon ? `<img src="${w.icon}" width="24" height="24" style="border-radius:4px">` : '<span class="tp-wallet-icon">◉</span>'}
            <span>${w.name}</span>
          </button>
        `).join('') : ''}

        <div class="tp-divider">or</div>

        <button class="tp-wallet-btn tp-wallet-goog" disabled title="Coming in Phase 2 — zkLogin">
          <span>G</span>
          <span>Sign in with Google</span>
          <span class="tp-soon">Soon</span>
        </button>

        ${!hasWallets ? `
          <a href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
             target="_blank" class="tp-wallet-btn" style="justify-content:center;text-decoration:none">
            ↗ Install Sui Wallet Extension
          </a>
        ` : ''}

        <div id="tp-connect-error" style="display:none" class="tp-error"></div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .tp-modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center }
    .tp-modal { background:#fff;border-radius:16px;padding:28px;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2) }
    .tp-modal-title { font-size:18px;font-weight:800;margin-bottom:6px;font-family:inherit }
    .tp-modal-sub { font-size:13px;color:#6b7280;margin-bottom:20px;line-height:1.5 }
    .tp-wallet-btn { width:100%;padding:12px 16px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;display:flex;align-items:center;gap:12px;font-size:14px;font-weight:600;font-family:inherit;margin-bottom:8px;transition:all .12s }
    .tp-wallet-btn:hover:not([disabled]) { border-color:#1a4fff;background:#eff4ff }
    .tp-wallet-btn[disabled] { opacity:.5;cursor:not-allowed }
    .tp-wallet-goog span:first-child { width:24px;height:24px;background:#4285f4;color:#fff;border-radius:4px;display:grid;place-items:center;font-weight:900;font-size:13px;flex-shrink:0 }
    .tp-wallet-icon { width:24px;height:24px;background:#e2e8f0;border-radius:50%;display:grid;place-items:center;font-size:14px;flex-shrink:0 }
    .tp-soon { margin-left:auto;font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:8px }
    .tp-divider { text-align:center;color:#9ca3af;font-size:12px;margin:8px 0;position:relative }
    .tp-divider::before,.tp-divider::after { content:'';position:absolute;top:50%;width:42%;height:1px;background:#e5e7eb }
    .tp-divider::before { left:0 } .tp-divider::after { right:0 }
    .tp-error { background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:12px;color:#b42318;margin-top:8px }
  `;
  document.head.appendChild(style);

  container.querySelectorAll('[data-idx]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx   = Number(btn.dataset.idx);
      const errEl = document.getElementById('tp-connect-error');
      btn.disabled = true;
      btn.textContent = 'Connecting…';
      try {
        await wallet.connect(wallets[idx]);
        container.innerHTML = '';
        if (onConnected) onConnected(wallet.address);
      } catch (e) {
        btn.disabled = false;
        btn.textContent = wallets[idx].name;
        errEl.style.display = 'block';
        errEl.textContent = e.message === 'USER_REJECTED'
          ? 'Connection rejected in wallet. Please approve the request.'
          : `Error: ${e.message}`;
      }
    });
  });
}

// ── Transaction builders ─────────────────────────────────────────────────────
//
// These functions return serialised PTB bytes ready for wallet.signAndExecute().
// They use @mysten/sui dynamically if available, otherwise return null.

const PACKAGE = '0xbf5d2104cdc531abff9f307b035df214793314ee92a661d190bc90b580ab1697';

export async function buildCreateEscrowTx({
  blNumber,
  containerIso,
  beneficiary,
  freeDays,
  ratePerDayMist,
  gateInMs,
  depositMist,
  senderAddress,
}) {
  const { Transaction } = await import('https://cdn.jsdelivr.net/npm/@mysten/sui/+esm');

  const tx = new Transaction();
  tx.setSender(senderAddress);

  const [coin] = tx.splitCoins(tx.gas, [depositMist]);
  tx.moveCall({
    target: `${PACKAGE}::payment_escrow::create`,
    arguments: [
      tx.pure.string(blNumber),
      tx.pure.string(containerIso),
      tx.pure.address(beneficiary),
      tx.pure.u64(freeDays),
      tx.pure.u64(ratePerDayMist),
      tx.pure.u64(gateInMs),
      coin,
    ],
  });

  return tx;
}

export async function buildEndorseBLTx({
  blObjectId,
  newHolder,
  endorsementType = 1,
  sequence = 1,
  senderAddress,
}) {
  const { Transaction } = await import('https://cdn.jsdelivr.net/npm/@mysten/sui/+esm');

  const tx = new Transaction();
  tx.setSender(senderAddress);

  tx.moveCall({
    target: `${PACKAGE}::bl_transfer::endorse_with_record`,
    arguments: [
      tx.object(blObjectId),
      tx.pure.address(newHolder),
      tx.pure.u8(endorsementType),
      tx.pure.u64(sequence),
      tx.object('0x6'),  // Sui Clock
    ],
  });

  return tx;
}

export async function buildGateInTx({
  containerObjectId,
  port,
  senderAddress,
}) {
  const { Transaction } = await import('https://cdn.jsdelivr.net/npm/@mysten/sui/+esm');

  const tx = new Transaction();
  tx.setSender(senderAddress);

  tx.moveCall({
    target: `${PACKAGE}::container::gate_in`,
    arguments: [
      tx.object(containerObjectId),
      tx.pure.string(port),
      tx.object('0x6'),
    ],
  });

  return tx;
}
