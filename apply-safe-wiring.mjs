// apply-safe-wiring.mjs
// Run from the project root:  node apply-safe-wiring.mjs
// - Makes every edit in memory first. If ANY anchor is missing it writes nothing.
// - Writes .bak copies of every file it changes.
// - Safe to run twice (already-applied edits are skipped).
// - Preserves each file's line endings (Windows CRLF or Unix LF).

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const problems = [];
const log = [];
const files = [];

function load(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    problems.push(`Missing file: ${rel}`);
    return null;
  }
  const original = fs.readFileSync(p, "utf8");
  const file = { rel, p, original, crlf: original.includes("\r\n"), text: original.replace(/\r\n/g, "\n"), changed: false };
  files.push(file);
  return file;
}

// find: string (must occur exactly once) or RegExp (must match at least once)
// replace: string or function(match, ...groups) => string
function edit(file, name, marker, find, replace) {
  if (!file) return;
  if (file.text.includes(marker)) {
    log.push(`skip   ${file.rel}: ${name} (already applied)`);
    return;
  }
  if (typeof find === "string") {
    const count = file.text.split(find).length - 1;
    if (count !== 1) {
      problems.push(`${file.rel}: "${name}" anchor found ${count} times (expected 1).`);
      return;
    }
    file.text = file.text.replace(find, () => (typeof replace === "function" ? replace(find) : replace));
  } else {
    if (!find.test(file.text)) {
      problems.push(`${file.rel}: "${name}" anchor not found.`);
      return;
    }
    file.text = file.text.replace(find, replace);
  }
  file.changed = true;
  log.push(`edit   ${file.rel}: ${name}`);
}

for (const rel of ["scripts/safe-transfer.js", "scripts/safe-panel.js"]) {
  if (!fs.existsSync(path.join(root, rel))) problems.push(`Missing file: ${rel} (copy it into scripts/ first)`);
}

// ---------------------------------------------------------------- members page
const members = load("dashboards/members-dashboard.html");

edit(members, "approvals mount point", 'id="safe-panel"',
  /(Your approval is cryptographically recorded\.[\s\S]*?<\/section>)/,
  (match) => `${match}\n          <div id="safe-panel" data-safe-mode="member"></div>`);

edit(members, "safe-panel script tag", "safe-panel.bundle.js",
  '<script src="../scripts/dashboard.bundle.js"></script>',
  '<script src="../scripts/dashboard.bundle.js"></script>\n  <script src="../scripts/safe-panel.bundle.js"></script>');

edit(members, "enable Send button", 'id="wallet-send-button"',
  '<button class="button-green" type="button" disabled title="Transfers are not enabled in this prototype"><span data-icon="send"></span>Send unavailable</button>',
  '<button class="button-green" id="wallet-send-button" type="button" data-action="send" disabled><span data-icon="send"></span>Propose withdrawal</button>');

edit(members, "wallet warning wording", "withdrawals from the pot need two signers",
  /This read-only view is your personal browser wallet, not your stokvel.s shared wallet\. Transfers require the approved shared-wallet contract\./,
  "This page shows your personal browser wallet. Contributions go from your wallet into the Themba pot (a 2-of-3 Safe), and withdrawals from the pot need two signers.");

// ------------------------------------------------------------- treasurer page
const treasurer = load("dashboards/treasurer-dashboard.html");

edit(treasurer, "approvals mount point", 'id="safe-panel"',
  'data-action="review-request">Review</button></div></section>',
  (match) => `${match}\n          <div id="safe-panel" data-safe-mode="signer"></div>`);

edit(treasurer, "safe-panel script tag", "safe-panel.bundle.js",
  '<script src="../scripts/treasurer.js"></script>',
  '<script src="../scripts/treasurer.js"></script>\n  <script src="../scripts/safe-panel.bundle.js"></script>');

// ----------------------------------------------------------------- admin page
const admin = load("dashboards/platform-admin-dashboard.html");

edit(admin, "approvals mount point", 'id="safe-panel"',
  /(<span class="signer-initiator">Initiator<\/span><\/div>\s*<\/section>\s*<\/div>)/,
  (match) => `${match}\n          <div id="safe-panel" data-safe-mode="signer"></div>`);

edit(admin, "safe-panel script tag", "safe-panel.bundle.js",
  '<script src="../scripts/platform-admin.js"></script>',
  '<script src="../scripts/platform-admin.js"></script>\n  <script src="../scripts/safe-panel.bundle.js"></script>');

// ------------------------------------------------------------------ dashboard.js
const js = load("scripts/dashboard.js");

edit(js, "import Safe helpers", 'from "./safe-transfer.js"',
  'import { BrowserProvider, Contract, formatUnits as ethersFormatUnits } from "ethers";',
  'import { BrowserProvider, Contract, formatUnits as ethersFormatUnits } from "ethers";\nimport { contributeToSafe, proposeTransfer, explorerTx, describeError } from "./safe-transfer.js";');

edit(js, "currentDialog state", "let currentDialog = null;",
  "  let walletRequestPending = false;",
  "  let walletRequestPending = false;\n  let currentDialog = null;");

