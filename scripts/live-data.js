/* Themba · live data for the dashboards (pot balance, contributions, approvals).
   Runs only when Supabase is configured AND the user is signed in; otherwise the demo pages stay untouched.
   Works on both members-dashboard.html and treasurer-dashboard.html.
   All text is inserted with textContent (never innerHTML), so member-entered names cannot inject HTML. */
(async () => {
    "use strict";
    const sb = window.ThembaSupabase, api = window.ThembaAPI;
    if (!sb || !api) return;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const VIEW = (n) => $(`[data-view="${n}"]`);
    const TREAS = !!$(".treasurer-view");
    const S = { me: session.user.id, stokvels: [], sid: null, st: null, role: "member", signer: false, members: [], names: {}, contribs: [], bills: [], loans: [], terms: [], claims: [], requests: [], alerts: [], balance: 0 };

    /* ---------- tiny helpers ---------- */
    function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function kids(el, ...c) { c.flat().filter(Boolean).forEach((x) => el.append(x)); return el; }
    function btn(label, cls, fn) { const b = h("button", cls, label); b.type = "button"; b.addEventListener("click", async () => { b.disabled = true; try { await fn(); } finally { b.disabled = false; } }); return b; }
    const num = (n) => Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 2 });
    const usdt = (n) => num(n) + " USDT";
    const initials = (n) => (n || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    const when = (iso) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
    const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; };
    const monthLabel = () => new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
    const name = (id) => S.names[id] || "Member";
    const isAdmin = () => S.role === "treasurer" || S.role === "chairperson";

    function toast(msg, type = "info") {
        let st = $("#toasts") || $(".toast-stack");
        if (!st) { st = h("div", "toast-stack"); st.id = "toasts"; document.body.append(st); }
        const t = h("div", "toast " + type, msg); st.append(t);
        setTimeout(() => t.classList.add("out"), 4800); setTimeout(() => t.remove(), 5200);
    }
    async function run(fn, ok) {
        try { const r = await fn(); if (ok) toast(ok, "success"); await refresh(); return r; }
        catch (e) { toast(e.message || "Something went wrong", "error"); }
    }
    function slot(view, key) {
        const v = VIEW(view); if (!v) return null;
        let s = $(`.live-slot[data-live="${key}"]`, v);
        if (!s) { s = h("div", "live-slot"); s.dataset.live = key; const first = v.firstElementChild; first ? first.after(s) : v.append(s); }
        return s;
    }
    function openForm({ eyebrow, title, desc, fields, submit, onSubmit }) {
        let dlg = $("#live-dialog");
        if (!dlg) {
            dlg = h("dialog", "action-dialog"); dlg.id = "live-dialog";
            const cf = h("form", "dialog-close-form"); cf.method = "dialog";
            const x = h("button", "dialog-close", "×"); x.setAttribute("aria-label", "Close dialog"); cf.append(x);
            dlg.append(cf, h("div")); document.body.append(dlg);
        }
        const form = h("form"), fs = h("div", "dialog-fields");
        fields.forEach((f) => {
            if (f.custom) { fs.append(f.custom(fs)); return; }
            const l = h("label", null, f.label); let inp;
            if (f.options) { inp = h("select", "select"); f.options.forEach(([v, t]) => { const o = h("option", null, t); o.value = v; inp.append(o); }); }
            else { inp = h("input", "input"); inp.type = f.type || "text"; if (f.step) inp.step = f.step; if (f.min != null) inp.min = f.min; if (f.placeholder) inp.placeholder = f.placeholder; if (f.pattern) inp.pattern = f.pattern; }
            inp.name = f.name; if (f.value != null) inp.value = f.value; inp.required = f.required !== false; l.append(inp); fs.append(l);
        });
        const go = h("button", "btn btn-gold full-button", submit); go.type = "submit"; form.append(fs, go);
        form.addEventListener("submit", async (e) => {
            e.preventDefault(); go.disabled = true;
            try { await onSubmit(Object.fromEntries(new FormData(form))); dlg.close(); await refresh(); } catch (err) { toast(err.message, "error"); } finally { go.disabled = false; }
        });
        const c = dlg.lastElementChild; c.replaceChildren(kids(h("div", "dialog-content"), h("span", "eyebrow", eyebrow), h("h2", null, title), h("p", null, desc), form));
        dlg.showModal();
    }

    /* ---------- load ---------- */
    async function loadStokvels() {
        S.stokvels = (await api.myStokvels()).filter((m) => m.stokvels);
        if (!S.stokvels.length) { S.sid = null; return; }
        const saved = localStorage.getItem("themba_live_stokvel");
        const pick = S.stokvels.find((m) => m.stokvels.id === saved) || S.stokvels[0];
        S.sid = pick.stokvels.id; S.st = pick.stokvels; S.role = pick.role; S.signer = pick.is_signer;
    }
    async function loadData() {
        const [members, contribs, requests, balance, alerts, bills, loans, terms, claims] = await Promise.all([api.members(S.sid), api.contributions(S.sid), api.requests(S.sid), api.balance(S.sid), api.alerts(S.sid), api.bills(S.sid), api.loans(S.sid), api.loanTerms(), api.repaymentClaims(S.sid)]);
        Object.assign(S, { members, contribs, requests, balance, alerts, bills, loans, terms, claims });
        S.names = Object.fromEntries(members.map((m) => [m.user_id, (m.profiles && m.profiles.full_name) || "Member"]));
    }
    let busy = false, again = false;
    async function refresh() {
        if (busy) { again = true; return; }
        busy = true;
        try { await loadStokvels(); if (S.sid) await loadData(); render(); } catch (e) { console.error(e); toast(e.message || "Could not load live data", "error"); }
        busy = false; if (again) { again = false; refresh(); }
    }

    /* ---------- derived numbers ---------- */
    function stats() {
        const monthly = Number(S.st.monthly_contribution || 0), month = monthStart();
        const paidBy = {}; let collected = 0;
        S.contribs.filter((c) => c.period === month && c.status === "confirmed").forEach((c) => { collected += Number(c.amount); paidBy[c.user_id] = (paidBy[c.user_id] || 0) + Number(c.amount); });
        const target = monthly * S.members.length;
        const complete = S.members.filter((m) => (paidBy[m.user_id] || 0) >= Math.max(monthly, 0.01));
        const pending = S.contribs.filter((c) => c.status === "pending_confirmation");
        const toVote = S.requests.filter((r) => r.status === "pending" && S.signer && r.requested_by !== S.me && !(r.approvals || []).some((a) => a.approver_id === S.me));
        return { monthly, collected, target, pct: target ? Math.min(100, Math.round((collected / target) * 100)) : 0, paidBy, complete, pending, toVote, outstanding: Math.max(target - collected, 0) };
    }
    function setStat(el, label, value, small, pct) {
        if (!el) return;
        const l = $(".micro-label", el) || $("span", el); if (label && l) l.textContent = label;
        const s = $("strong", el); if (s) s.textContent = value;
        const sm = $("small", el); if (sm && small != null) sm.textContent = small;
        const bar = $(".progress-track span", el); if (bar && pct != null) bar.style.width = pct + "%";
    }

    /* ---------- render ---------- */
    function render() {
        if (!S.sid) return renderOnboarding();
        $$(".live-slot[data-live='onboard']").forEach((e) => e.remove());
        const st = stats();
        renderBalance(st); renderContributions(st); renderApprovals(st); renderBills(); renderLoans(); renderOverviewStats(st);
    }

    function renderOnboarding() {
        ["overview", "contributions", "approvals", "bills", "loans"].forEach((v) => {
            const s = slot(v, "onboard"); if (!s) return; s.replaceChildren();
            const p = h("section", "panel"); p.style.padding = "22px";
            kids(p, h("h2", null, "Join or create your stokvel"), h("p", null, "Your account is live, but you are not in a stokvel yet. Create one (you become its treasurer) or join with an invite code from your treasurer."));
            const row = h("div", "approval-buttons");
            row.append(btn("Join with invite code", "button-outline", async () => openForm({ eyebrow: "Join", title: "Invite code", desc: "Paste the code your treasurer sent you. It only works with the email you signed up with.", fields: [{ name: "token", label: "Invite code", placeholder: "xxxxxxxx-xxxx-…" }], submit: "Join stokvel", onSubmit: async (v) => { await api.acceptInvite(v.token.trim()); toast("You joined the stokvel", "success"); } })));
            row.append(btn("Create a stokvel", "btn btn-gold", async () => openForm({ eyebrow: "New stokvel", title: "Create your stokvel", desc: "You will be its treasurer and first signer. You can invite members afterwards.", fields: [{ name: "name", label: "Stokvel name" }, { name: "monthly", label: "Monthly contribution (USDT)", type: "number", step: "0.01", min: 0, value: 100 }], submit: "Create stokvel", onSubmit: async (v) => { await api.createStokvel(v.name, Number(v.monthly)); toast("Stokvel created", "success"); } })));
            s.append(kids(p, row));
        });
    }

    function renderBalance(st) {
        const hero = $(".balance-copy");
        if (hero) {
            const lab = $(".micro-label", hero); if (lab) lab.textContent = "Group pot (shared USDT wallet)";
            const pill = $(".live-pill", hero); if (pill && pill.lastChild) pill.lastChild.textContent = "Live";
            const v = $(".balance-value", hero); if (v) v.textContent = usdt(S.balance);
            const c = $(".conversion", hero); if (c) c.textContent = `${S.st.name} · ${S.members.length} members · from the permanent ledger`;
            const cap = $(".coin-caption"); if (cap) cap.textContent = "Every unit is in the ledger";
        }
        const gv = $("#group-balance-value"); if (gv) gv.textContent = usdt(S.balance);
        const gc = $("#group-balance-caption"); if (gc) gc.textContent = `${S.st.name} · Monthly contribution ${usdt(st.monthly)}`;
        const k = TREAS && VIEW("overview") ? $$(".treasurer-kpis article", VIEW("overview")) : [];
        if (k.length) {
            setStat(k[0], null, usdt(st.collected), `${st.pct}% of ${usdt(st.target)} target`, st.pct);
            setStat(k[1], null, usdt(S.balance), `Across ${S.members.length} members`);
            setStat(k[2], null, usdt(st.outstanding), `${S.members.length - st.complete.length} members to follow up`);
            setStat(k[3], null, `${st.toVote.length + st.pending.length} items`, `${st.pending.length} cash receipts · ${st.toVote.length} approvals`);
        }
        const welcome = $(".treasurer-welcome p, .welcome-row p"); if (welcome) welcome.textContent = `Live data for ${S.st.name}. Every figure comes from the permanent ledger.`;
    }

    function contribRow(c) {
        const row = h("div", "transaction-row");
        const st = c.status === "confirmed" ? ["Confirmed", "status-done"] : c.status === "rejected" ? ["Disputed", "status-pending"] : ["Awaiting member", "status-pending"];
        kids(row, h("span", "transaction-icon icon-positive", "↓"), kids(h("div", "row-grow"), h("strong", null, `${name(c.user_id)} · ${c.method === "usdt" ? "USDT" : "Cash"} contribution`), h("small", null, `${when(c.created_at)}${c.tx_hash ? " · " + c.tx_hash.slice(0, 10) + "…" : ""}${c.method === "cash" ? " · logged by " + name(c.logged_by) : ""}`)), h("b", "amount-positive", "+" + usdt(c.amount)), h("span", "status " + st[1], st[0]));
        return row;
    }

    function renderContributions(st) {
        const v = VIEW("contributions"); if (!v) return;
        if (!TREAS) {
            const cards = $$(".three-stats .stat-card", v);
            const mine = st.paidBy[S.me] || 0;
            setStat(cards[0], null, usdt(st.collected), `${st.pct}% of group target`, st.pct);
            setStat(cards[1], null, usdt(mine), mine >= st.monthly ? "Your share is complete" : `${usdt(Math.max(st.monthly - mine, 0))} remaining`);
            setStat(cards[2], null, `${st.complete.length} / ${S.members.length}`, `${S.members.length - st.complete.length} outstanding`);
            const stat = $(".notice-warning", v); if (stat && !stat.classList.contains("live-notice")) stat.style.display = "none";
            const box = slot("contributions", "pending"); box.replaceChildren();
            st.pending.filter((c) => c.user_id === S.me).forEach((c) => {
                const n = h("div", "notice notice-warning live-notice");
                const t = kids(h("div"), h("strong", null, "Cash contribution awaiting your confirmation"), h("p", null, `${name(c.logged_by)} recorded ${usdt(c.amount)} cash from you. It only counts once you confirm it.`));
                kids(n, t, btn("Confirm receipt", "button-outline", () => run(() => api.confirmContribution(c.id, true), "Confirmed and added to the ledger")), btn("Dispute", "text-link", () => run(() => api.confirmContribution(c.id, false), "Marked as disputed")));
                box.append(n);
            });
            const list = $(".page-table .transaction-list", v), hd = $(".page-table .panel-heading p", v);
            if (hd) hd.textContent = `${S.st.name} · ${monthLabel()}`;
            if (list) { list.replaceChildren(...(S.contribs.length ? S.contribs.map(contribRow) : [h("p", "empty-state", "No contributions yet. Make the first one.")])); }
        } else {
            const k = $$(".contribution-kpis article", v);
            setStat(k[0], null, usdt(st.collected), `${st.pct}% of group target`);
            setStat(k[1], "Awaiting member confirmation", usdt(st.pending.reduce((a, c) => a + Number(c.amount), 0)), `${st.pending.length} cash payments`);
            setStat(k[2], null, usdt(st.outstanding), `${S.members.length - st.complete.length} members`);
            const rows = [];
            const mk = (cls, who, sub, amt, status, kind, action) => {
                const r = h("article", "ledger-row"); r.dataset.contribution = kind; r.dataset.search = (who + " " + status).toLowerCase();
                kids(r, h("span", "avatar", initials(who)), kids(h("span", "row-grow"), h("strong", null, who), h("small", null, sub)), h("b", "ledger-amount", usdt(amt)), h("span", "status " + cls, status), action || h("span", "ledger-action", kind === "paid" ? "Verified" : ""));
                return r;
            };
            S.contribs.forEach((c) => rows.push(mk(c.status === "confirmed" ? "status-done" : "status-pending", name(c.user_id), `${c.method === "usdt" ? "USDT" : "Cash"} · ${when(c.created_at)}`, c.amount, c.status === "confirmed" ? "Paid" : c.status === "rejected" ? "Disputed" : "Awaiting member", c.status === "confirmed" ? "paid" : "needs-confirmation")));
            S.members.filter((m) => !st.complete.includes(m) && !st.pending.some((c) => c.user_id === m.user_id)).forEach((m) => rows.push(mk("status-pending", name(m.user_id), `Monthly contribution · ${usdt(st.monthly)}`, Math.max(st.monthly - (st.paidBy[m.user_id] || 0), 0), "Outstanding", "outstanding", btn("Log cash", "text-link", async () => logCash(m.user_id)))));
            const list = $(".ledger-list", v); if (list) list.replaceChildren(...rows);
            const hd = $(".ledger-heading h2", v); if (hd) hd.textContent = `${monthLabel()} contribution ledger`;
            const hp = $(".ledger-heading p", v); if (hp) hp.textContent = `${S.st.name} · Monthly target ${usdt(st.target)}`;
            const cnt = { "needs-confirmation": rows.filter((r) => r.dataset.contribution === "needs-confirmation").length, outstanding: rows.filter((r) => r.dataset.contribution === "outstanding").length };
            Object.entries(cnt).forEach(([f, n]) => { const sp = $(`[data-contribution-filter="${f}"] span`, v); if (sp) sp.textContent = n; });
            renderBillCash(); renderLoanAdmin();
            const act = slot("contributions", "actions"); act.replaceChildren(btn("Log a cash contribution", "btn btn-gold", () => logCash()));
            // overview receipt card -> cash waiting for the member to confirm
            const rc = $(".receipt-card");
            if (rc) {
                const t = $("h2", rc); if (t) t.textContent = "Cash awaiting member confirmation";
                const pc = $(".priority-count", rc); if (pc) pc.textContent = `${st.pending.length} pending`;
                const rl = $(".receipt-list", rc);
                if (rl) rl.replaceChildren(...(st.pending.length ? st.pending.map((c) => { const a = h("article", "receipt-row"); kids(a, h("span", "transaction-icon icon-positive", "↓"), kids(h("div", "row-grow"), h("strong", null, name(c.user_id)), h("small", null, `Logged ${when(c.created_at)} · waiting for the member`)), h("b", null, usdt(c.amount)), h("span", "status status-pending", "Waiting")); return a; }) : [h("p", "empty-state", "No cash waiting for confirmation.")]));
            }
        }
    }

    function logCash(preselect) {
        openForm({
            eyebrow: "Cash", title: "Log a cash contribution", desc: "It only counts once the member confirms it in their own app.", submit: "Log cash",
            fields: [{ name: "member", label: "Member", options: S.members.map((m) => [m.user_id, name(m.user_id)]), value: preselect }, { name: "amount", label: "Amount (USDT)", type: "number", step: "0.01", min: 0.01, value: S.st.monthly_contribution }],
            onSubmit: async (v) => { await api.logCashContribution(S.sid, v.member, Number(v.amount), monthStart()); toast("Logged. Waiting for the member to confirm.", "success"); }
        });
    }
    function makeContribution() {
        openForm({
            eyebrow: "USDT", title: "Record a USDT contribution", desc: "Paste the transaction hash of your payment to the group wallet. Each hash can only be used once.", submit: "Add to ledger",
            fields: [{ name: "amount", label: "Amount (USDT)", type: "number", step: "0.01", min: 0.01, value: S.st.monthly_contribution }, { name: "tx", label: "Transaction hash", placeholder: "0x…", pattern: "0x[0-9a-fA-F]{64}" }],
            onSubmit: async (v) => { await api.recordUsdtContribution(S.sid, Number(v.amount), monthStart(), v.tx.trim()); toast("Contribution added to the ledger", "success"); }
        });
    }

    /* ---------- approvals ---------- */
    const KIND = { withdrawal: "Withdrawal request", loan: "Loan request", bill: "Bill payout" };
    const STATUS = { pending: ["Pending", "status-pending"], approved: ["Approved · ready to release", "status-done"], executed: ["Released", "status-done"], rejected: ["Rejected", "status-pending"] };

    function requestCard(r) {
        const votes = r.approvals || [], yes = votes.filter((a) => a.decision === "approve").length;
        const card = h("section", "panel approval-detail live-request");
        const sts = STATUS[r.status];
        const head = kids(h("div", "approval-head"), kids(h("div"), h("span", "status " + sts[1], KIND[r.kind] + " · " + sts[0]), h("h2", null, r.description), h("p", null, `Requested by ${name(r.requested_by)} · ${when(r.created_at)}`)), kids(h("div", "requested-amount"), h("small", null, "Requested amount"), h("strong", null, usdt(r.amount))));
        const prog = kids(h("div", "approval-progress-heading"), kids(h("div"), h("strong", null, `${yes}/${r.required_approvals} approved`), h("small", null, r.status === "executed" ? "Funds released and recorded in the ledger" : yes >= r.required_approvals ? "Enough approvals. A signer can release the funds." : `${Math.max(r.required_approvals - yes, 0)} more approval(s) required. Nobody can approve their own request.`)), kids(h("div", "progress-track"), (() => { const b = h("span"); b.style.width = Math.min(100, (yes / r.required_approvals) * 100) + "%"; return b; })()));
        const list = h("div", "member-list approval-members");
        const people = S.members.filter((m) => m.is_signer || m.user_id === r.requested_by);
        people.forEach((m) => {
            const vote = votes.find((a) => a.approver_id === m.user_id);
            let label, cls;
            if (m.user_id === r.requested_by) { label = "Requester · cannot approve"; cls = "status status-done"; }
            else if (vote) { label = vote.decision === "approve" ? "✓ Approved" : "✕ Rejected"; cls = "verified"; }
            else { label = r.status === "pending" ? "Awaiting decision" : "No vote"; cls = "approval-count"; }
            list.append(kids(h("div", "member-row"), h("span", "avatar", initials(name(m.user_id))), kids(h("span", "row-grow"), h("strong", null, name(m.user_id) + (m.user_id === S.me ? " (you)" : "")), h("small", null, m.role === "member" ? (m.is_signer ? "Authorised signer" : "Member") : m.role[0].toUpperCase() + m.role.slice(1) + (m.is_signer ? " · signer" : ""))), h("span", cls, label)));
        });
        const actions = h("div", "approval-buttons");
        const canVote = r.status === "pending" && S.signer && r.requested_by !== S.me && !votes.some((a) => a.approver_id === S.me);
        if (canVote) { actions.append(btn("Reject", "btn btn-danger", () => run(() => api.castApproval(r.id, "reject"), "Your rejection was recorded")), btn("Approve", "btn btn-gold", () => run(() => api.castApproval(r.id, "approve"), "Your approval was recorded"))); }
        if (r.status === "approved" && S.signer) actions.append(btn("Release funds", "btn btn-gold", () => release(r)));
        if (r.status === "pending") actions.append(btn("Try to release now", "button-outline", () => release(r)));
        card.append(head, prog, list); if (actions.children.length) card.append(actions);
        return card;
    }
    async function release(r) {
        try {
            const res = await api.executeRequest(r.id, null);
            if (res.ok) toast("Funds released and recorded in the ledger", "success");
            else if (res.reason === "insufficient_funds") toast("Not enough in the pot for this request", "error");
            else if (res.reason === "not_a_signer") toast("Blocked: only authorised signers can release funds. Every member was alerted.", "error");
            else toast(`Blocked: ${res.approvals} of ${res.required} approvals. Every member was alerted.`, "error");
        } catch (e) { toast(e.message, "error"); }
        await refresh();
    }
    function newRequest() {
        openForm({
            eyebrow: "New request", title: "Ask the group", desc: "Needs 2 approvals from authorised signers. You cannot approve your own request.", submit: "Submit request",
            fields: [{ name: "kind", label: "Type", options: [["withdrawal", "Withdrawal"], ["loan", "Loan (for yourself)"]] }, { name: "amount", label: "Amount (USDT)", type: "number", step: "0.01", min: 0.01 }, { name: "what", label: "Purpose (withdrawals)", placeholder: "e.g. Community hall deposit", required: false }, { name: "rate", label: "Interest % (loans)", type: "number", step: "0.01", min: 0, value: 0, required: false }, { name: "term", label: "Term in months (loans)", type: "number", min: 1, value: 6, required: false }],
            onSubmit: async (v) => {
                if (v.kind === "loan") await api.requestLoan(S.sid, Number(v.amount), Number(v.rate || 0), Number(v.term || 6));
                else { if (!v.what || v.what.trim().length < 2) throw new Error("Please describe what the money is for"); await api.requestWithdrawal(S.sid, Number(v.amount), v.what.trim()); }
                toast("Request created. Signers have been asked to vote.", "success");
            }
        });
    }

    function renderApprovals(st) {
        const v = VIEW("approvals"); if (!v) return;
        $$(".approval-detail:not(.live-request), .approval-layout, .other-approval", v).forEach((e) => (e.style.display = "none"));
        const pill = $(".count-pill", v); if (pill) pill.textContent = `${st.toVote.length} awaiting your review`;
        const box = slot("approvals", "requests"); box.replaceChildren();
        // alerts strip
        S.alerts.slice(0, 3).forEach((a) => box.append(kids(h("div", "notice notice-warning live-notice"), kids(h("div"), h("strong", null, "Security alert · " + when(a.created_at)), h("p", null, a.message)))));
        box.append(btn("+ New request", "btn btn-gold", async () => newRequest()));
        const open = S.requests.filter((r) => r.status === "pending" || r.status === "approved"), done = S.requests.filter((r) => r.status === "executed" || r.status === "rejected");
        if (!S.requests.length) box.append(h("p", "empty-state", "No requests yet."));
        open.forEach((r) => box.append(requestCard(r)));
        if (done.length) { box.append(h("h2", null, "History")); done.forEach((r) => box.append(requestCard(r))); }
        if (isAdmin()) box.append(signersCard());
    }
    function signersCard() {
        const p = h("section", "panel"); p.style.padding = "22px";
        p.append(h("h2", null, "Signers & invites"), h("p", null, "Signers can approve requests. Keep three, and require two."));
        const list = h("div", "member-list");
        S.members.forEach((m) => list.append(kids(h("div", "member-row"), h("span", "avatar", initials(name(m.user_id))), kids(h("span", "row-grow"), h("strong", null, name(m.user_id)), h("small", null, m.role + (m.is_signer ? " · signer" : ""))), btn(m.is_signer ? "Remove signer" : "Make signer", "text-link", () => run(() => api.setSigner(S.sid, m.user_id, !m.is_signer), "Signers updated")))));
        p.append(list, btn("Invite a member", "button-outline", async () => openForm({
            eyebrow: "Invite", title: "Invite a member", desc: "They must sign up with this exact email. The invite lasts 7 days.", fields: [{ name: "email", label: "Their email", type: "email" }], submit: "Create invite code",
            onSubmit: async (v) => { const token = await api.inviteMember(S.sid, v.email); try { await navigator.clipboard.writeText(token); } catch (e) { /* clipboard not available */ } toast("Invite code copied: " + token, "success"); window.prompt("Send this invite code to " + v.email, token); }
        })));
        return p;
    }

    /* ---------- bills ---------- */
    const SPLIT = { equal: "Split equally", amount: "Custom amounts", percentage: "By percentage" };
    const SHARE_ST = { paid: ["Paid", "status-done"], pending_confirmation: ["Cash awaiting treasurer", "status-pending"], unpaid: ["Owes", "status-pending"] };
    const evenSplit = (total, n) => { const base = Math.floor((total / n) * 100) / 100, a = Array(n).fill(base); a[0] = Math.round((total - base * (n - 1)) * 100) / 100; return a; };

    function billCard(b) {
        const shares = b.bill_shares || [], total = Number(b.total_amount);
        const paid = shares.filter((s) => s.status === "paid").reduce((a, s) => a + Number(s.amount), 0);
        const out = Math.max(total - paid, 0), pct = total ? Math.round((paid / total) * 100) : 0, settled = out < 0.005;
        const mine = shares.find((s) => s.user_id === S.me);
        const card = h("article", "panel bill-card live-bill");
        const bar = h("span"); bar.style.width = pct + "%";
        kids(card,
            kids(h("div", "bill-card-top"), h("small", null, when(b.created_at)), h("span", "status " + (settled ? "status-done" : "status-pending"), settled ? "Settled" : "In progress")),
            h("h2", null, b.title),
            h("p", null, `${S.st.name} · ${shares.length} members · ${SPLIT[b.split]} · by ${name(b.created_by)}`),
            kids(h("div", "bill-amounts"), kids(h("div"), h("small", null, "Total bill"), h("strong", null, usdt(total))), kids(h("div"), h("small", null, "Outstanding"), h("strong", null, usdt(out)))),
            kids(h("div", "progress-track"), bar),
            kids(h("div", "bill-progress-caption"), h("span", null, `${usdt(paid)} paid`), h("b", null, pct + "%")));
        const list = h("div", "member-list");
        shares.forEach((s) => { const st = SHARE_ST[s.status]; list.append(kids(h("div", "member-row"), h("span", "avatar", initials(name(s.user_id))), kids(h("span", "row-grow"), h("strong", null, name(s.user_id) + (s.user_id === S.me ? " (you)" : "")), h("small", null, usdt(s.amount) + (s.percentage ? " · " + s.percentage + "%" : ""))), h("span", "status " + st[1], st[0]))); });
        card.append(list);
        if (total >= Number(S.st.large_bill_threshold)) card.append(h("small", null, "Large bill: paying the supplier from the pot also needs 2 signer approvals (see Approvals)."));
        if (mine) {
            if (mine.status === "unpaid") card.append(btn("Settle my share · " + usdt(mine.amount), "button-outline full-button", async () => payShare(mine, b)));
            else { const d = h("button", "button-outline full-button", mine.status === "paid" ? "Your share is paid" : "Cash waiting for treasurer confirmation"); d.disabled = true; card.append(d); }
        }
        return card;
    }
    function renderBills() {
        const v = VIEW("bills"), grid = v && $(".bill-grid", v); if (!grid) return;
        grid.replaceChildren(...(S.bills.length ? S.bills.map(billCard) : [h("p", "empty-state", "No bills yet. Create the first one.")]));
    }
    function payShare(s, b) {
        openForm({
            eyebrow: "Settle up", title: "Pay your share of " + b.title, desc: `${usdt(s.amount)} goes into the group pot. Cash only counts once the treasurer confirms they received it.`, submit: "Settle my share",
            fields: [{ name: "method", label: "How are you paying?", options: [["usdt", "USDT (from my wallet)"], ["cash", "Cash to the treasurer"]] }, { name: "tx", label: "Transaction hash (USDT only)", placeholder: "0x…", pattern: "0x[0-9a-fA-F]{64}", required: false }],
            onSubmit: async (v) => { await api.payBillShare(s.id, v.method, v.method === "usdt" ? (v.tx || "").trim() : null); toast(v.method === "cash" ? "Recorded. The treasurer will confirm the cash." : "Share paid and added to the ledger", "success"); }
        });
    }
    function buildShares(fs) {
        const wrap = h("div"); wrap.style.cssText = "display:grid;gap:8px";
        const sel = () => fs.querySelector('[name="split"]'), tot = () => fs.querySelector('[name="total"]');
        const rows = S.members.map((m) => {
            const r = h("label"); r.style.cssText = "display:flex;align-items:center;gap:10px";
            const cb = h("input"); cb.type = "checkbox"; cb.name = "inc_" + m.user_id; cb.checked = true;
            const nm = h("span", null, name(m.user_id)); nm.style.flex = "1";
            const val = h("input", "input"); val.type = "number"; val.step = "0.01"; val.min = "0"; val.name = "val_" + m.user_id; val.style.width = "110px";
            r.append(cb, nm, val); wrap.append(r); return { cb, val };
        });
        const note = h("small"); wrap.append(note);
        const sync = () => {
            const kind = sel().value, on = rows.filter((r) => r.cb.checked), t = Number(tot().value || 0);
            rows.forEach((r) => { r.val.style.display = kind === "equal" ? "none" : ""; r.val.placeholder = kind === "percentage" ? "%" : "USDT"; r.val.disabled = !r.cb.checked; r.val.required = kind !== "equal" && r.cb.checked; });
            if (kind === "equal") note.textContent = on.length && t ? `${on.length} people · about ${usdt(t / on.length)} each` : "";
            else { const sum = on.reduce((a, r) => a + Number(r.val.value || 0), 0); note.textContent = kind === "percentage" ? `Allocated ${num(sum)}% of 100%` : `Allocated ${usdt(sum)} of ${usdt(t)}`; }
        };
        const prefill = () => {
            const kind = sel().value, on = rows.filter((r) => r.cb.checked), t = Number(tot().value || 0);
            const parts = !on.length || kind === "equal" ? [] : evenSplit(kind === "percentage" ? 100 : t, on.length);
            rows.forEach((r) => (r.val.value = ""));
            on.forEach((r, i) => { if (parts.length) r.val.value = parts[i].toFixed(2); });
            sync();
        };
        wrap.addEventListener("input", sync);
        wrap.addEventListener("change", (e) => { if (e.target.type === "checkbox") prefill(); else sync(); });
        setTimeout(() => { sel().addEventListener("change", prefill); tot().addEventListener("input", () => { if (sel().value === "amount") prefill(); else sync(); }); sync(); });
        return wrap;
    }
    function billDialog() {
        openForm({
            eyebrow: "Fair by design", title: "Create a bill", desc: "Split a shared cost between members. Everyone sees who has paid.", submit: "Create bill",
            fields: [{ name: "title", label: "What is it for?", placeholder: "e.g. Year-end function" }, { name: "total", label: "Total (USDT)", type: "number", step: "0.01", min: 0.01 }, { name: "split", label: "How to split", options: [["equal", "Equally"], ["amount", "Custom amounts"], ["percentage", "By percentage"]] }, { custom: buildShares }],
            onSubmit: async (v) => {
                const picked = S.members.filter((m) => v["inc_" + m.user_id]);
                if (!picked.length) throw new Error("Pick at least one member");
                const shares = picked.map((m) => v.split === "equal" ? { user_id: m.user_id } : v.split === "amount" ? { user_id: m.user_id, amount: Number(v["val_" + m.user_id]) } : { user_id: m.user_id, percentage: Number(v["val_" + m.user_id]) });
                await api.createBill(S.sid, v.title.trim(), Number(v.total), v.split, shares);
                toast("Bill created and split between " + picked.length + " members", "success");
            }
        });
    }
    function renderBillCash() {   // treasurer: cash shares waiting for confirmation
        const box = slot("contributions", "billcash"); if (!box) return; box.replaceChildren();
        const pend = []; S.bills.forEach((b) => (b.bill_shares || []).forEach((s) => { if (s.status === "pending_confirmation") pend.push([b, s]); }));
        if (!pend.length) return;
        const p = h("section", "panel"); p.style.padding = "22px";
        p.append(h("h2", null, "Bill shares paid in cash"), h("p", null, "Confirm only once you hold the cash. It then counts in the ledger."));
        pend.forEach(([b, s]) => p.append(kids(h("div", "member-row"), h("span", "avatar", initials(name(s.user_id))), kids(h("span", "row-grow"), h("strong", null, name(s.user_id) + " · " + b.title), h("small", null, usdt(s.amount))),
            s.user_id === S.me ? h("span", "status status-pending", "Another treasurer must confirm") : kids(h("span"), btn("Cash received", "button-outline", () => run(() => api.confirmBillCash(s.id, true), "Cash confirmed and added to the ledger")), btn("Not received", "text-link", () => run(() => api.confirmBillCash(s.id, false), "Marked as not received"))))));
        box.append(p);
    }

    /* ---------- loans ---------- */
    const LOAN_ST = { pending: ["Awaiting approvals", "status-pending"], active: ["Active", "status-done"], repaid: ["Repaid", "status-done"], rejected: ["Rejected", "status-pending"] };
    const termsOf = (id) => S.terms.filter((t) => t.loan_id === id).sort((a, b) => a.version - b.version);
    const installment = (l) => Math.min(Math.round((Number(l.total_due) / l.term_months) * 100) / 100, Number(l.outstanding));

    function loanCard(l) {
        const card = h("section", "panel live-loan"); card.style.cssText = "padding:20px;display:grid;gap:12px";
        const st = l.overdue ? ["Overdue", "status-pending"] : LOAN_ST[l.status];
        card.append(kids(h("div", "loan-row"), h("span", "avatar", initials(name(l.borrower_id))), kids(h("span", "row-grow"), h("strong", null, name(l.borrower_id) + (l.borrower_id === S.me ? " (you)" : "")), h("small", null, `${l.term_months} months · ${num(l.interest_rate)}% interest · terms v${l.terms_version}`)), h("b", null, usdt(l.principal)), h("span", "status " + st[1], st[0])));
        if (l.borrower_is_admin) card.append(kids(h("div", "notice notice-warning live-notice"), kids(h("div"), h("strong", null, "Administrator loan"), h("p", null, `${name(l.borrower_id)} is an administrator of this stokvel. Admin loans are flagged for every member.`))));
        if (l.status === "active" || l.status === "repaid") {
            const pct = Number(l.total_due) ? Math.min(100, Math.round((Number(l.repaid) / Number(l.total_due)) * 100)) : 0, bar = h("span"); bar.style.width = pct + "%";
            card.append(kids(h("div", "progress-track"), bar), kids(h("div", "bill-progress-caption"), h("span", null, `${usdt(l.repaid)} repaid of ${usdt(l.total_due)}`), h("b", null, pct + "%")));
            if (l.status === "active") card.append(h("small", null, `Outstanding ${usdt(l.outstanding)} · due ${l.due_at}${l.overdue ? " · OVERDUE" : ""}`));
        }
        if (l.status === "pending") { const go = btn("See the approval", "button-outline", async () => { }); go.dataset.page = "approvals"; card.append(h("small", null, "Needs 2 signer approvals. The requester cannot approve their own loan."), go); }
        const th = termsOf(l.loan_id);
        if (th.length > 1) card.append(h("small", null, "Terms history (every change was alerted to members): " + th.map((t) => `v${t.version} ${num(t.principal)} @ ${num(t.interest_rate)}% / ${t.term_months}mo`).join("  →  ")));
        if (l.borrower_id === S.me) S.claims.filter((c) => c.loan_id === l.loan_id && c.status === "pending_confirmation").forEach((c) => {
            card.append(kids(h("div", "notice notice-warning live-notice"), kids(h("div"), h("strong", null, "Cash repayment awaiting your confirmation"), h("p", null, `${name(c.logged_by)} recorded ${usdt(c.amount)} cash from you. It only counts once you confirm it.`)),
                btn("Confirm", "button-outline", () => run(() => api.confirmCashRepayment(c.id, true), "Repayment confirmed and added to the ledger")), btn("Dispute", "text-link", () => run(() => api.confirmCashRepayment(c.id, false), "Marked as disputed"))));
        });
        if (l.status === "active" && l.borrower_id === S.me) card.append(btn("Repay in USDT", "btn btn-gold", async () => repayDialog(l)));
        return card;
    }
    function renderLoans() {
        const v = VIEW("loans"), list = v && $(".loan-list", v); if (!list) return;
        const h1 = $("h1", v); if (h1) h1.textContent = "Loans";
        const hd = $(".page-table .panel-heading p", v); if (hd) hd.textContent = `${S.loans.length} in ${S.st.name}. Everyone sees the same terms.`;
        list.replaceChildren(...(S.loans.length ? [...S.loans].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(loanCard) : [h("p", "empty-state", "No loans yet.")]));
        list.style.display = "grid"; list.style.gap = "14px";
    }
    function renderOverviewStats(st) {
        if (TREAS || !VIEW("overview")) return;
        const c = $$(".stats-grid .stat-card", VIEW("overview")); if (c.length < 4) return;
        const all = S.contribs.filter((x) => x.user_id === S.me && x.status === "confirmed").reduce((a, x) => a + Number(x.amount), 0), mine = st.paidBy[S.me] || 0;
        const my = S.loans.filter((l) => l.borrower_id === S.me && l.status === "active"), out = my.reduce((a, l) => a + Number(l.outstanding), 0);
        setStat(c[0], null, usdt(all), "Your confirmed contributions");
        setStat(c[1], null, usdt(st.monthly), mine >= st.monthly ? "Paid this month" : `${usdt(Math.max(st.monthly - mine, 0))} remaining`, st.monthly ? Math.min(100, Math.round((mine / st.monthly) * 100)) : 0);
        setStat(c[2], null, usdt(out), my.length ? `Due ${my[0].due_at}` : "No active loan");
        setStat(c[3], null, my.length ? my[0].due_at : "None", `Monthly contribution · ${usdt(st.monthly)}`);
    }
    function loanDialog() {
        openForm({
            eyebrow: "Responsible access", title: "Apply for a loan", desc: "Signers vote on it (2 approvals needed). Everyone in the stokvel sees the terms, and they are locked once voting starts.", submit: "Submit application",
            fields: [{ name: "amount", label: "Amount (USDT)", type: "number", step: "0.01", min: 0.01 }, { name: "rate", label: "Interest %", type: "number", step: "0.01", min: 0, value: 0 }, { name: "term", label: "Term (months)", type: "number", min: 1, max: 60, value: 6 }],
            onSubmit: async (v) => { await api.requestLoan(S.sid, Number(v.amount), Number(v.rate || 0), Number(v.term)); toast("Loan requested. Signers have been asked to vote.", "success"); }
        });
    }
    function repayDialog(l) {
        openForm({
            eyebrow: "Repayment", title: "Repay in USDT", desc: `Outstanding ${usdt(l.outstanding)}. To repay in cash instead, ask your treasurer to log it, then confirm it here.`, submit: "Add repayment",
            fields: [{ name: "amount", label: "Amount (USDT)", type: "number", step: "0.01", min: 0.01, value: installment(l) }, { name: "tx", label: "Transaction hash", placeholder: "0x…", pattern: "0x[0-9a-fA-F]{64}" }],
            onSubmit: async (v) => { const left = await api.recordLoanRepayment(l.loan_id, Number(v.amount), "usdt", v.tx.trim()); toast(Number(left) <= 0 ? "Loan fully repaid" : `Repayment recorded. ${usdt(left)} left.`, "success"); }
        });
    }
    function renderLoanAdmin() {   // treasurer page has no loans view, so it gets a panel under Contributions
        const box = slot("contributions", "loans"); if (!box) return; box.replaceChildren();
        const open = S.loans.filter((l) => l.status === "pending" || l.status === "active"); if (!open.length) return;
        const p = h("section", "panel"); p.style.padding = "22px";
        p.append(h("h2", null, "Loans"), h("p", null, "Cash repayments only count once the borrower confirms them. Terms can only change before voting starts, and every change alerts all members."));
        open.forEach((l) => {
            const mine = l.borrower_id === S.me, acts = kids(h("span"));
            if (!mine && l.status === "active") acts.append(btn("Log cash repayment", "button-outline", async () => openForm({ eyebrow: "Cash", title: "Log a cash repayment", desc: `${name(l.borrower_id)} must confirm it in their app before it counts.`, submit: "Log repayment", fields: [{ name: "amount", label: "Amount (USDT)", type: "number", step: "0.01", min: 0.01, value: installment(l) }], onSubmit: async (v) => { await api.logCashRepayment(l.loan_id, Number(v.amount)); toast("Logged. Waiting for the borrower to confirm.", "success"); } })));
            if (!mine && l.status === "pending") acts.append(btn("Amend terms", "text-link", async () => openForm({ eyebrow: "Before voting", title: "Amend loan terms", desc: "Previous versions are kept and every member is alerted.", submit: "Save new terms", fields: [{ name: "amount", label: "Amount (USDT)", type: "number", step: "0.01", min: 0.01, value: l.principal }, { name: "rate", label: "Interest %", type: "number", step: "0.01", min: 0, value: l.interest_rate }, { name: "term", label: "Term (months)", type: "number", min: 1, max: 60, value: l.term_months }], onSubmit: async (v) => { await api.amendLoanTerms(l.loan_id, Number(v.amount), Number(v.rate || 0), Number(v.term)); toast("Terms updated. Members were alerted.", "success"); } })));
            const claims = S.claims.filter((c) => c.loan_id === l.loan_id && c.status === "pending_confirmation").length;
            p.append(kids(h("div", "member-row"), h("span", "avatar", initials(name(l.borrower_id))), kids(h("span", "row-grow"), h("strong", null, name(l.borrower_id) + " · " + usdt(l.principal) + (l.borrower_is_admin ? " · administrator loan" : "")), h("small", null, l.status === "active" ? `Outstanding ${usdt(l.outstanding)}${l.overdue ? " · OVERDUE" : ""}${claims ? " · " + claims + " cash awaiting borrower" : ""}` : "Awaiting approvals")), acts));
        });
        box.append(p);
    }

    /* ---------- wiring ---------- */
    document.addEventListener("click", (e) => {   // capture: replaces the demo contribution dialog
        const b = e.target.closest('[data-action="contribution"]');
        if (b && S.sid) { e.preventDefault(); e.stopImmediatePropagation(); TREAS ? logCash() : makeContribution(); return; }
        const lb = e.target.closest('[data-action="loan"]');
        if (lb && S.sid) { e.preventDefault(); e.stopImmediatePropagation(); loanDialog(); return; }
        const bb = e.target.closest('[data-action="bill"]');
        if (bb && S.sid) { e.preventDefault(); e.stopImmediatePropagation(); billDialog(); }
    }, true);
    window.addEventListener("themba:demo-state", (ev) => {   // Safe panel finished an on-chain contribution -> save it to the real ledger
        const d = ev.detail || {};
        if (S.sid && d.name === "contributions" && d.record && d.record.status === "confirmed-on-chain" && /^0x[0-9a-fA-F]{64}$/.test(d.record.txHash || ""))
            run(() => api.recordUsdtContribution(S.sid, Number(d.record.amount), monthStart(), d.record.txHash), "On-chain contribution saved to the ledger");
    });
    sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_OUT") window.location.href = "login.html"; });

    await refresh();
    if (S.sid) {
        let t; api.subscribe(S.sid, (table, p) => {
            if (table === "alerts" && p.eventType === "INSERT" && p.new) toast("Alert: " + p.new.message, "error");
            clearTimeout(t); t = setTimeout(refresh, 300);
        });
    }
})();