(() => {
  "use strict";

  const iconPaths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.7-.8-1.8-1.2-3-1.2-1.8 0-3 .9-3 2.2 0 3.2 6 1.4 6 4.5 0 1.3-1.2 2.3-3.1 2.3-1.3 0-2.5-.5-3.3-1.4M12.5 5.5v13"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7z"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 18v3h14v-3"/>',
    bank: '<path d="m3 9 9-6 9 6"/><path d="M4 10h16M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M3 18h18"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    warning: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>'
  };
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const body = iconPaths[el.dataset.icon];
    if (body) el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  });

  const pageTitles = {
    overview: "Overview",
    contributions: "Contributions",
    approvals: "Approvals",
    transactions: "Transactions",
    reports: "Reports",
    members: "Members",
    settings: "Profile & settings"
  };
  const sidebar = document.querySelector("#treasurer-sidebar");
  const toastStack = document.querySelector("#treasurer-toasts");
  const demo = window.ThembaDemo;
  let contributionFilter = "all";
  let transactionFilter = "all";

  function readSession() {
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
    const session = { ...(readSession() || {}), ...updates };
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
      notify("Your browser could not save this session update.", "error");
    }
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "TM";
  }

  function applyProfile() {
    const session = readSession() || {};
    const name = session.name || "Nokuthula Maseko";
    document.querySelectorAll("[data-user-name]").forEach((el) => { el.textContent = name; });
    document.querySelectorAll("[data-user-initials]").forEach((el) => { el.textContent = initials(name); });
    document.querySelectorAll("[data-first-name]").forEach((el) => { el.textContent = name.trim().split(/\s+/)[0] || "there"; });
    document.querySelector("#treasurer-name").value = name;
    document.querySelector("#treasurer-email").value = session.email || "treasurer@themba.demo";
  }

  function notify(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("out");
      window.setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function navigate(page) {
    if (!pageTitles[page]) return;
    document.querySelectorAll("[data-view]").forEach((view) => {
      view.classList.toggle("is-visible", view.dataset.view === page);
    });
    document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
      const active = link.dataset.page === page;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelector("#treasurer-breadcrumb").textContent = pageTitles[page];
    document.title = `${pageTitles[page]} — Themba Treasurer`;
    sidebar.classList.remove("is-open");
    document.querySelector(".mobile-menu").setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateReceiptCounts() {
    const pending = document.querySelectorAll(".ledger-row[data-contribution='needs-confirmation'] .status-pending").length;
    const badge = document.querySelector('.nav-link[data-page="contributions"] .nav-badge');
    badge.textContent = String(pending);
    badge.hidden = pending === 0;
    const overviewReceipts = document.querySelectorAll(".receipt-row:not([hidden])").length;
    const priority = document.querySelector(".receipt-card .priority-count");
    priority.textContent = `${overviewReceipts} pending`;
    priority.hidden = overviewReceipts === 0;
    applyContributionFilters();
  }

  function applyContributionFilters() {
    const query = document.querySelector("#contribution-search").value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll(".ledger-row[data-contribution]").forEach((row) => {
      const matchesFilter = contributionFilter === "all" ||
        (contributionFilter === "needs-confirmation" && row.dataset.contribution === "needs-confirmation") ||
        (contributionFilter === "outstanding" && row.dataset.contribution === "outstanding");
      const matchesSearch = !query || row.dataset.search.includes(query);
      row.hidden = !matchesFilter || !matchesSearch;
      if (!row.hidden) visible += 1;
    });
    document.querySelector("#ledger-empty").hidden = visible !== 0;
  }

  function applyTransactionFilters() {
    const query = document.querySelector("#transaction-search").value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll(".treasurer-transaction-table tbody tr").forEach((row) => {
      const matchesFilter = transactionFilter === "all" || row.dataset.kind === transactionFilter;
      const matchesSearch = !query || row.dataset.search.includes(query);
      row.hidden = !matchesFilter || !matchesSearch;
      if (!row.hidden) visible += 1;
    });
    document.querySelector("[data-visible-transactions]").textContent = String(visible);
    document.querySelector("#transaction-empty").hidden = visible !== 0;
  }

  function exportRows(rows, filename, headers) {
    const csvRows = [headers, ...rows];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    notify("Your CSV report has been downloaded.", "success");
  }

  function exportCurrentReport(reportType) {
    const page = document.querySelector(".treasurer-view.is-visible").dataset.view;
    if (reportType === "summary" || (page === "overview" && !reportType)) {
      exportRows([
        ["Opening balance", "R 226,000"],
        ["Total contributions", "R 28,500"],
        ["Total withdrawals", "R 6,000"],
        ["Closing balance", "R 248,500"]
      ], "khula-monthly-financial-summary.csv", ["June 2025 financial summary", "Amount"]);
      return;
    }
    if (reportType === "members" || page === "members") {
      const records = Array.from(document.querySelectorAll(".member-ledger-row:not([hidden])"), (row) => [
        row.querySelector(".row-grow strong").textContent,
        row.querySelector(".row-grow small").textContent,
        row.querySelector(".ledger-amount").textContent,
        row.querySelector(".status").textContent.trim()
      ]);
      exportRows(records, "khula-member-contribution-summary.csv", ["Member", "Record", "Amount", "Status"]);
      return;
    }
    if (reportType === "contributions" || page === "contributions") {
      const selector = ".ledger-row[data-contribution]:not([hidden])";
      const records = Array.from(document.querySelectorAll(selector), (row) => [
        row.querySelector(".row-grow strong").textContent,
        row.querySelector(".row-grow small").textContent,
        row.querySelector(".ledger-amount").textContent,
        row.querySelector(".status").textContent.trim()
      ]);
      exportRows(records, "khula-contribution-ledger.csv", ["Member", "Record", "Amount", "Status"]);
      return;
    }
    const transactionRows = Array.from(document.querySelectorAll(".treasurer-transaction-table tbody tr:not([hidden])"), (row) =>
      Array.from(row.cells, (cell) => cell.textContent.trim().replace(/\s+/g, " ")));
    exportRows(transactionRows, "khula-transaction-statement.csv", ["Transaction", "Date", "Reference", "Status", "Amount"]);
  }

  function confirmReceipt(button) {
    if (button.disabled) return;
    const row = button.closest("[data-receipt], .ledger-row");
    if (!row) return;
    const name = row.querySelector(".row-grow strong")?.textContent.trim();
    const amountText = row.querySelector(".ledger-amount")?.textContent ||
      row.querySelector(".row-grow")?.nextElementSibling?.textContent || "";
    const amount = Number(amountText.replace(/[^\d.]/g, ""));
    const id = `receipt-${(name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${amount}`;
    try {
      const existing = demo.list("contributions").find((record) => record.id === id);
      if (existing) demo.update("contributions", id, { status: "confirmed" });
      else demo.add("contributions", { id, name, amount, status: "confirmed", summary: `${name} cash contribution confirmed` });
    } catch (error) {
      console.error("Could not save receipt confirmation:", error);
      notify(error.message || "Could not save this receipt confirmation.", "error");
      return;
    }
    document.querySelectorAll("[data-receipt], .ledger-row[data-contribution='needs-confirmation']").forEach((candidate) => {
      const candidateName = candidate.querySelector(".row-grow strong")?.textContent.trim();
      const candidateAmountText = candidate.querySelector(".ledger-amount")?.textContent ||
        candidate.querySelector(".row-grow")?.nextElementSibling?.textContent || "";
      const candidateAmount = Number(candidateAmountText.replace(/[^\d.]/g, ""));
      if (candidateName === name && candidateAmount === amount) {
        candidate.dataset.demoReceiptId = id;
        const candidateButton = candidate.querySelector('[data-action="confirm-receipt"]');
        if (candidateButton !== button) {
          candidateButton?.replaceWith(Object.assign(document.createElement("span"), { className: "ledger-action", textContent: "Confirmed · demo" }));
          const candidateStatus = candidate.querySelector(".status");
          if (candidateStatus) {
            candidateStatus.textContent = "Confirmed · demo";
            candidateStatus.className = "status status-done";
          }
          if (candidate.matches(".ledger-row")) candidate.dataset.contribution = "paid";
        }
      }
    });
    button.disabled = true;
    button.textContent = "Confirmed · demo";
    button.classList.remove("button-outline");
    button.classList.add("receipt-confirmed");
    const status = row.querySelector(".status");
    if (status) {
      status.textContent = "Confirmed · demo";
      status.className = "status status-done";
    }
    const ledgerRow = button.closest(".ledger-row");
    if (ledgerRow) {
      ledgerRow.dataset.contribution = "paid";
      const replacement = document.createElement("span");
      replacement.className = "ledger-action";
      replacement.textContent = "Confirmed · demo";
      button.replaceWith(replacement);
    }
    updateReceiptCounts();
    notify("Cash receipt confirmation saved in this browser demo.", "success");
  }

  function respondToApproval(approved) {
    const status = document.querySelector("#treasurer-approval-status");
    const signerState = document.querySelector("#treasurer-signer-state");
    const signerStatus = document.querySelector("#treasurer-signer-status");
    const ring = document.querySelector("#treasurer-approval-ring");
    const feedback = document.querySelector("#treasurer-approval-feedback");
    const approveButton = document.querySelector('[data-action="approve-approval"]');
    const rejectButton = document.querySelector('[data-action="reject-approval"]');
    if (approveButton.disabled || rejectButton.disabled) return;
    try {
      const existing = demo.list("approvals").find((record) => record.id === "treasurer-venue-request");
      const changes = { status: approved ? "approved-demo" : "rejected-demo", name: "Community hall venue deposit" };
      if (existing) demo.update("approvals", existing.id, changes);
      else demo.add("approvals", { id: "treasurer-venue-request", ...changes });
    } catch (error) {
      console.error("Could not save demo vote:", error);
      notify(error.message || "Could not save your demo vote.", "error");
      return;
    }

    if (approved) {
      status.textContent = "2 demo votes recorded";
      signerState.textContent = "Demo approval recorded";
      signerStatus.textContent = "Demo approval";
      signerStatus.className = "status status-done";
      ring.querySelector("strong").textContent = "2/2";
      ring.style.background = "conic-gradient(#4fc38c 0 100%, #29372e 100% 100%)";
      feedback.textContent = "Your browser-only demo vote was saved. No Safe transaction was approved or submitted.";
      notify("Your demo vote was saved in this browser.", "success");
    } else {
      status.textContent = "Demo request rejected";
      signerState.textContent = "Demo rejection recorded";
      signerStatus.textContent = "Demo rejection";
      signerStatus.className = "status status-pending";
      feedback.textContent = "Your browser-only demo rejection was saved. No Safe transaction was rejected.";
      notify("Your demo rejection was saved in this browser.", "info");
    }
    approveButton.disabled = true;
    rejectButton.disabled = true;
  }

  function restoreDemoActions() {
    try {
      const confirmedReceipts = new Map(demo.list("contributions")
        .filter((record) => record.status === "confirmed")
        .map((record) => [record.id, record]));
      document.querySelectorAll("[data-receipt], .ledger-row[data-contribution='needs-confirmation']").forEach((row) => {
        const name = row.querySelector(".row-grow strong")?.textContent.trim();
        const amountText = row.querySelector(".ledger-amount")?.textContent || row.querySelector(".row-grow")?.nextElementSibling?.textContent || "";
        const amount = Number(amountText.replace(/[^\d.]/g, ""));
        const id = `receipt-${(name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${amount}`;
        if (!confirmedReceipts.has(id)) return;
        row.dataset.demoReceiptId = id;
        const status = row.querySelector(".status");
        if (status) {
          status.textContent = "Confirmed · demo";
          status.className = "status status-done";
        }
        const button = row.querySelector('[data-action="confirm-receipt"]');
        if (button) button.replaceWith(Object.assign(document.createElement("span"), { className: "ledger-action", textContent: "Confirmed · demo" }));
        if (row.matches(".ledger-row")) row.dataset.contribution = "paid";
      });

      const sentReminders = new Set(demo.list("reminders").filter((record) => record.status === "sent-demo").map((record) => record.id));
      document.querySelectorAll('[data-action="remind"]').forEach((button) => {
        const name = button.closest(".ledger-row")?.querySelector(".row-grow strong")?.textContent.trim();
        const id = `reminder-${(name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        if (sentReminders.has(id)) {
          button.textContent = "Reminder recorded";
          button.disabled = true;
        }
      });

      const approval = demo.list("approvals").find((record) => record.id === "treasurer-venue-request");
      if (approval) {
        const isApproved = approval.status === "approved-demo";
        document.querySelector("#treasurer-approval-status").textContent = isApproved ? "2 demo votes recorded" : "Demo request rejected";
        document.querySelector("#treasurer-signer-state").textContent = isApproved ? "Demo approval recorded" : "Demo rejection recorded";
        const signerStatus = document.querySelector("#treasurer-signer-status");
        signerStatus.textContent = isApproved ? "Demo approval" : "Demo rejection";
        signerStatus.className = isApproved ? "status status-done" : "status status-pending";
        document.querySelector("#treasurer-approval-ring strong").textContent = isApproved ? "2/2" : "1/2";
        document.querySelector("#treasurer-approval-feedback").textContent = `Browser-only demo ${isApproved ? "vote" : "rejection"} saved. No Safe transaction was submitted.`;
        document.querySelector('[data-action="approve-approval"]').disabled = true;
        document.querySelector('[data-action="reject-approval"]').disabled = true;
      }
    } catch (error) {
      console.error("Could not restore saved demo actions:", error);
      notify(error.message || "Could not restore saved demo actions.", "error");
    }
  }

  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      navigate(pageButton.dataset.page);
      return;
    }
    const filter = event.target.closest("[data-contribution-filter]");
    if (filter) {
      contributionFilter = filter.dataset.contributionFilter;
      document.querySelectorAll("[data-contribution-filter]").forEach((button) => button.classList.toggle("is-selected", button === filter));
      applyContributionFilters();
      return;
    }
    const transactionFilterButton = event.target.closest("[data-transaction-filter]");
    if (transactionFilterButton) {
      transactionFilter = transactionFilterButton.dataset.transactionFilter;
      document.querySelectorAll("[data-transaction-filter]").forEach((button) => button.classList.toggle("is-selected", button === transactionFilterButton));
      applyTransactionFilters();
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "menu") {
      const open = sidebar.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
    } else if (action === "stokvel") {
      navigate("members");
    } else if (action === "confirm-receipt") {
      confirmReceipt(button);
    } else if (action === "approve-approval") {
      respondToApproval(true);
    } else if (action === "reject-approval") {
      respondToApproval(false);
    } else if (action === "export") {
      exportCurrentReport(button.dataset.exportType);
    } else if (action === "remind") {
      const row = button.closest(".ledger-row");
      const memberName = row?.querySelector(".row-grow strong")?.textContent.trim();
      const reminderId = `reminder-${(memberName || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      try {
        const existing = demo.list("reminders").find((record) => record.id === reminderId);
        if (existing) demo.update("reminders", reminderId, { status: "sent-demo" });
        else demo.add("reminders", { id: reminderId, memberName, status: "sent-demo", summary: `Reminder recorded for ${memberName}` });
      } catch (error) {
        console.error("Could not save demo reminder:", error);
        notify(error.message || "Could not save this reminder.", "error");
        return;
      }
      button.textContent = "Reminder sent";
      button.disabled = true;
      notify("Reminder recorded in this browser demo; no message was sent.", "success");
    } else if (action === "review-request") {
      const request = button.closest(".transaction-row");
      const existing = request.querySelector(".request-demo-details");
      if (existing) {
        existing.remove();
        button.textContent = "Review";
        button.setAttribute("aria-expanded", "false");
      } else {
        const details = document.createElement("p");
        details.className = "request-demo-details";
        details.textContent = "Demo review: Ayanda requested R 5,000 for an emergency. This sample has no lender decision or fund transfer.";
        request.append(details);
        button.textContent = "Hide details";
        button.setAttribute("aria-expanded", "true");
      }
    } else if (action === "sign-out") {
      localStorage.removeItem("themba_session");
      sessionStorage.removeItem("themba_session");
      window.location.href = "../login.html";
    }
  });

  document.querySelector("#contribution-search").addEventListener("input", applyContributionFilters);
  document.querySelector("#member-search").addEventListener("input", () => {
    const query = document.querySelector("#member-search").value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll(".member-ledger-row").forEach((row) => {
      row.hidden = Boolean(query) && !row.dataset.search.includes(query);
      if (!row.hidden) visible += 1;
    });
    document.querySelector("#member-empty").hidden = visible !== 0;
  });
  document.querySelector("#transaction-search").addEventListener("input", applyTransactionFilters);
  document.querySelector("#treasurer-role").addEventListener("change", (event) => {
    const role = event.target.value;
    updateSession({ role });
    const destinations = { member: "members-dashboard.html", platform_admin: "platform-admin-dashboard.html", treasurer: "treasurer-dashboard.html" };
    window.location.href = destinations[role] || destinations.treasurer;
  });
  document.querySelector("#treasurer-profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#treasurer-name").value.trim();
    const email = document.querySelector("#treasurer-email").value.trim();
    if (!name || !email) {
      notify("Please enter your name and email address.", "error");
      return;
    }
    updateSession({ name, email, role: "treasurer" });
    applyProfile();
    notify("Treasurer profile updated.", "success");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") sidebar.classList.remove("is-open");
  });

  applyProfile();
  restoreDemoActions();
  updateReceiptCounts();
  applyTransactionFilters();
})();