edit(js, "enable Send button when connected", 'querySelector("#wallet-send-button")',
  "    document.querySelector('[data-action=\"receive\"]').disabled = !connected || !onSepolia;",
  "    document.querySelector('[data-action=\"receive\"]').disabled = !connected || !onSepolia;\n" +
  "    const sendButton = document.querySelector(\"#wallet-send-button\");\n" +
  "    if (sendButton) sendButton.disabled = !connected || !onSepolia;");

edit(js, "connect toast wording", "Wallet connected to Sepolia.\"",
  '"Wallet connected to Sepolia. Balances are read-only."',
  '"Wallet connected to Sepolia."');

edit(js, "showToast with Etherscan link", "href ? 9000 : 3200",
`  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = \`toast \${type}\`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("out");
      window.setTimeout(() => toast.remove(), 300);
    }, 3200);
  }`,
`  function showToast(message, type = "info", href = null) {
    const toast = document.createElement("div");
    toast.className = \`toast \${type}\`;
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = message;
      toast.appendChild(link);
    } else {
      toast.textContent = message;
    }
    toastStack.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("out");
      window.setTimeout(() => toast.remove(), 300);
    }, href ? 9000 : 3200);
  }`);

edit(js, "contribution dialog", "Send Mock USDT from your wallet to the Themba pot",
  /^( {4})contribution: \{.*\},$/m,
  (match, indent) => `${indent}contribution: { eyebrow: "Build together", title: "Make a contribution", description: "Send Mock USDT from your wallet to the Themba pot. Testnet only.", fields: '<label>Amount (Mock USDT)<input class="input" name="amount" type="number" min="0.000001" step="any" placeholder="25.00" required></label>', button: "Send contribution" },`);

edit(js, "withdrawal dialog", "Needs 2 of 3 signer approvals before any funds move",
  /^( {4})send: \{.*\},$/m,
  (match, indent) => `${indent}send: { eyebrow: "Shared wallet", title: "Propose a withdrawal", description: "Needs 2 of 3 signer approvals before any funds move.", fields: '<label>Recipient wallet address<input class="input" name="address" type="text" placeholder="0x..." required></label><label>Amount (Mock USDT)<input class="input" name="amount" type="number" min="0.000001" step="any" placeholder="25.00" required></label>', button: "Propose withdrawal" },`);

edit(js, "track open dialog", "currentDialog = action;",
  '    if (!definition) return;\n    const fields = action === "receive"',
  '    if (!definition) return;\n    currentDialog = action;\n    const fields = action === "receive"');

edit(js, "submitSafeDialog function", "async function submitSafeDialog",
  '  document.addEventListener("submit", (event) => {',
`  async function submitSafeDialog(kind, form, submitButton) {
    if (!walletAccount || walletChainId !== sepoliaChainId) {
      showToast("Connect your wallet to Sepolia first.", "error");
      return;
    }
    const amount = String(form.get("amount") || "").trim();
    if (!(Number(amount) > 0)) {
      showToast("Enter a valid amount.", "error");
      return;
    }
    const original = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Confirm in wallet…";
    try {
      if (kind === "contribution") {
        const hash = await contributeToSafe(window.ethereum, amount);
        dialog.close();
        showToast("Contribution sent. View on Etherscan.", "success", explorerTx(hash));
        await loadWalletBalances(window.ethereum, walletAccount);
      } else {
        await proposeTransfer(window.ethereum, walletAccount, String(form.get("address") || "").trim(), amount);
        dialog.close();
        showToast("Withdrawal proposed. A second signer must approve it.", "success");
      }
    } catch (error) {
      console.error(error);
      showToast(describeError(error), "error");
      submitButton.disabled = false;
      submitButton.textContent = original;
    }
  }

  document.addEventListener("submit", (event) => {`);

edit(js, "route dialogs to Safe", "submitSafeDialog(currentDialog",
  '      const title = dialogContent.querySelector("#dialog-title").textContent;',
`      if (currentDialog === "contribution" || currentDialog === "send") {
        submitSafeDialog(currentDialog, new FormData(event.target), event.submitter);
        return;
      }
      const title = dialogContent.querySelector("#dialog-title").textContent;`);

// ------------------------------------------------------------------ package.json
const pkgFile = load("package.json");
if (pkgFile) {
  try {
    const pkg = JSON.parse(pkgFile.text);
    if (pkg.scripts?.build?.includes("safe-panel")) {
      log.push("skip   package.json: build script (already applied)");
    } else {
      pkg.scripts.build = `${pkg.scripts.build} && esbuild scripts/safe-panel.js --bundle --platform=browser --format=iife --minify --outfile=scripts/safe-panel.bundle.js`;
      pkgFile.text = `${JSON.stringify(pkg, null, 2)}\n`;
      pkgFile.changed = true;
      log.push("edit   package.json: build script");
    }
  } catch (error) {
    problems.push(`package.json could not be parsed: ${error.message}`);
  }
}

// ------------------------------------------------------------------ write out
if (problems.length) {
  console.error("\nNothing was changed. Fix these first:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("\nIf an anchor was not found, that part of the file differs from the version I was given. Send me the current file.\n");
  process.exit(1);
}

for (const file of files) {
  if (!file.changed) continue;
  fs.writeFileSync(`${file.p}.bak`, file.original);
  fs.writeFileSync(file.p, file.crlf ? file.text.replace(/\n/g, "\r\n") : file.text);
}
console.log(log.join("\n"));
console.log("\nDone. Backups saved as *.bak. Next: npm install, then npm run build.");
