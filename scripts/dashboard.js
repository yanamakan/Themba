import { BrowserProvider, Contract, formatUnits as ethersFormatUnits } from "ethers";
import { contributeToSafe, proposeTransfer, explorerTx, describeError } from "./safe-transfer.js";

(() => {
  "use strict";

  const iconPaths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.7-.8-1.8-1.2-3-1.2-1.8 0-3 .9-3 2.2 0 3.2 6 1.4 6 4.5 0 1.3-1.2 2.3-3.1 2.3-1.3 0-2.5-.5-3.3-1.4M12.5 5.5v13"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    bank: '<path d="m3 9 9-6 9 6"/><path d="M4 10h16M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M3 18h18"/>',
    history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    wallet: '<path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6"/><path d="M20 12h-4a2 2 0 0 0 0 4h4z"/><path d="M16 14h.01"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7z"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 18v3h14v-3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    warning: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };

  const iconMarkup = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ""}</svg>`;
  document.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = iconMarkup(element.dataset.icon);
  });

  const pageNames = {
    overview: "Overview",
    stokvels: "My Stokvels",
    contributions: "Contributions",
    approvals: "Approvals",
    bills: "Bill Splitting",
    loans: "Loans",
    transactions: "Transactions",
    wallet: "Sepolia Wallet",
    notifications: "Notifications",
    settings: "Profile & settings"
  };
  const dialog = document.querySelector("#action-dialog");
  const dialogContent = document.querySelector("#dialog-content");
  const toastStack = document.querySelector("#toasts");
  const sidebar = document.querySelector("#sidebar");
  const roleSelect = document.querySelector("#role-select");
  const sessionKeys = ["themba_session"];
  const demo = window.ThembaDemo;
  const sepoliaChainId = "0xaa36a7";
  const mockUsdtAddress = "0xA6747B2a329FDc8550c1f2892dCc45dF9E537b9c";
  const mockUsdtAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  let walletAccount = null;
  let walletChainId = null;
  let walletBalances = null;
  let walletBalancesLoading = false;
  let walletRequestPending = false;
  let currentDialog = null;

  function formatBalance(value, decimals, fractionDigits = 4) {
    const [whole, fraction = ""] = ethersFormatUnits(value, decimals).split(".");
    const trimmedFraction = fraction.slice(0, fractionDigits).replace(/0+$/, "");
    return `${BigInt(whole).toLocaleString("en-US")}${trimmedFraction ? `.${trimmedFraction}` : ""}`;
  }

  function saveDemoPreference(name, value) {
    try {
      demo.setPreference(name, value);
      return true;
    } catch (error) {
      console.error(`Could not save demo preference ${name}:`, error);
      showToast(error.message || "Could not save this demo preference.", "error");
      return false;
    }
  }

  function shortAddress(address) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  function renderWalletState() {
    const connected = Boolean(walletAccount);
    const onSepolia = walletChainId === sepoliaChainId;
    document.querySelector("#wallet-overview-address").textContent = connected ? shortAddress(walletAccount) : "No wallet connected";
    document.querySelector("#wallet-overview-network").textContent = connected
      ? onSepolia ? "Connected · Sepolia testnet" : "Switch to Sepolia to view balances"
      : "Connect a wallet to view account balances";
    const addressElement = document.querySelector("#wallet-address");
    addressElement.textContent = connected ? shortAddress(walletAccount) : "Connect a browser wallet to continue";
    addressElement.title = connected ? walletAccount : "";
    document.querySelector("#wallet-status-title").textContent = connected
      ? onSepolia ? "Wallet connected" : "Wrong network"
      : "Wallet not connected";
    document.querySelector("#wallet-network").textContent = connected
      ? onSepolia ? "Ethereum Sepolia" : `Unsupported network (${walletChainId || "unknown"})`
      : "Sepolia required";
    document.querySelector("#wallet-status-dot").classList.toggle("is-connected", connected && onSepolia);
    document.querySelector("#copy-wallet-address").disabled = !connected;
    document.querySelector('[data-action="receive"]').disabled = !connected || !onSepolia;
    const sendButton = document.querySelector("#wallet-send-button");
    if (sendButton) sendButton.disabled = !connected || !onSepolia;
    const overviewConnectButton = document.querySelector("#overview-connect-wallet-button");
    overviewConnectButton.hidden = connected && onSepolia;
    overviewConnectButton.textContent = connected ? "Switch to Sepolia" : "Connect wallet";
    document.querySelector("#connect-wallet-button").hidden = connected && onSepolia;
    document.querySelector("#connect-wallet-button").textContent = connected ? "Switch to Sepolia" : "Connect wallet";
    document.querySelector("#disconnect-wallet-button").hidden = !connected;
    document.querySelector("#wallet-value").textContent = connected && onSepolia
      ? walletBalances ? `${formatBalance(walletBalances.token, walletBalances.decimals)} Mock USDT` : walletBalancesLoading ? "Loading balance…" : "Balance unavailable"
      : connected ? "Switch to Sepolia" : "Connect a wallet to view";
    document.querySelector("#wallet-conversion").textContent = connected && onSepolia
      ? walletBalances ? `Sepolia ETH: ${formatBalance(walletBalances.native, 18)} ETH` : walletBalancesLoading ? "Sepolia ETH: loading…" : "Sepolia ETH: —"
      : "Sepolia ETH: —";
  }

  function clearWalletState() {
    walletAccount = null;
    walletChainId = null;
    walletBalances = null;
    walletBalancesLoading = false;
    renderWalletState();
  }

  async function loadWalletBalances(provider, address) {
    const ethersProvider = new BrowserProvider(provider);
    const network = await ethersProvider.getNetwork();
    walletChainId = `0x${network.chainId.toString(16)}`;
    if (walletChainId !== sepoliaChainId) {
      walletBalances = null;
      walletBalancesLoading = false;
      renderWalletState();
      return;
    }

    walletBalances = null;
    walletBalancesLoading = true;
    renderWalletState();
    try {
      const token = new Contract(mockUsdtAddress, mockUsdtAbi, ethersProvider);
      const [nativeBalance, decimalsValue, tokenBalance] = await Promise.all([
        ethersProvider.getBalance(address),
        token.decimals(),
        token.balanceOf(address)
      ]);
      const activeChainId = (await provider.request({ method: "eth_chainId" })).toLowerCase();
      if (activeChainId !== sepoliaChainId || walletAccount?.toLowerCase() !== address.toLowerCase()) {
        walletChainId = activeChainId;
        return;
      }
      const decimals = Number(decimalsValue);
      if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
        throw new Error("The Mock USDT contract returned invalid token decimals.");
      }
      walletBalances = { native: nativeBalance, token: tokenBalance, decimals };
    } finally {
      walletBalancesLoading = false;
      renderWalletState();
    }
  }

  async function switchToSepolia(provider) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: sepoliaChainId }]
      });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: sepoliaChainId,
          chainName: "Ethereum Sepolia",
          nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"]
        }]
      });
    }
  }

  async function connectWallet() {
    if (walletRequestPending) return;
    const provider = window.ethereum;
    if (!provider || typeof provider.request !== "function") {
      showToast("No browser wallet was found. Install a wallet such as MetaMask and try again.", "error");
      return;
    }

    const button = document.querySelector("#connect-wallet-button");
    walletRequestPending = true;
    button.disabled = true;
    button.textContent = "Connecting…";
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || !accounts[0]) {
        throw new Error("The wallet did not provide an account.");
      }
      walletAccount = accounts[0];
      await switchToSepolia(provider);
      await loadWalletBalances(provider, walletAccount);
      renderWalletState();
      showToast("Wallet connected to Sepolia.", "success");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      renderWalletState();
      showToast(error.code === 4001
        ? "Wallet connection or network switch was cancelled."
        : "Could not connect or read the Mock USDT balance. Check your wallet and Sepolia connection, then try again.", "error");
    } finally {
      walletRequestPending = false;
      button.disabled = false;
      renderWalletState();
    }
  }

  if (window.ethereum && typeof window.ethereum.on === "function") {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (!accounts.length) {
        clearWalletState();
        return;
      }
      walletAccount = accounts[0];
      loadWalletBalances(window.ethereum, walletAccount).catch((error) => {
        console.error("Could not refresh wallet balances:", error);
        showToast("Could not refresh wallet balances. Check your Sepolia connection.", "error");
      });
    });
    window.ethereum.on("chainChanged", (chainId) => {
      walletChainId = chainId.toLowerCase();
      renderWalletState();
      if (walletAccount) {
        loadWalletBalances(window.ethereum, walletAccount).catch((error) => {
          console.error("Could not refresh wallet balances:", error);
          showToast("Could not refresh wallet balances. Check your Sepolia connection.", "error");
        });
      }
    });
  }

  function readSession() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const value = storage.getItem(sessionKeys[0]);
        if (value) return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  }

  function updateSession(updates) {
    const session = { ...(readSession() || {}), ...updates };
    for (const storage of [localStorage, sessionStorage]) {
      try {
        if (storage.getItem(sessionKeys[0])) {
          storage.setItem(sessionKeys[0], JSON.stringify(session));
          return;
        }
      } catch {
        continue;
      }
    }
    try {
      sessionStorage.setItem(sessionKeys[0], JSON.stringify(session));
    } catch {
      showToast("Your browser could not save this session update.", "error");
    }
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "TM";
  }

  function applyProfile() {
    const session = readSession() || {};
    const name = session.name || "Lethabo Mokoena";
    const email = session.email || "member@themba.demo";
    const role = session.role || "member";
    document.querySelectorAll("[data-user-name]").forEach((el) => { el.textContent = name; });
    document.querySelectorAll("[data-user-initials]").forEach((el) => { el.textContent = initials(name); });
    document.querySelectorAll("[data-first-name]").forEach((el) => { el.textContent = name.trim().split(/\s+/)[0] || "there"; });
    document.querySelector("#profile-name").value = name;
    document.querySelector("#profile-email").value = email;
    document.querySelector("#profile-role").value = role;
    roleSelect.value = role;
    document.querySelector(".sidebar-profile small").textContent = role === "member" ? "Community member" : role[0].toUpperCase() + role.slice(1);
  }

  function showToast(message, type = "info", href = null) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
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
  }

  function navigate(page) {
    if (!pageNames[page]) return;
    document.querySelectorAll("[data-view]").forEach((view) => {
      view.classList.toggle("is-visible", view.dataset.view === page);
    });
    document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
      const active = link.dataset.page === page;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelector("#breadcrumb").textContent = pageNames[page];
    document.title = `${pageNames[page]} — Themba`;
    sidebar.classList.remove("is-open");
    document.querySelector(".mobile-menu").setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const dialogDefinitions = {
    contribution: { eyebrow: "Build together", title: "Make a contribution", description: "Send Mock USDT from your wallet to the Themba pot. Sepolia testnet only.", fields: '<label>Amount (Mock USDT)<input class="input" name="amount" type="number" min="0.000001" step="any" placeholder="25.00" required></label>', button: "Send contribution", disclaimer: "Sepolia testnet · Confirm the transaction in your wallet" },
    loan: { eyebrow: "Responsible access", title: "Apply for a loan", description: "Your loan request is saved in this browser demo for review.", fields: '<label>Loan amount (R)<input class="input" name="amount" type="number" min="1" step="1" placeholder="5,000" required></label><label>Repayment period<select class="select" name="period"><option>3 months</option><option>6 months</option><option>12 months</option></select></label><label>What is the loan for?<input class="input" name="purpose" type="text" placeholder="Briefly describe your purpose" required></label>', button: "Save loan request" },
    bill: { eyebrow: "Share fairly", title: "Create a bill", description: "Save a shared expense to the browser demo ledger.", fields: '<label>Bill name<input class="input" name="name" type="text" placeholder="e.g. Community groceries" required></label><label>Total amount (R)<input class="input" name="amount" type="number" min="1" step="1" placeholder="1,200" required></label><label>Split method<select class="select" name="split"><option>Split equally</option><option>Custom amounts</option><option>By percentage</option></select></label>', button: "Create bill" },
    "create-stokvel": { eyebrow: "Grow your community", title: "Create a stokvel", description: "Create a local demo group. It is not shared with other users.", fields: '<label>Stokvel name<input class="input" name="name" type="text" placeholder="e.g. Future Savers" required></label><label>Monthly contribution (R)<input class="input" name="amount" type="number" min="1" step="1" placeholder="1,000" required></label><label>Membership<select class="select" name="membership"><option>Invitation only</option><option>Open to join</option></select></label>', button: "Create stokvel" },
    send: { eyebrow: "Shared wallet", title: "Propose a withdrawal", description: "Create a Safe proposal on Sepolia. Other authorised signers must approve it before execution.", fields: '<label>Recipient wallet address<input class="input" name="address" type="text" placeholder="0x..." required></label><label>Amount (Mock USDT)<input class="input" name="amount" type="number" min="0.000001" step="any" placeholder="25.00" required></label>', button: "Propose withdrawal", disclaimer: "Sepolia testnet · Confirm in your wallet; no mainnet funds" },
    receive: { eyebrow: "Sepolia testnet", title: "Receive Mock USDT", description: "Share this personal wallet address. It is not your stokvel’s shared wallet.", fields: "", button: "Copy wallet address" },
    "loan-schedule": { eyebrow: "Repayment details", title: "Loan schedule", description: "Your demo repayment plan for R 12,000.", fields: '<div class="schedule-list"><div><span>Monthly payment</span><strong>R 2,170</strong></div><div><span>Next due date</span><strong>25 Jun 2025</strong></div><div><span>Remaining balance</span><strong>R 8,200</strong></div></div>', button: "Done" },
    "switch-group": { eyebrow: "Your communities", title: "Switch stokvel", description: "Choose an active community to view.", fields: '<div class="dialog-group-options"><button type="button" class="button-outline" data-select-group="khula"><span class="avatar avatar-green">KC</span><span>Khula Savings Circle<small>12 members · R 248,500</small></span></button><button type="button" class="button-outline" data-select-group="future"><span class="avatar avatar-purple">FM</span><span>Future Minds<small>8 members · R 86,200</small></span></button></div>', button: null },
    profile: { eyebrow: "Your account", title: "Profile & settings", description: "Update your personal details or account preferences.", fields: '<p>Manage your profile, notification preferences and security settings.</p>', button: "Open settings", page: "settings" }
  };

  function saveDemo(collection, value) {
    try {
      return demo.add(collection, value);
    } catch (error) {
      console.error(`Could not save demo ${collection}:`, error);
      showToast(error.message || "Could not save this demo action.", "error");
      return null;
    }
  }

  function renderSavedDemo() {
    try {
      const loanList = document.querySelector(".loan-list");
      demo.list("loans").forEach((loan) => {
        if (loanList.querySelector(`[data-demo-record="${loan.id}"]`)) return;
        const row = document.createElement("div");
        row.className = "loan-row";
        row.dataset.demoRecord = loan.id;
        const identity = document.createElement("span");
        identity.className = "avatar";
        identity.textContent = "ME";
        const details = document.createElement("span");
        details.className = "row-grow";
        const title = document.createElement("strong");
        title.textContent = loan.purpose;
        const subtitle = document.createElement("small");
        subtitle.textContent = `${loan.period} · Demo request`;
        details.append(title, subtitle);
        const amount = document.createElement("b");
        amount.textContent = `R ${Number(loan.amount).toLocaleString("en-ZA")}`;
        const status = document.createElement("span");
        status.className = "status status-pending";
        status.textContent = "Pending review";
        row.append(identity, details, amount, status);
        loanList.append(row);
      });

      const billGrid = document.querySelector(".bill-grid");
      demo.list("bills").forEach((bill) => {
        if (billGrid.querySelector(`[data-demo-record="${bill.id}"]`)) return;
        const card = document.createElement("article");
        card.className = "panel bill-card";
        card.dataset.demoRecord = bill.id;
        const title = document.createElement("h2");
        title.textContent = bill.name;
        const detail = document.createElement("p");
        detail.textContent = `Demo bill · ${bill.split}`;
        const amount = document.createElement("strong");
        amount.textContent = `R ${Number(bill.amount).toLocaleString("en-ZA")}`;
        const amountWrap = document.createElement("div");
        amountWrap.className = "bill-amounts";
        amountWrap.append(amount);
        const status = document.createElement("span");
        status.className = "status status-pending";
        status.textContent = "New · demo";
        const top = document.createElement("div");
        top.className = "bill-card-top";
        top.append(status);
        card.append(top, title, detail, amountWrap);
        billGrid.prepend(card);
      });

      const groupTabs = document.querySelector(".group-tabs");
      demo.list("stokvels").filter((stokvel) => stokvel.source === "member").forEach((stokvel) => {
        if (groupTabs.querySelector(`[data-demo-record="${stokvel.id}"]`)) return;
        const tab = document.createElement("button");
        tab.className = "group-tab";
        tab.type = "button";
        tab.dataset.group = stokvel.id;
        tab.dataset.demoRecord = stokvel.id;
        const avatar = document.createElement("span");
        avatar.className = "avatar avatar-purple";
        avatar.textContent = stokvel.initials;
        const text = document.createElement("span");
        const name = document.createElement("b");
        name.textContent = stokvel.name;
        const meta = document.createElement("small");
        meta.textContent = `New demo group · R ${Number(stokvel.amount).toLocaleString("en-ZA")} monthly`;
        text.append(name, meta);
        tab.append(avatar, text);
        groupTabs.append(tab);
      });
      const activeGroup = demo.getPreference("activeGroup", "khula");
      const savedInviteCode = demo.getPreference("inviteCode");
      if (savedInviteCode) document.querySelector("#invite-code").textContent = savedInviteCode;
      document.querySelectorAll(".group-tab").forEach((tab) => tab.classList.toggle("is-selected", tab.dataset.group === activeGroup));
      const customGroup = demo.list("stokvels").find((group) => group.id === activeGroup);
      if (customGroup) {
        document.querySelector("#group-balance-value").textContent = "R 0";
        document.querySelector("#group-balance-caption").textContent = `${customGroup.name} · Local demo group`;
      }

      const memberVote = demo.list("approvals").find((record) => record.id === "member-venue-request");
      if (memberVote) {
        const approved = memberVote.status === "approved-demo";
        document.querySelector(".approval-members .member-row:nth-child(2) .approval-count").textContent = approved ? "✓ Demo approval recorded" : "Demo rejection recorded";
        document.querySelector(".approval-progress-heading strong").textContent = approved ? "2/2 demo votes" : "Demo request rejected";
        document.querySelector(".approval-progress-heading small").textContent = "Browser-only vote; no Safe transaction was submitted";
        document.querySelector(".approval-buttons")?.remove();
      }
      if (demo.list("members").some((member) => member.name === "Zinhle Ngwenya" && member.status === "approved-demo")) {
        const memberButton = document.querySelector('[data-action="approve-member"]');
        if (memberButton) {
          memberButton.textContent = "Approved · demo";
          memberButton.disabled = true;
        }
        const membersList = document.querySelector('.page-view[data-view="stokvels"] .member-list');
        if (membersList && !Array.from(membersList.querySelectorAll(".member-row strong")).some((name) => name.textContent === "Zinhle Ngwenya")) {
          const row = document.createElement("div");
          row.className = "member-row";
          const avatar = document.createElement("span");
          avatar.className = "avatar avatar-purple";
          avatar.textContent = "ZN";
          const details = document.createElement("span");
          details.className = "row-grow";
          const name = document.createElement("strong");
          name.textContent = "Zinhle Ngwenya";
          const role = document.createElement("small");
          role.textContent = "Member · Added in browser demo";
          details.append(name, role);
          const status = document.createElement("span");
          status.className = "verified";
          status.textContent = "Demo member";
          row.append(avatar, details, status);
          membersList.append(row);
        }
      }
      const cashReceipt = demo.list("contributions").find((record) => record.id === "member-cash-receipt" && record.status === "confirmed");
      if (cashReceipt) {
        const receiptButton = document.querySelector('[data-action="confirm-receipt"]');
        if (receiptButton) {
          receiptButton.disabled = true;
          receiptButton.textContent = "Receipt confirmed · demo";
        }
      }
      const approvalCount = document.querySelector(".page-view[data-view='approvals'] .count-pill");
      if (memberVote && approvalCount) approvalCount.textContent = "0 awaiting your review";
      demo.list("contributions").filter((record) => record.status === "confirmed-on-chain" && record.txHash).forEach((record) => {
        const transactionList = document.querySelector(".transaction-table .transaction-list");
        if (transactionList.querySelector(`[data-demo-record="${record.id}"]`)) return;
        const row = document.createElement("div");
        row.className = "transaction-row";
        row.dataset.transaction = "contribution";
        row.dataset.demoRecord = record.id;
        const title = document.createElement("strong");
        title.textContent = "Safe contribution";
        const details = document.createElement("small");
        details.textContent = `Sepolia · ${record.txHash.slice(0, 10)}…`;
        const description = document.createElement("div");
        description.className = "row-grow";
        description.append(title, details);
        const amount = document.createElement("b");
        amount.className = "amount-positive";
        amount.textContent = `+${record.amount} Mock USDT`;
        const status = document.createElement("span");
        status.className = "status status-done";
        status.textContent = "Confirmed on-chain";
        row.append(description, amount, status);
        transactionList.prepend(row);
      });
      if (demo.getPreference("notificationsRead", false)) {
        document.querySelectorAll(".notification-row.unread").forEach((row) => row.classList.remove("unread"));
      }
    } catch (error) {
      console.error("Could not load saved demo actions:", error);
      showToast(error.message || "Could not load saved demo actions.", "error");
    }
  }

  function openDialog(action) {
    const definition = dialogDefinitions[action];
    if (!definition) return;
    currentDialog = action;
    const fields = action === "receive"
      ? `<label>Your wallet address<input class="input" name="address" value="${walletAccount || ""}" readonly></label>`
      : definition.fields;
    dialogContent.innerHTML = `<div class="dialog-content"><span class="eyebrow">${definition.eyebrow}</span><h2 id="dialog-title">${definition.title}</h2><p>${definition.description}</p>${fields !== null ? `<form id="action-form"><div class="dialog-fields">${fields}</div>${definition.button ? `<button class="btn btn-gold dialog-submit" type="submit">${definition.button}</button>` : ""}<p class="dialog-disclaimer">${definition.disclaimer || "Browser-only demo · Not shared with other users"}</p></form>` : ""}</div>`;
    if (action === "switch-group") {
      try {
        const options = dialogContent.querySelector(".dialog-group-options");
        demo.list("stokvels").filter((group) => group.source === "member").forEach((group) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button-outline";
          button.dataset.selectGroup = group.id;
          const label = document.createElement("span");
          label.textContent = `${group.name} · Local demo`;
          button.append(label);
          options.append(button);
        });
      } catch (error) {
        console.error("Could not load demo groups:", error);
        showToast(error.message || "Could not load demo groups.", "error");
      }
    }
    dialog.showModal();
  }

  function copyText(text, successMessage) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      showToast("Clipboard access is unavailable in this browser.", "error");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => showToast(successMessage, "success"),
      () => showToast("Could not copy to clipboard. Please try again.", "error")
    );
  }

  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      navigate(pageButton.dataset.page);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const action = actionButton.dataset.action;
      if (action === "menu") {
        const open = sidebar.classList.toggle("is-open");
        actionButton.setAttribute("aria-expanded", String(open));
      } else if (action === "notifications") {
        navigate("notifications");
      } else if (action === "copy-address") {
        if (walletAccount) copyText(walletAccount, "Wallet address copied.");
        else showToast("Connect your wallet before copying its address.", "error");
      } else if (action === "connect-wallet") {
        connectWallet();
      } else if (action === "receive") {
        if (walletAccount && walletChainId === sepoliaChainId) openDialog("receive");
        else showToast("Connect a wallet to Sepolia before receiving Mock USDT.", "error");
      } else if (action === "copy-code") {
        copyText(document.querySelector("#invite-code").textContent, "Invitation code copied.");
      } else if (action === "generate-code") {
        const code = `KHULA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        if (!saveDemoPreference("inviteCode", code)) return;
        document.querySelector("#invite-code").textContent = code;
        showToast("New invitation code generated.", "success");
      } else if (action === "confirm-receipt") {
        try {
          const receipt = demo.list("contributions").find((item) => item.id === "member-cash-receipt");
          if (receipt) demo.update("contributions", receipt.id, { status: "confirmed" });
          else demo.add("contributions", { id: "member-cash-receipt", name: "Cash contribution", amount: 1000, status: "confirmed" });
        } catch (error) {
          console.error("Could not save receipt confirmation:", error);
          showToast(error.message || "Could not save receipt confirmation.", "error");
          return;
        }
        actionButton.disabled = true;
        actionButton.textContent = "Receipt confirmed · demo";
        showToast("Cash receipt confirmation saved in this browser demo.", "success");
      } else if (action === "approve" || action === "reject") {
        const approved = action === "approve";
        try {
          const existing = demo.list("approvals").find((item) => item.id === "member-venue-request");
          if (existing) demo.update("approvals", existing.id, { status: approved ? "approved-demo" : "rejected-demo" });
          else demo.add("approvals", { id: "member-venue-request", name: "Community hall venue deposit", status: approved ? "approved-demo" : "rejected-demo" });
        } catch (error) {
          console.error("Could not save demo approval:", error);
          showToast(error.message || "Could not save your demo vote.", "error");
          return;
        }
        const memberStatus = document.querySelector(".approval-members .member-row:nth-child(2) .approval-count");
        const approvalNote = document.querySelector(".approval-progress-heading small");
        memberStatus.textContent = approved ? "✓ Demo approval · Just now" : "Demo rejection · Just now";
        memberStatus.className = approved ? "verified" : "status status-pending";
        document.querySelector(".approval-progress-heading strong").textContent = approved ? "2/2 demo votes" : "Demo request rejected";
        approvalNote.textContent = approved ? "Browser-only vote; no Safe approval was submitted" : "Browser-only vote; no funds moved";
        document.querySelector(".approval-progress-heading .progress-track span").style.width = approved ? "100%" : "0%";
        document.querySelector(".approval-buttons").remove();
        showToast(approved ? "Your demo vote was saved in this browser." : "Your demo rejection was saved in this browser.", approved ? "success" : "info");
      } else if (action === "approve-member") {
        const member = saveDemo("members", { name: "Zinhle Ngwenya", status: "approved-demo" });
        if (!member) return;
        renderSavedDemo();
        actionButton.textContent = "Approved";
        actionButton.disabled = true;
        showToast("Zinhle was added to this browser's demo member list.", "success");
      } else if (action === "export") {
        const rows = [["Transaction", "Details", "Amount", "Status"], ["Monthly contribution", "Khula Savings Circle · 18 Jun", "+R 2,500", "Completed"], ["Community hall deposit", "Thabo Khumalo · 18 Jun", "-R 12,500", "Pending"], ["Cash contribution", "Recorded by Nomsa D. · 17 Jun", "+R 1,000", "Awaiting"], ["Loan repayment", "Future Minds · 15 Jun", "-R 1,025", "Completed"]];
        try {
          demo.list("loans").forEach((loan) => rows.push(["Loan request", loan.purpose, `R ${loan.amount}`, loan.status]));
          demo.list("bills").forEach((bill) => rows.push(["Bill", bill.name, `R ${bill.amount}`, bill.status]));
          demo.list("contributions").filter((item) => item.status === "confirmed-on-chain").forEach((item) =>
            rows.push(["Safe contribution", item.txHash, `${item.amount} Mock USDT`, "Confirmed on-chain"]));
        } catch (error) {
          console.error("Could not export saved demo transactions:", error);
          showToast(error.message || "Could not export saved demo transactions.", "error");
          return;
        }
        const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        link.download = "themba-transactions.csv";
        link.click();
        URL.revokeObjectURL(link.href);
        showToast("Transaction report exported.", "success");
      } else if (action === "mark-read") {
        document.querySelectorAll(".notification-row.unread").forEach((row) => row.classList.remove("unread"));
        try {
          if (!saveDemoPreference("notificationsRead", true)) return;
        } catch (error) {
          console.error("Could not save notification preference:", error);
          showToast(error.message || "Could not save notification preference.", "error");
          return;
        }
        showToast("Notifications marked as read.", "success");
      } else if (action === "sign-out") {
        try {
          localStorage.removeItem("themba_session");
          sessionStorage.removeItem("themba_session");
        } finally {
          window.location.href = "../login.html";
        }
      } else if (action === "disconnect") {
        clearWalletState();
        showToast("Wallet cleared from Themba. Revoke site access in your wallet settings if needed.", "success");
      } else if (action === "settle-bill") {
        openDialog("contribution");
      } else {
        openDialog(action);
      }
      return;
    }
    const groupButton = event.target.closest("[data-select-group]");
    if (groupButton) {
      const groupId = groupButton.dataset.selectGroup;
      if (!saveDemoPreference("activeGroup", groupId)) return;
      document.querySelectorAll(".group-tab").forEach((tab) => tab.classList.toggle("is-selected", tab.dataset.group === groupId));
      document.querySelector("#group-balance-value").textContent = groupId === "future" ? "R 86,200" : "R 248,500";
      document.querySelector("#group-balance-caption").textContent = groupId === "future" ? "Future Minds Investment Club · Monthly contribution R 2,000" : "Khula Savings Circle · Monthly contribution R 3,500";
      dialog.close();
      return;
    }
    const groupTab = event.target.closest(".group-tab");
    if (groupTab) {
      const groupId = groupTab.dataset.group;
      const isFuture = groupId === "future";
      const customGroup = demo.list("stokvels").find((group) => group.id === groupId);
      if (!saveDemoPreference("activeGroup", groupId)) return;
      document.querySelectorAll(".group-tab").forEach((tab) => tab.classList.toggle("is-selected", tab === groupTab));
      document.querySelector("#group-balance-value").textContent = customGroup ? "R 0" : isFuture ? "R 86,200" : "R 248,500";
      document.querySelector("#group-balance-caption").textContent = customGroup ? `${customGroup.name} · Local demo group` : isFuture ? "Future Minds Investment Club · Monthly contribution R 2,000" : "Khula Savings Circle · Monthly contribution R 3,500";
      return;
    }
    const filter = event.target.closest("[data-filter]");
    if (filter) {
      document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("is-selected", tab === filter));
      document.querySelectorAll("[data-transaction]").forEach((row) => {
        row.hidden = filter.dataset.filter !== "all" && row.dataset.transaction !== filter.dataset.filter;
      });
      return;
    }
  });

  async function submitSafeDialog(kind, form, submitButton) {
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
        saveDemo("contributions", { amount: Number(amount), status: "confirmed-on-chain", txHash: hash, walletAccount });
        dialog.close();
        showToast("Contribution sent. View on Etherscan.", "success", explorerTx(hash));
        await loadWalletBalances(window.ethereum, walletAccount);
      } else {
        await proposeTransfer(window.ethereum, walletAccount, String(form.get("address") || "").trim(), amount);
        saveDemo("events", { type: "safe-withdrawal-proposed", amount: Number(amount), walletAccount, status: "on-chain-proposal" });
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

  document.addEventListener("submit", (event) => {
    if (event.target.id === "action-form") {
      event.preventDefault();
      const action = event.submitter;
      if (action && action.textContent.includes("Copy wallet address")) {
        if (walletAccount) copyText(walletAccount, "Wallet address copied.");
        dialog.close();
        return;
      }
      if (currentDialog === "contribution" || currentDialog === "send") {
        submitSafeDialog(currentDialog, new FormData(event.target), event.submitter);
        return;
      }
      const values = new FormData(event.target);
      if (currentDialog === "loan") {
        const record = saveDemo("loans", { amount: Number(values.get("amount")), period: values.get("period"), purpose: String(values.get("purpose")).trim(), status: "pending" });
        if (!record) return;
        renderSavedDemo();
        dialog.close();
        showToast("Loan request saved in this browser demo.", "success");
        return;
      }
      if (currentDialog === "bill") {
        const record = saveDemo("bills", { name: String(values.get("name")).trim(), amount: Number(values.get("amount")), split: values.get("split"), status: "open" });
        if (!record) return;
        renderSavedDemo();
        dialog.close();
        showToast("Bill saved to the browser demo.", "success");
        return;
      }
      if (currentDialog === "create-stokvel") {
        const name = String(values.get("name")).trim();
        const record = saveDemo("stokvels", { source: "member", name, amount: Number(values.get("amount")), membership: values.get("membership"), initials: initials(name), status: "active-demo" });
        if (!record) return;
        renderSavedDemo();
        dialog.close();
        navigate("stokvels");
        showToast("Stokvel created in this browser demo.", "success");
        return;
      }
      if (currentDialog === "profile") {
        dialog.close();
        navigate("settings");
        return;
      }
      if (currentDialog === "loan-schedule") {
        dialog.close();
        showToast("Loan schedule closed.", "info");
        return;
      }
      const title = dialogContent.querySelector("#dialog-title").textContent;
      dialog.close();
      showToast(`${title} submitted. This demo does not move real funds.`, "success");
    }
    if (event.target.id === "profile-form") {
      event.preventDefault();
      const name = document.querySelector("#profile-name").value.trim();
      const email = document.querySelector("#profile-email").value.trim();
      const role = document.querySelector("#profile-role").value;
      if (!name || !email) {
        showToast("Please enter your name and email address.", "error");
        return;
      }
      updateSession({ name, email, role });
      applyProfile();
      showToast("Your profile has been updated.", "success");
    }
  });

  roleSelect.addEventListener("change", () => {
    if (roleSelect.value === "platform_admin" || roleSelect.value === "treasurer") {
      updateSession({ role: roleSelect.value });
      window.location.href = roleSelect.value === "platform_admin" ? "platform-admin-dashboard.html" : "treasurer-dashboard.html";
      return;
    }
    updateSession({ role: roleSelect.value });
    applyProfile();
    showToast(`Viewing as ${roleSelect.options[roleSelect.selectedIndex].text}.`, "success");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") sidebar.classList.remove("is-open");
  });

  renderWalletState();
  applyProfile();
  renderSavedDemo();
  const requestedAction = new URLSearchParams(window.location.search).get("open");
  if (requestedAction === "loan" || requestedAction === "bill") {
    window.history.replaceState(null, "", window.location.pathname);
    navigate(requestedAction === "loan" ? "loans" : "bills");
    openDialog(requestedAction);
  }
})();
