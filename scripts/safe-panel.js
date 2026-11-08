// scripts/safe-panel.js
// Drop <div id="safe-panel" data-safe-mode="signer"></div> into any dashboard and load
// the bundle. Modes: "signer" (propose + contribute + approve/execute), "member" (view list;
// approve/execute buttons still only appear if the connected account is a Safe owner).

import {
  SAFE_CONFIG, getSafeSummary, getSafeTokenBalance, contributeToSafe, proposeTransfer,
  listPending, listExecuted, approveTransfer, executeTransfer,
  explorerTx, explorerAddress, describeError
} from "./safe-transfer.js";

(() => {
  "use strict";
  const root = document.querySelector("#safe-panel");
  if (!root) return;

  const mode = root.dataset.safeMode || "signer";
  const SEPOLIA = "0xaa36a7";
  const state = {
    account: null, chainId: null, summary: null, balance: null,
    pending: [], executed: [], busy: "", notice: null
  };

  const style = document.createElement("style");
  style.textContent = `
    .safe-panel{display:grid;gap:16px;border:1px solid rgba(128,128,128,.25);border-radius:16px;padding:20px;margin-top:20px}
    .safe-panel h2,.safe-panel h3{margin:0}
    .safe-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
    .safe-meta{display:flex;flex-wrap:wrap;gap:24px}
    .safe-meta small{display:block;opacity:.7}
    .safe-forms{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
    .safe-form{display:grid;gap:8px;align-content:start}
    .safe-tx{border:1px solid rgba(128,128,128,.3);border-radius:12px;padding:14px;display:grid;gap:8px}
    .safe-tx-top{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
    .safe-actions{display:flex;gap:8px;flex-wrap:wrap}
    .safe-notice{padding:10px 12px;border-radius:10px;border:1px solid rgba(128,128,128,.3)}
    .safe-notice.error{border-color:#c0392b}.safe-notice.ok{border-color:#2e9e5b}
    .safe-muted{opacity:.7}
    .safe-panel a{color:inherit;text-decoration:underline}
  `;
  document.head.appendChild(style);
  root.classList.add("safe-panel");

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
  const same = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());
  const fmt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 6 }) : String(v);
  };

  function txCard(tx, { ready, isSigner, threshold }) {
    const need = tx.confirmationsRequired || threshold;
    const count = tx.confirmations.length;
    const signed = tx.confirmations.some((o) => same(o, state.account));
    const canApprove = ready && isSigner && !signed;
    const canExecute = ready && isSigner && count >= need;
    const label = tx.amount ? `${esc(fmt(tx.amount))} Mock USDT → ${esc(short(tx.recipient))}` : "Custom Safe transaction";
    let hint = "";
    if (count >= need) hint = "Enough signatures. A signer can execute it now.";
    else if (signed) hint = "You approved. Waiting for another signer.";
    else if (!ready) hint = "Connect a signer wallet on Sepolia to act on this.";
    else if (!isSigner) hint = "View only. Your account is not a Safe signer.";
    return `<article class="safe-tx">
      <div class="safe-tx-top"><strong>${label}</strong><span class="status ${count >= need ? "status-done" : "status-pending"}">${count}/${need} signatures</span></div>
      <small class="safe-muted">Request #${tx.nonce} · proposed by ${esc(short(tx.proposer))} (counts as signature 1)</small>
      <div class="progress-track"><span style="width:${Math.min(100, (count / need) * 100)}%"></span></div>
      <small class="safe-muted">${esc(hint)}</small>
      <div class="safe-actions">
        ${canApprove ? `<button class="btn btn-gold" type="button" data-safe-action="approve" data-hash="${esc(tx.safeTxHash)}">Approve</button>` : ""}
        ${canExecute ? `<button class="button-outline" type="button" data-safe-action="execute" data-hash="${esc(tx.safeTxHash)}">Execute transfer</button>` : ""}
      </div>
    </article>`;
  }

  function render() {
    const connected = Boolean(state.account);
    const onSepolia = state.chainId === SEPOLIA;
    const ready = connected && onSepolia;
    const isSigner = Boolean(state.summary?.isOwner);
    const threshold = state.summary?.threshold ?? 2;
    const owners = state.summary?.owners?.length ?? 3;
    const busy = Boolean(state.busy);
    const dis = busy ? "disabled" : "";

    const connectButton = !connected
      ? `<button class="btn btn-gold" type="button" data-safe-action="connect" ${dis}>Connect wallet</button>`
      : !onSepolia
        ? `<button class="btn btn-gold" type="button" data-safe-action="connect" ${dis}>Switch to Sepolia</button>`
        : "";

    const forms = ready && mode !== "member" ? `
      <div class="safe-forms">
        <form class="safe-form" data-safe-form="contribute">
          <h3>Contribute</h3><small class="safe-muted">Send Mock USDT from your wallet into the pot.</small>
          <input class="input" name="amount" type="number" min="0.000001" step="any" placeholder="Amount (Mock USDT)" required>
          <button class="btn btn-gold" type="submit" ${dis}>Send to the pot</button>
        </form>
        ${isSigner ? `<form class="safe-form" data-safe-form="propose">
          <h3>Propose withdrawal</h3><small class="safe-muted">Needs ${threshold} of ${owners} signers.</small>
          <input class="input" name="to" type="text" placeholder="Recipient 0x…" required>
          <input class="input" name="amount" type="number" min="0.000001" step="any" placeholder="Amount (Mock USDT)" required>
          <button class="btn btn-gold" type="submit" ${dis}>Propose</button>
        </form>` : `<div class="safe-form safe-muted"><h3>Propose withdrawal</h3><small>Only Safe signers can propose withdrawals.</small></div>`}
      </div>` : "";

    const pending = state.pending.length
      ? state.pending.map((tx) => txCard(tx, { ready, isSigner, threshold })).join("")
      : `<p class="safe-muted">No pending requests.</p>`;
    const executed = state.executed.length
      ? state.executed.map((tx) => `<div class="safe-tx-top"><span>${tx.amount ? `${esc(fmt(tx.amount))} Mock USDT → ${esc(short(tx.recipient))}` : "Safe transaction"}</span>${tx.txHash ? `<a href="${esc(explorerTx(tx.txHash))}" target="_blank" rel="noopener noreferrer">View on Etherscan</a>` : ""}</div>`).join("")
      : `<p class="safe-muted">Nothing executed yet.</p>`;

    const notice = state.notice
      ? `<div class="safe-notice ${state.notice.type}" role="status">${esc(state.notice.text)}${state.notice.href ? ` · <a href="${esc(state.notice.href)}" target="_blank" rel="noopener noreferrer">View on Etherscan</a>` : ""}</div>`
      : "";

    root.innerHTML = `
      <div class="safe-head">
        <div><h2>Themba pot · Safe multisig</h2>
          <small class="safe-muted"><a href="${esc(explorerAddress(SAFE_CONFIG.safeAddress))}" target="_blank" rel="noopener noreferrer">${esc(short(SAFE_CONFIG.safeAddress))}</a> · Sepolia testnet · Mock USDT</small></div>
        <div class="safe-actions">${connectButton}<button class="button-outline" type="button" data-safe-action="refresh" ${dis}>Refresh</button></div>
      </div>
      <div class="safe-meta">
        <span><small>Pot balance</small><strong>${state.balance !== null ? `${esc(fmt(state.balance))} Mock USDT` : "Connect to view"}</strong></span>
        <span><small>Approvals needed</small><strong>${threshold} of ${owners} signers</strong></span>
        <span><small>Your role</small><strong>${!connected ? "Not connected" : !onSepolia ? "Wrong network" : isSigner ? "Signer" : "Member"}</strong></span>
      </div>
      ${state.busy ? `<div class="safe-notice">${esc(state.busy)}</div>` : notice}
      ${forms}
      <div><h3>Pending requests</h3>${pending}</div>
      <div><h3>Executed</h3>${executed}</div>
      <small class="safe-muted">Testnet only. Stock Safe counts the proposer's signature as one of the required approvals.</small>`;
  }

  async function refresh() {
    const provider = window.ethereum;
    const jobs = [
      listPending().then((r) => { state.pending = r; }),
      listExecuted().then((r) => { state.executed = r; })
    ];
    if (state.account && state.chainId === SEPOLIA) {
      jobs.push(getSafeSummary(provider, state.account).then((r) => { state.summary = r; }));
      jobs.push(getSafeTokenBalance(provider).then((r) => { state.balance = r; }));
    }
    const results = await Promise.allSettled(jobs);
    const failed = results.find((r) => r.status === "rejected");
    if (failed) {
      console.error("Safe refresh failed:", failed.reason);
      state.notice = { type: "error", text: "Could not load some Safe data. Check the Safe address, API key and network." };
    }
  }

  async function switchToSepolia(provider) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: SEPOLIA, chainName: "Ethereum Sepolia",
          nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org"], blockExplorerUrls: ["https://sepolia.etherscan.io"]
        }]
      });
    }
  }

  async function connect() {
    const provider = window.ethereum;
    if (!provider) throw new Error("No browser wallet found. Install MetaMask and try again.");
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    state.account = accounts[0] || null;
    state.chainId = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
    if (state.chainId !== SEPOLIA) {
      await switchToSepolia(provider);
      state.chainId = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
    }
    await refresh();
  }

  async function run(label, task) {
    if (state.busy) return;
    state.busy = label;
    state.notice = null;
    render();
    try {
      const outcome = await task();
      if (outcome) state.notice = { type: "ok", ...outcome };
    } catch (error) {
      console.error(error);
      state.notice = { type: "error", text: describeError(error) };
    } finally {
      state.busy = "";
      render();
    }
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-safe-action]");
    if (!button) return;
    const hash = button.dataset.hash;
    const provider = window.ethereum;
    switch (button.dataset.safeAction) {
      case "connect": run("Connecting…", connect); break;
      case "refresh": run("Refreshing…", async () => { await refresh(); }); break;
      case "approve":
        run("Confirm the signature in your wallet…", async () => {
          await approveTransfer(provider, state.account, hash);
          await refresh();
          return { text: "Approval recorded." };
        });
        break;
      case "execute":
        run("Confirm the transaction in your wallet…", async () => {
          const txHash = await executeTransfer(provider, state.account, hash);
          await refresh();
          return { text: "Transfer executed on Sepolia.", href: explorerTx(txHash) };
        });
        break;
      default: break;
    }
  });

  root.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const amount = String(data.get("amount") || "").trim();
    const provider = window.ethereum;
    if (form.dataset.safeForm === "contribute") {
      run("Confirm the transfer in your wallet…", async () => {
        const hash = await contributeToSafe(provider, amount);
        await refresh();
        return { text: "Contribution sent to the pot.", href: explorerTx(hash) };
      });
    } else if (form.dataset.safeForm === "propose") {
      const to = String(data.get("to") || "").trim();
      run("Sign the proposal in your wallet…", async () => {
        await proposeTransfer(provider, state.account, to, amount);
        await refresh();
        return { text: "Withdrawal proposed. A second signer must approve it." };
      });
    }
  });

  if (window.ethereum?.on) {
    window.ethereum.on("accountsChanged", (accounts) => {
      state.account = accounts[0] || null;
      state.summary = null;
      state.balance = null;
      run("Refreshing…", async () => { await refresh(); });
    });
    window.ethereum.on("chainChanged", (chainId) => {
      state.chainId = String(chainId).toLowerCase();
      state.summary = null;
      state.balance = null;
      run("Refreshing…", async () => { await refresh(); });
    });
  }

  render();
  (async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        state.account = accounts[0] || null;
        state.chainId = String(await window.ethereum.request({ method: "eth_chainId" })).toLowerCase();
      }
    } catch (error) {
      console.error("Wallet check failed:", error);
    }
    run("Loading…", async () => { await refresh(); });
  })();
})();
