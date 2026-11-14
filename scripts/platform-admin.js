(() => {
  "use strict";

  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    transfer: '<path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bank: '<path d="m3 9 9-6 9 6"/><path d="M4 10h16M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M3 18h18"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 18v3h14v-3"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    warning: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const body = icons[el.dataset.icon];
    if (body) el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  });

  const pageTitles = {
    overview: "Overview",
    stokvels: "Stokvels",
    "stokvel-detail": "Stokvel Details",
    transactions: "Transactions",
    "transaction-detail": "Transaction Details",
    approvals: "Approvals",
    members: "Members",
    settings: "Settings"
  };
  const sidebar = document.querySelector("#admin-sidebar");
  const toastStack = document.querySelector("#admin-toasts");
  const demo = window.ThembaDemo;
  let activeFilter = "all";
  let activeMemberStokvel = "";
  let activeTransactionStokvel = "";
  let selectedStokvelCard = null;
  let transactionReturnView = "transactions";

  function getSession() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const value = storage.getItem("themba_session");
        if (value) return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  }

  function updateSession(updates) {
    const session = { ...(getSession() || {}), ...updates };
    for (const storage of [localStorage, sessionStorage]) {
      try {
        if (storage.getItem("themba_session")) {
          storage.setItem("themba_session", JSON.stringify(session));
          return;
        }
      } catch {
        continue;
      }
    }
    try {
      sessionStorage.setItem("themba_session", JSON.stringify(session));
    } catch {
      toast("Your browser could not save this session update.", "error");
    }
  }

  function toast(message, type = "info") {
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = message;
    toastStack.appendChild(item);
    window.setTimeout(() => {
      item.classList.add("out");
      window.setTimeout(() => item.remove(), 300);
    }, 3200);
  }

  function recordDemo(collection, record) {
    try {
      return demo.add(collection, record);
    } catch (error) {
      console.error(`Could not save demo ${collection}:`, error);
      toast(error.message || "Could not save this demo action.", "error");
      return null;
    }
  }

  function setDemoPreference(name, value) {
    try {
      demo.setPreference(name, value);
      return true;
    } catch (error) {
      console.error(`Could not save demo preference ${name}:`, error);
      toast(error.message || "Could not save this demo preference.", "error");
      return false;
    }
  }

  function renderSavedStokvels() {
    const grid = document.querySelector(".admin-stokvel-grid");
    try {
      demo.list("stokvels").filter((stokvel) => stokvel.source === "admin").forEach((stokvel) => {
        if (grid.querySelector(`[data-demo-record="${stokvel.id}"]`)) return;
        const card = document.createElement("article");
        card.className = "panel admin-stokvel-card";
        card.dataset.demoRecord = stokvel.id;
        card.dataset.stokvelId = stokvel.id;
        const header = document.createElement("div");
        const avatar = document.createElement("span");
        avatar.className = "avatar avatar-admin";
        avatar.textContent = stokvel.initials;
        const status = document.createElement("span");
        status.className = "member-status active";
        status.textContent = "Local demo";
        header.append(avatar, status);
        const title = document.createElement("h2");
        title.textContent = stokvel.name;
        const location = document.createElement("p");
        location.textContent = `${stokvel.location} · Demo savings group`;
        const metrics = document.createElement("div");
        metrics.className = "stokvel-metrics";
        const contribution = document.createElement("span");
        const label = document.createElement("small");
        label.textContent = "Monthly contribution";
        const amount = document.createElement("strong");
        amount.textContent = `R ${Number(stokvel.amount).toLocaleString("en-ZA")}`;
        contribution.append(label, amount);
        const members = document.createElement("span");
        const memberLabel = document.createElement("small");
        memberLabel.textContent = "Members";
        const count = document.createElement("strong");
        count.textContent = "1";
        members.append(memberLabel, count);
        metrics.append(contribution, members);
        const manage = document.createElement("button");
        manage.className = "button-outline full-button";
        manage.type = "button";
        manage.dataset.adminAction = "select-stokvel";
        manage.textContent = "Manage demo stokvel";
        card.append(header, title, location, metrics, manage);
        grid.append(card);
      });
    } catch (error) {
      console.error("Could not load saved demo stokvels:", error);
      toast(error.message || "Could not load saved demo stokvels.", "error");
    }
  }

  function restoreDemoState() {
    try {
      const approval = demo.list("approvals").find((record) => record.id === "admin-venue-request");
      if (approval) {
        const approved = approval.status === "approved-demo";
        document.querySelector("#approval-count").textContent = approved ? "2/2" : "1/2";
        document.querySelector(".signers-card > p").textContent = approved ? "Browser-only demo votes recorded" : "Browser-only demo request rejected";
        document.querySelector("#admin-signer-state").textContent = approved ? "Demo vote recorded" : "Demo request rejected";
        const status = document.querySelector("#admin-signer-status");
        status.textContent = approved ? "● Demo vote" : "● Demo rejection";
        status.className = approved ? "status status-done" : "status status-pending";
        document.querySelector("#approval-feedback").textContent = `Browser-only demo ${approved ? "vote" : "rejection"} saved. No Safe transaction was submitted.`;
        document.querySelector('[data-admin-action="approve-approval"]').disabled = true;
        document.querySelector('[data-admin-action="reject-approval"]').disabled = true;
      }

      const walletConnected = demo.getPreference("adminDemoWalletConnected", false);
      const walletButton = document.querySelector('[data-admin-action="connect-wallet"], [data-admin-action="disconnect-wallet"]');
      if (walletConnected && walletButton) {
        document.querySelector(".wallet-state").innerHTML = "<i></i>Demo wallet connected";
        document.querySelector(".wallet-state i").style.background = "#57c992";
        walletButton.textContent = "Disconnect wallet";
        walletButton.dataset.adminAction = "disconnect-wallet";
      }

      const currency = demo.getPreference("adminCurrency", "zar");
      const label = document.querySelector(".admin-conversion");
      const currencyButton = document.querySelector('[data-admin-action="currency"]');
      label.dataset.currency = currency;
      label.firstChild.textContent = currency === "usdt" ? "≈ 2646.58 DEMO USDT " : "≈ R 48 750,00 ";
      currencyButton.textContent = currency === "usdt" ? "Switch to ZAR" : "Switch to USDT";
      document.querySelector(".admin-stokvel-grid").dataset.currency = currency;
      if (demo.getPreference("adminBalanceHidden", false)) {
        document.querySelector(".admin-balance-value").textContent = "••••••";
        document.querySelector('[data-admin-action="toggle-balance"]').setAttribute("aria-pressed", "true");
      }
    } catch (error) {
      console.error("Could not restore saved admin demo state:", error);
      toast(error.message || "Could not restore saved admin demo state.", "error");
    }
  }

  function applyProfile() {
    const session = getSession() || {};
    const name = session.name || "Nomsa Mthembu";
    document.querySelectorAll("[data-admin-name]").forEach((el) => { el.textContent = name; });
    document.querySelectorAll("[data-admin-initials]").forEach((el) => {
      el.textContent = name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
    });
    document.querySelectorAll("[data-admin-first-name]").forEach((el) => { el.textContent = name.split(/\s+/)[0] || "there"; });
    document.querySelector("#admin-profile-name").value = name;
    document.querySelector("#admin-profile-email").value = session.email || "admin@themba.demo";
  }

  function stokvelReviewStatuses() {
    const statuses = demo.getPreference("adminStokvelReviewStatuses", {});
    if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) {
      throw new Error("Saved stokvel review status data is invalid.");
    }
    return statuses;
  }

  function isStokvelUnderReview(card, statuses = stokvelReviewStatuses()) {
    if (Object.prototype.hasOwnProperty.call(statuses, card.dataset.stokvelId)) return statuses[card.dataset.stokvelId];
    return card.dataset.stokvelBaseStatus === "Review";
  }

  function updateStokvelReviewStatus(card, underReview) {
    const status = card.querySelector(".member-status");
    const baseStatus = card.dataset.stokvelBaseStatus;
    status.classList.toggle("pending", underReview);
    status.classList.toggle("active", !underReview);
    status.textContent = underReview ? (baseStatus === "Review" ? "Review" : "Under review") : (baseStatus === "Review" ? "Verified" : baseStatus);
    if (selectedStokvelCard === card) {
      const detailStatus = document.querySelector("#stokvel-detail-status");
      detailStatus.className = `member-status ${underReview ? "pending" : "active"}`;
      detailStatus.textContent = status.textContent;
      const reviewButton = document.querySelector("#stokvel-review-button");
      reviewButton.textContent = underReview ? (baseStatus === "Review" ? "Mark as verified" : "Clear review flag") : "Flag for review";
    }
  }

  function restoreStokvelReviewStatuses() {
    try {
      const statuses = stokvelReviewStatuses();
      document.querySelectorAll(".admin-stokvel-card").forEach((card) => {
        const status = card.querySelector(".member-status");
        card.dataset.stokvelBaseStatus = status.textContent.trim();
        updateStokvelReviewStatus(card, isStokvelUnderReview(card, statuses));
      });
    } catch (error) {
      console.error("Could not restore stokvel review statuses:", error);
      toast(error.message || "Could not restore saved stokvel review statuses.", "error");
    }
  }

  function renderStokvelDetail(card) {
    selectedStokvelCard = card;
    const stokvelId = card.dataset.stokvelId;
    const name = card.querySelector("h2").textContent;
    document.querySelector("#stokvel-detail-name").textContent = name;
    document.querySelector("#stokvel-detail-location").textContent = card.querySelector("p").textContent;
    document.querySelector("#stokvel-detail-description").textContent = "Review this stokvel’s sample activity, member records and admin status.";

    const statuses = stokvelReviewStatuses();
    const liveData = Boolean(window.ThembaAdminLive);
    const underReview = !liveData && isStokvelUnderReview(card, statuses);
    const detailStatus = document.querySelector("#stokvel-detail-status");
    detailStatus.className = `member-status ${underReview ? "pending" : "active"}`;
    detailStatus.textContent = liveData
      ? card.querySelector(".member-status").textContent
      : underReview ? (card.dataset.stokvelBaseStatus === "Review" ? "Review" : "Under review") : (card.dataset.stokvelBaseStatus === "Review" ? "Verified" : card.dataset.stokvelBaseStatus);
    const reviewButton = document.querySelector("#stokvel-review-button");
    reviewButton.hidden = liveData;
    reviewButton.textContent = underReview ? (card.dataset.stokvelBaseStatus === "Review" ? "Mark as verified" : "Clear review flag") : "Flag for review";

    const metrics = document.querySelector("#stokvel-detail-metrics");
    metrics.replaceChildren(...Array.from(card.querySelectorAll(".stokvel-metrics > span"), (metric) => {
      const article = document.createElement("article");
      const label = document.createElement("span");
      label.textContent = metric.querySelector("small").textContent;
      const value = document.createElement("strong");
      value.textContent = metric.querySelector("strong").textContent;
      const note = document.createElement("small");
      note.textContent = liveData ? "Live platform data" : "Current sample";
      article.append(label, value, note);
      return article;
    }));

    const memberRows = Array.from(document.querySelectorAll("#admin-members-list .admin-member-row"))
      .filter((row) => row.dataset.stokvelId === stokvelId);
    const membersList = document.querySelector("#stokvel-detail-members");
    membersList.replaceChildren(...memberRows.map((row) => {
      const item = document.createElement("div");
      item.className = "stokvel-detail-member";
      item.append(row.querySelector(".avatar").cloneNode(true));
      const identity = document.createElement("span");
      identity.className = "row-grow";
      const memberName = document.createElement("strong");
      memberName.textContent = row.querySelector(".row-grow strong").textContent;
      const role = document.createElement("small");
      role.textContent = row.querySelector(".row-grow small").textContent;
      identity.append(memberName, role);
      const memberStatus = row.querySelector(".member-status").cloneNode(true);
      item.append(identity, memberStatus);
      return item;
    }));
    const membersEmpty = document.querySelector("#stokvel-detail-members-empty");
    membersEmpty.hidden = memberRows.length > 0;
    membersEmpty.textContent = liveData
      ? `No member records are available for ${name}.`
      : `No sample member records are available for ${name}.`;

    const transactions = Array.from(document.querySelectorAll("#admin-transactions tr"))
      .filter((row) => row.dataset.stokvelId === stokvelId);
    const transactionList = document.querySelector("#stokvel-detail-transactions");
    transactionList.replaceChildren(...transactions.map((row) => {
      const copy = row.cloneNode(true);
      copy.hidden = false;
      return copy;
    }));
    const transactionTable = transactionList.closest(".admin-table-scroll");
    transactionTable.hidden = transactions.length === 0;
    const transactionsEmpty = document.querySelector("#stokvel-detail-transactions-empty");
    transactionsEmpty.hidden = transactions.length > 0;
    transactionsEmpty.textContent = liveData
      ? `No transactions are available for ${name}.`
      : `No sample transactions are available for ${name}.`;
    const detailNote = document.querySelector("#stokvel-detail-demo-note");
    detailNote.textContent = liveData
      ? "Stokvel and transaction data are loaded from the platform database. Member flags and removals are applied through the admin API."
      : "Stokvel management data and status changes are browser-demo only and are not shared with platform members.";
  }

  function renderTransactionDetail(row) {
    const name = row.dataset.transactionDescription || row.cells[0].querySelector("strong").textContent.trim();
    const stokvel = row.dataset.stokvelName || row.cells[0].querySelector("small")?.textContent.trim() || "Stokvel";
    const date = row.dataset.transactionDate || row.cells[1].textContent.trim();
    const reference = row.dataset.transactionReference || row.cells[2].textContent.trim();
    const status = row.dataset.transactionStatus || row.cells[3].textContent.replace(/^[●\s]+/, "").trim();
    const amount = row.dataset.transactionAmount || row.cells[4].textContent.trim();

    document.querySelector("#transaction-detail-name").textContent = name;
    document.querySelector("#transaction-detail-summary").textContent = `${stokvel} · ${date}`;
    document.querySelector("#transaction-detail-stokvel").textContent = stokvel;
    document.querySelector("#transaction-detail-date").textContent = date;
    document.querySelector("#transaction-detail-reference").textContent = reference;
    document.querySelector("#transaction-detail-status").textContent = status;
    document.querySelector("#transaction-detail-amount").textContent = amount;
    document.querySelector("#transaction-detail-note").textContent = window.ThembaAdminLive
      ? "Transaction details from the platform ledger."
      : "Transaction details from the browser demo sample.";
    document.querySelector("#transaction-detail-back").textContent = transactionReturnView === "stokvel-detail"
      ? "Back to stokvel details"
      : "Back to transactions";
  }

  function navigate(page) {
    if (!pageTitles[page]) return;
    document.querySelectorAll("[data-admin-view]").forEach((view) => {
      view.classList.toggle("is-visible", view.dataset.adminView === page);
    });
    document.querySelectorAll("[data-admin-page]").forEach((link) => {
      const active = link.dataset.adminPage === page && link.classList.contains("nav-link");
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.title = `${pageTitles[page]} — Themba Platform Admin`;
    sidebar.classList.remove("is-open");
    document.querySelector(".mobile-menu").setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });
    applySearch();
  }

  function applySearch(routeToSearchResults = false) {
    const query = document.querySelector("#global-search").value.trim().toLowerCase();
    const transactionQuery = document.querySelector("#transaction-search").value.trim().toLowerCase();
    const search = `${query} ${transactionQuery}`.trim();
    let visibleTransactions = 0;
    document.querySelectorAll("#admin-transactions tr").forEach((row) => {
      const matchesType = activeFilter === "all" || row.dataset.kind === activeFilter;
      const matchesSearch = !search || row.dataset.search.includes(search) || search.split(/\s+/).every((part) => row.dataset.search.includes(part));
      const matchesStokvel = !activeTransactionStokvel || row.dataset.stokvelId === activeTransactionStokvel;
      const visible = matchesType && matchesSearch && matchesStokvel;
      row.hidden = !visible;
      if (visible) visibleTransactions += 1;
    });
    const transactionEmpty = document.querySelector("#transaction-empty");
    transactionEmpty.hidden = visibleTransactions !== 0;
    transactionEmpty.textContent = activeTransactionStokvel && visibleTransactions === 0
      ? "No sample transactions are available for this stokvel."
      : "No transactions match your search.";

    let visibleMembers = 0;
    document.querySelectorAll("#admin-members-list .admin-member-row").forEach((row) => {
      const matchesStokvel = !activeMemberStokvel || row.dataset.stokvelId === activeMemberStokvel;
      const visible = matchesStokvel && (!query || row.dataset.search.includes(query));
      row.hidden = !visible;
      if (visible) visibleMembers += 1;
    });
    const memberEmpty = document.querySelector("#member-empty");
    memberEmpty.hidden = visibleMembers !== 0;
    memberEmpty.textContent = activeMemberStokvel && visibleMembers === 0
      ? "No sample member records are available for this stokvel."
      : "No members match your search.";

    if (routeToSearchResults && query && visibleMembers === 0 && visibleTransactions > 0) navigateViewOnly("transactions");
    else if (routeToSearchResults && query && visibleMembers > 0) navigateViewOnly("members");
  }

  function closeMemberMenus(except) {
    document.querySelectorAll(".admin-member-actions").forEach((container) => {
      if (container === except) return;
      container.querySelector(".admin-member-menu").hidden = true;
      container.querySelector('[data-admin-action="member-menu"]').setAttribute("aria-expanded", "false");
    });
  }

  function prepareMemberMenus() {
    document.querySelectorAll("#admin-members-list .admin-member-row").forEach((row) => {
      const trigger = row.querySelector('[data-admin-action="member-menu"]');
      row.dataset.memberBaseStatus = row.querySelector(".member-status").classList.contains("pending") ? "pending" : "active";
      const container = document.createElement("div");
      container.className = "admin-member-actions";
      trigger.parentNode.insertBefore(container, trigger);
      container.appendChild(trigger);
      trigger.setAttribute("aria-haspopup", "menu");

      const menu = document.createElement("div");
      menu.className = "admin-member-menu";
      menu.setAttribute("role", "menu");
      menu.hidden = true;
      const flag = document.createElement("button");
      flag.type = "button";
      flag.setAttribute("role", "menuitem");
      flag.dataset.adminAction = "flag-member";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("role", "menuitem");
      remove.dataset.adminAction = "remove-member";
      remove.textContent = "Remove member";
      menu.append(flag, remove);
      container.appendChild(menu);
    });
  }

  function updateMemberStatus(row, flagged) {
    const status = row.querySelector(".member-status");
    status.classList.toggle("fraud", flagged);
    status.classList.toggle("pending", !flagged && row.dataset.memberBaseStatus === "pending");
    status.classList.toggle("active", !flagged && row.dataset.memberBaseStatus !== "pending");
    status.textContent = flagged ? "Potential fraud" : row.dataset.memberBaseStatus === "pending" ? "● Pending" : "● Active";
    const flagAction = row.querySelector('[data-admin-action="flag-member"]');
    flagAction.textContent = flagged ? "Clear fraud flag" : "Flag as potential fraud";
  }

  function saveMemberStatus(row, status) {
    const member = {
      id: row.dataset.memberId,
      name: row.querySelector(".row-grow strong").textContent,
      status,
      summary: `${status === "removed-demo" ? "Removed" : status === "potential-fraud-demo" ? "Flagged for potential fraud" : "Cleared fraud flag"}: ${row.querySelector(".row-grow strong").textContent}`
    };
    try {
      const existing = demo.list("members").find((record) => record.id === member.id);
      if (existing) demo.update("members", member.id, member);
      else demo.add("members", member);
      return true;
    } catch (error) {
      console.error("Could not save demo member action:", error);
      toast(error.message || "Could not save this member action.", "error");
      return false;
    }
  }

  function restoreMemberActions() {
    try {
      const records = demo.list("members");
      document.querySelectorAll("#admin-members-list .admin-member-row").forEach((row) => {
        const record = records.find((member) => member.id === row.dataset.memberId);
        if (record?.status === "removed-demo") row.remove();
        else updateMemberStatus(row, record?.status === "potential-fraud-demo");
      });
    } catch (error) {
      console.error("Could not restore saved member actions:", error);
      toast(error.message || "Could not restore saved member actions.", "error");
    }
    applySearch();
  }

  function navigateViewOnly(page) {
    document.querySelectorAll("[data-admin-view]").forEach((view) => {
      view.classList.toggle("is-visible", view.dataset.adminView === page);
    });
    document.querySelectorAll(".nav-link[data-admin-page]").forEach((link) => {
      const active = link.dataset.adminPage === page;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.title = `${pageTitles[page]} — Themba Platform Admin`;
  }

  function exportTransactions() {
    const rows = [["Transaction", "Group", "Date", "Reference", "Status", "Amount"]];
    document.querySelectorAll("#admin-transactions tr").forEach((row) => {
      if (row.hidden) return;
      rows.push(Array.from(row.cells).slice(0, 5).map((cell) => cell.innerText.replace(/\s+/g, " ").trim()));
    });
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = url;
    link.download = "themba-platform-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast("Transaction statement exported.", "success");
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".admin-member-actions")) closeMemberMenus();
    const pageLink = event.target.closest("[data-admin-page]");
    if (pageLink) {
      if (pageLink.dataset.adminPage === "members") {
        activeMemberStokvel = "";
        document.querySelector("#members-stokvel-name").textContent = "Ubuntu Wealth Circle";
        document.querySelector("#members-context").textContent = "Manage members and review potential fraud. Changes are saved in this browser demo only.";
      } else if (pageLink.dataset.adminPage === "transactions") {
        activeTransactionStokvel = "";
        document.querySelector("#transaction-context").textContent = "Every movement, recorded and transparent.";
      } else if (pageLink.dataset.adminPage === "stokvels") {
        activeMemberStokvel = "";
        activeTransactionStokvel = "";
      }
      navigate(pageLink.dataset.adminPage);
      return;
    }
    const filter = event.target.closest("[data-filter]");
    if (filter) {
      activeFilter = filter.dataset.filter;
      document.querySelectorAll(".admin-filters button").forEach((button) => button.classList.toggle("is-selected", button === filter));
      applySearch();
      return;
    }
    const actionButton = event.target.closest("[data-admin-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.adminAction;
    if (action === "menu") {
      const isOpen = sidebar.classList.toggle("is-open");
      actionButton.setAttribute("aria-expanded", String(isOpen));
    } else if (action === "switch-stokvel") {
      navigate("stokvels");
    } else if (action === "export") {
      exportTransactions();
    } else if (action === "approve-approval") {
      try {
        const approval = demo.list("approvals").find((record) => record.id === "admin-venue-request");
        if (approval) demo.update("approvals", approval.id, { status: "approved-demo" });
        else demo.add("approvals", { id: "admin-venue-request", name: "Community hall deposit", status: "approved-demo" });
      } catch (error) {
        console.error("Could not save demo approval:", error);
        toast(error.message || "Could not save your demo vote.", "error");
        return;
      }
      document.querySelector("#approval-count").textContent = "2/2";
      document.querySelector(".signers-card > p").textContent = "Browser-only demo votes recorded";
      document.querySelector(".approval-ring").style.background = "conic-gradient(#4fc38c 0 100%, #29372e 100% 100%)";
      document.querySelector("#admin-signer-state").textContent = "Demo vote recorded";
      const status = document.querySelector("#admin-signer-status");
      status.textContent = "● Demo vote";
      status.className = "status status-done";
      document.querySelector("#approval-feedback").textContent = "Your browser-only demo vote was saved. No Safe transaction was approved or submitted.";
      actionButton.disabled = true;
      document.querySelector('[data-admin-action="reject-approval"]').disabled = true;
      toast("Your demo vote was saved in this browser.", "success");
    } else if (action === "reject-approval") {
      try {
        const approval = demo.list("approvals").find((record) => record.id === "admin-venue-request");
        if (approval) demo.update("approvals", approval.id, { status: "rejected-demo" });
        else demo.add("approvals", { id: "admin-venue-request", name: "Community hall deposit", status: "rejected-demo" });
      } catch (error) {
        console.error("Could not save demo rejection:", error);
        toast(error.message || "Could not save your demo rejection.", "error");
        return;
      }
      document.querySelector("#approval-feedback").textContent = "Your browser-only demo rejection was saved. No Safe transaction was rejected.";
      document.querySelector("#admin-signer-state").textContent = "Demo rejection recorded";
      actionButton.disabled = true;
      document.querySelector('[data-admin-action="approve-approval"]').disabled = true;
      toast("Your demo rejection was saved in this browser.", "info");
    } else if (action === "copy-invite") {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        toast("Clipboard access is unavailable in this browser.", "error");
      } else {
        navigator.clipboard.writeText("UBUNTU-8X4P").then(
          () => toast("Invite code UBUNTU-8X4P copied.", "success"),
          () => toast("Could not copy the invite code.", "error")
        );
      }
    } else if (action === "toggle-balance") {
      const balance = document.querySelector(".admin-balance-value");
      const hidden = balance.textContent !== "••••••";
      balance.textContent = hidden ? "••••••" : balance.dataset.balance;
      actionButton.setAttribute("aria-pressed", String(hidden));
      setDemoPreference("adminBalanceHidden", hidden);
    } else if (action === "currency") {
      const label = document.querySelector(".admin-conversion");
      const isZar = label.dataset.currency !== "usdt";
      label.dataset.currency = isZar ? "usdt" : "zar";
      label.firstChild.textContent = isZar ? "≈ R 48 750,00 " : "≈ 2646.58 DEMO USDT ";
      actionButton.textContent = isZar ? "Switch to ZAR" : "Switch to USDT";
      setDemoPreference("adminCurrency", label.dataset.currency);
    } else if (action === "connect-wallet") {
      if (!setDemoPreference("adminDemoWalletConnected", true)) return;
      document.querySelector(".wallet-state").innerHTML = "<i></i>Demo wallet connected";
      document.querySelector(".wallet-state i").style.background = "#57c992";
      actionButton.textContent = "Disconnect wallet";
      actionButton.dataset.adminAction = "disconnect-wallet";
      toast("Demo wallet connected. No real assets are linked.", "success");
    } else if (action === "disconnect-wallet") {
      if (!setDemoPreference("adminDemoWalletConnected", false)) return;
      document.querySelector(".wallet-state").innerHTML = "<i></i>Wallet not connected";
      document.querySelector(".wallet-state i").style.background = "#dd8542";
      actionButton.innerHTML = `Connect wallet <span data-icon="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons.arrow}</svg></span>`;
      actionButton.dataset.adminAction = "connect-wallet";
      toast("Demo wallet disconnected.", "success");
    } else if (action === "sign-out") {
      localStorage.removeItem("themba_session");
      sessionStorage.removeItem("themba_session");
      window.location.href = "../login.html";
    } else if (action === "member-menu") {
      const container = actionButton.closest(".admin-member-actions");
      const menu = container.querySelector(".admin-member-menu");
      const isOpen = menu.hidden;
      closeMemberMenus(container);
      menu.hidden = !isOpen;
      actionButton.setAttribute("aria-expanded", String(isOpen));
    } else if (action === "flag-member") {
      const row = actionButton.closest(".admin-member-row");
      const flagged = !row.querySelector(".member-status").classList.contains("fraud");
      if (!saveMemberStatus(row, flagged ? "potential-fraud-demo" : "active-demo")) return;
      updateMemberStatus(row, flagged);
      closeMemberMenus();
      toast(flagged ? "Member flagged for potential fraud in this browser demo." : "Fraud flag cleared in this browser demo.", "success");
    } else if (action === "remove-member") {
      const row = actionButton.closest(".admin-member-row");
      const name = row.querySelector(".row-grow strong").textContent;
      if (!window.confirm(`Remove ${name} from the displayed demo member list? This only affects this browser's demo data.`)) return;
      if (!saveMemberStatus(row, "removed-demo")) return;
      row.remove();
      closeMemberMenus();
      applySearch();
      toast(`${name} removed from the browser demo member list.`, "success");
    } else if (action === "back-from-transaction-detail") {
      navigate(transactionReturnView);
    } else if (action === "transaction-detail") {
      const row = actionButton.closest("tr");
      const currentView = document.querySelector(".admin-view.is-visible");
      transactionReturnView = currentView && currentView.dataset.adminView === "stokvel-detail"
        ? "stokvel-detail"
        : "transactions";
      renderTransactionDetail(row);
      navigate("transaction-detail");
    } else if (action === "create-stokvel" || action === "select-stokvel") {
      if (action === "create-stokvel") {
        const form = document.querySelector("#admin-create-stokvel-form");
        form.hidden = !form.hidden;
        if (!form.hidden) {
          navigate("stokvels");
          form.querySelector('[name="name"]').focus();
        }
      } else {
        const card = actionButton.closest(".admin-stokvel-card");
        try {
          renderStokvelDetail(card);
          navigate("stokvel-detail");
        } catch (error) {
          console.error("Could not open stokvel details:", error);
          toast(error.message || "Could not open stokvel details.", "error");
        }
      }
    } else if (action === "manage-stokvel-members") {
      if (!selectedStokvelCard) return;
      const name = selectedStokvelCard.querySelector("h2").textContent;
      activeMemberStokvel = selectedStokvelCard.dataset.stokvelId;
      document.querySelector("#members-stokvel-name").textContent = name;
      document.querySelector("#members-context").textContent = `Manage ${name} members and review potential fraud. Changes are saved in this browser demo only.`;
      navigate("members");
    } else if (action === "view-stokvel-transactions") {
      if (!selectedStokvelCard) return;
      const name = selectedStokvelCard.querySelector("h2").textContent;
      activeTransactionStokvel = selectedStokvelCard.dataset.stokvelId;
      document.querySelector("#transaction-context").textContent = `Showing sample transactions for ${name}.`;
      navigate("transactions");
    } else if (action === "toggle-stokvel-review") {
      if (!selectedStokvelCard) return;
      try {
        const statuses = stokvelReviewStatuses();
        const underReview = !isStokvelUnderReview(selectedStokvelCard, statuses);
        statuses[selectedStokvelCard.dataset.stokvelId] = underReview;
        if (!setDemoPreference("adminStokvelReviewStatuses", statuses)) return;
        updateStokvelReviewStatus(selectedStokvelCard, underReview);
        toast(underReview ? "Stokvel flagged for review in this browser demo." : "Stokvel marked verified in this browser demo.", "success");
      } catch (error) {
        console.error("Could not update stokvel review status:", error);
        toast(error.message || "Could not update stokvel review status.", "error");
      }
    } else {
      const actionLabel = actionButton.querySelector(".row-grow strong")?.textContent || actionButton.textContent.trim();
      console.warn(`No demo handler is registered for admin action: ${action}`);
      toast(`${actionLabel} is not available in the demo yet.`, "error");
    }
  });

  document.querySelector("#global-search").addEventListener("input", () => applySearch(true));
  document.querySelector("#transaction-search").addEventListener("input", applySearch);
  document.querySelector("#admin-role-select").addEventListener("change", (event) => {
    const role = event.target.value;
    updateSession({ role });
    const destinations = {
      member: "members-dashboard.html",
      treasurer: "treasurer-dashboard.html",
      platform_admin: "platform-admin-dashboard.html",
      insurance: "insurance-dashboard.html"
    };
    window.location.href = destinations[role] || destinations.platform_admin;
  });

  document.querySelector("#admin-profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#admin-profile-name").value.trim();
    const email = document.querySelector("#admin-profile-email").value.trim();
    if (!name || !email) {
      toast("Please enter your name and email address.", "error");
      return;
    }
    updateSession({ name, email, role: "platform_admin" });
    applyProfile();
    toast("Administrator profile updated.", "success");
  });

  document.querySelector("#admin-create-stokvel-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name")).trim();
    const location = String(formData.get("location")).trim();
    const amount = Number(formData.get("amount"));
    const stokvel = recordDemo("stokvels", {
      source: "admin",
      name,
      location,
      amount,
      initials: name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase(),
      status: "active-demo"
    });
    if (!stokvel) return;
    renderSavedStokvels();
    event.currentTarget.reset();
    event.currentTarget.hidden = true;
    toast("Demo stokvel saved in this browser only.", "success");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      sidebar.classList.remove("is-open");
      closeMemberMenus();
    }
  });

  applyProfile();
  prepareMemberMenus();
  restoreMemberActions();
  renderSavedStokvels();
  restoreStokvelReviewStatuses();
  restoreDemoState();
  applySearch();
})();
