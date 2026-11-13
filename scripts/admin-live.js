/* Themba · live data for the platform admin dashboard.
   Replaces the sample stokvels, members, transactions, alerts and totals with real data from the
   public.admin_directory() database function. If Supabase is not configured, the demo page is left alone.
   All text is inserted with textContent, never innerHTML. */
(async () => {
    "use strict";
    const sb = window.ThembaSupabase, api = window.ThembaAPI, cfg = window.THEMBA_CONFIG || {};
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function kids(el, ...c) { c.flat().filter(Boolean).forEach((x) => el.append(x)); return el; }
    function banner(msg) {
        const b = h("div", null, msg); b.setAttribute("role", "alert");
        b.style.cssText = "position:sticky;top:0;z-index:9999;padding:12px 18px;background:#6b1f1f;color:#fff;font:600 14px system-ui,sans-serif;text-align:center";
        document.body.prepend(b);
    }
    if (!sb || !api) { if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) banner("The live database is not connected, so you are seeing demo data. Reload, or check that scripts/supabase.js is being served."); return; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = "login.html"; return; }
    if (window.ThembaBindUser) window.ThembaBindUser(session.user.id);

    const fmt = (n) => Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 2 });
    const usdt = (n) => fmt(n) + " USDT";
    const initials = (n) => (n || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    const when = (iso) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const KIND = { contribution: "contribution", withdrawal: "withdrawal", loan_disbursement: "loan", loan_repayment: "loan", bill_share: "bill", bill_payout: "bill", correction: "correction" };
    const LABEL = { contribution: "Contribution", withdrawal: "Withdrawal", loan_disbursement: "Loan paid out", loan_repayment: "Loan repayment", bill_share: "Bill share", bill_payout: "Bill payout", correction: "Correction" };

    let d;
    try { d = await api.adminDirectory(); }
    catch (e) { banner("Admin data could not be loaded: " + e.message + (/Not allowed/i.test(e.message) ? " (this account is not in platform_admins)" : " (has the admin_directory SQL been run?)")); return; }

    const names = Object.fromEntries(d.stokvels.map((s) => [s.id, s.name]));
    const total = d.stokvels.reduce((a, s) => a + Number(s.balance || 0), 0);

    // ---- welcome line and top numbers
    const eb = $('[data-admin-view="overview"] .admin-welcome .eyebrow'); if (eb) eb.textContent = new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
    const k = $$(".admin-kpis article");
    const setK = (el, value, small) => { if (!el) return; $("strong", el).textContent = value; $("small", el).textContent = small; };
    setK(k[0], usdt(total), "Total value in all stokvel pots");
    setK(k[1], String(d.users), "Registered users");
    setK(k[2], String(d.stokvels.length), d.stokvels.length === 1 ? "Stokvel on the platform" : "Stokvels on the platform");
    setK(k[3], String(d.alerts.length), d.alerts.length ? "Recent alerts" : "No alerts");

    const bal = $(".admin-balance-value"); if (bal) { bal.textContent = usdt(total); bal.dataset.balance = usdt(total); }
    const conv = $(".admin-conversion"); if (conv) conv.style.display = "none";
    const ws = $(".admin-balance .wallet-state"); if (ws) ws.style.display = "none";
    const cw = $(".admin-balance .connect-wallet"); if (cw) cw.style.display = "none";

    // ---- sidebar: a platform admin sees every stokvel, so the "active stokvel" button becomes a platform summary
    const ag = $(".active-group");
    if (ag) {
        const av = $(".avatar", ag); if (av) av.textContent = "ALL";
        const ml = $(".micro-label", ag); if (ml) ml.textContent = "Platform";
        const st = $(".group-copy strong", ag); if (st) st.textContent = "All stokvels";
        const sm = $(".group-copy small", ag); if (sm) sm.textContent = `${d.stokvels.length} stokvel${d.stokvels.length === 1 ? "" : "s"} · ${d.users} user${d.users === 1 ? "" : "s"}`;
        const ch = $(".chevron", ag); if (ch) ch.style.display = "none";
    }
    const nb = $('[data-admin-page="approvals"] .nav-badge'); if (nb) nb.style.display = "none";   // the sample "3" was demo; approvals are handled by each stokvel's signers

    // ---- stokvels
    const grid = $(".admin-stokvel-grid");
    if (grid) {
        grid.replaceChildren(...(d.stokvels.length ? d.stokvels.map((s) => {
            const card = h("article", "panel admin-stokvel-card"); card.dataset.stokvelId = s.id; card.dataset.stokvelBaseStatus = "Verified";
            const active = (s.members || []).filter((m) => m.status === "active").length;
            kids(card,
                kids(h("div"), h("span", "avatar avatar-admin", initials(s.name)), h("span", "member-status active", "Live")),
                h("h2", null, s.name),
                h("p", null, `Created ${new Date(s.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} · Monthly ${usdt(s.monthly)}`),
                kids(h("div", "stokvel-metrics"), kids(h("span"), h("small", null, "Balance"), h("strong", null, usdt(s.balance))), kids(h("span"), h("small", null, "Members"), h("strong", null, String(active)))),
                (() => { const b = h("button", "button-outline full-button", "Manage stokvel →"); b.type = "button"; b.dataset.adminAction = "select-stokvel"; return b; })());
            return card;
        }) : [h("p", "empty-state", "No stokvels have been created yet.")]));
    }
    const createBtn = $('[data-admin-action="create-stokvel"]'); if (createBtn) createBtn.style.display = "none";   // creating a local demo stokvel would mislead; stokvels are created by treasurers
    const createForm = $("#admin-create-stokvel-form"); if (createForm) createForm.remove();

    // ---- members (all stokvels; the existing filter shows one stokvel at a time)
    const list = $("#admin-members-list");
    function say(msg, type) {
        const st = $("#admin-toasts"); if (!st) return;
        const t = h("div", "toast " + (type || "info"), msg); st.append(t); setTimeout(() => t.remove(), 3600);
    }
    function paintStatus(row, m) {
        const el = $(".member-status", row);
        el.className = "member-status " + (m.flagged ? "fraud" : m.status === "active" ? "active" : "pending");
        el.textContent = m.flagged ? "Potential fraud" : "● " + (m.status === "active" ? "Active" : m.status[0].toUpperCase() + m.status.slice(1));
        const fb = $('[data-live-act="flag"]', row); if (fb) fb.textContent = m.flagged ? "Clear fraud flag" : "Flag as potential fraud";
    }
    if (list) {
        const rows = [];
        d.stokvels.forEach((s) => (s.members || []).filter((m) => m.status !== "removed").forEach((m) => {
            const row = h("div", "admin-member-row"); row.dataset.stokvelId = s.id; row.dataset.memberId = m.user_id;
            const nm = m.name || m.email || "Member";
            row.dataset.search = `${nm} ${m.email || ""} ${m.role} ${s.name}`.toLowerCase();
            const role = m.role[0].toUpperCase() + m.role.slice(1) + (m.is_signer ? " · signer" : "");
            // actions menu: same look as the original (admin-member-actions / admin-member-menu); the buttons call the database, not browser storage
            const trigger = h("button", "row-open", "⋮"); trigger.type = "button"; trigger.dataset.adminAction = "member-menu"; trigger.setAttribute("aria-label", "Member actions for " + nm); trigger.setAttribute("aria-haspopup", "menu");
            const menu = h("div", "admin-member-menu"); menu.setAttribute("role", "menu"); menu.hidden = true;
            const flag = h("button", null, m.flagged ? "Clear fraud flag" : "Flag as potential fraud"); flag.type = "button"; flag.dataset.liveAct = "flag"; flag.setAttribute("role", "menuitem");
            const remove = h("button", null, "Remove member"); remove.type = "button"; remove.dataset.liveAct = "remove"; remove.setAttribute("role", "menuitem");
            menu.append(flag, remove);
            flag.addEventListener("click", async (e) => {
                e.stopPropagation(); menu.hidden = true;
                const next = !m.flagged;
                try { await api.adminSetMemberFlag(s.id, m.user_id, next); m.flagged = next; paintStatus(row, m); say(next ? `${nm} flagged for potential fraud.` : "Fraud flag cleared.", "success"); }
                catch (err) { say(err.message, "error"); }
            });
            remove.addEventListener("click", async (e) => {
                e.stopPropagation(); menu.hidden = true;
                if (!window.confirm(`Remove ${nm} from ${s.name}? They lose access to this stokvel.`)) return;
                try {
                    await api.adminRemoveMember(s.id, m.user_id); row.remove();
                    const cnt = $(`.admin-stokvel-card[data-stokvel-id="${s.id}"] .stokvel-metrics span:nth-child(2) strong`); if (cnt) cnt.textContent = String(Math.max(0, Number(cnt.textContent) - 1));
                    say(`${nm} was removed from ${s.name}.`, "success");
                } catch (err) { say(err.message, "error"); }
            });
            kids(row, h("span", "avatar", initials(nm)), kids(h("span", "row-grow"), h("strong", null, nm), h("small", null, `${role} · ${s.name}`)),
                kids(h("span", "member-contribution"), h("small", null, "Total contributed"), h("strong", null, usdt(m.contributed))),
                h("span", "member-status"), kids(h("div", "admin-member-actions"), trigger, menu));
            paintStatus(row, m);
            rows.push(row);
        }));
        list.replaceChildren(...rows);
        const sub = $("#members-stokvel-name"); if (sub) sub.textContent = "All stokvels";
        const ctx = $("#members-context"); if (ctx) ctx.textContent = "Every member across the platform, from the live database.";
    }
    const ci = $('[data-admin-action="copy-invite"]'); if (ci) ci.style.display = "none";   // invite codes are created by each stokvel's treasurer

    // ---- transactions
    const body = $("#admin-transactions");
    const mkTx = (l) => {
        const tr = h("tr"); tr.dataset.stokvelId = l.stokvel_id; tr.dataset.kind = KIND[l.kind] || "contribution";
        const sn = names[l.stokvel_id] || "Stokvel", label = LABEL[l.kind] || l.kind;
        tr.dataset.search = `${label} ${l.description || ""} ${sn} ${l.tx_hash || ""}`.toLowerCase();
        const pos = Number(l.amount) > 0;
        kids(tr, kids(h("td"), h("strong", null, l.description || label), h("small", null, sn)), h("td", null, when(l.created_at)), h("td", null, l.tx_hash ? l.tx_hash.slice(0, 10) + "…" : label),
            kids(h("td"), h("span", "status status-done", "● Recorded")), h("td", pos ? "amount-positive" : null, (pos ? "+" : "") + usdt(l.amount)), h("td"));
        return tr;
    };
    if (body) body.replaceChildren(...d.ledger.map(mkTx));
    const te = $("#transaction-empty"); if (te) { te.textContent = "No transactions yet."; te.hidden = d.ledger.length > 0; }
    const rec = $(".admin-transaction-list");
    if (rec) rec.replaceChildren(...(d.ledger.length ? d.ledger.slice(0, 4).map((l) => {
        const b = h("button", "admin-transaction"); b.type = "button"; b.dataset.adminPage = "transactions";
        const pos = Number(l.amount) > 0;
        return kids(b, h("span", "transaction-icon icon-admin-" + (pos ? "gold" : "neutral"), pos ? "↓" : "↑"), kids(h("span", "row-grow"), h("strong", null, l.description || LABEL[l.kind] || l.kind), h("small", null, names[l.stokvel_id] || "Stokvel")),
            h("span", "admin-tx-date", when(l.created_at)), h("span", "status status-done", "Recorded"), h("b", pos ? "amount-positive" : null, (pos ? "+" : "") + usdt(l.amount)));
    }) : [h("p", "empty-state", "No transactions yet.")]));

    // ---- security alerts
    const sec = $(".admin-security");
    if (sec) {
        $$(".security-item", sec).forEach((e) => e.remove());
        const cnt = $(".alert-count", sec); if (cnt) cnt.textContent = String(d.alerts.length);
        if (!d.alerts.length) sec.append(h("p", "empty-state", "No security alerts."));
        d.alerts.slice(0, 5).forEach((a) => {
            const b = h("button", "security-item"); b.type = "button";
            b.addEventListener("click", () => {   // open the stokvel the alert is about (same as "Manage stokvel"), else the Stokvels page
                const open = a.stokvel_id && $(`.admin-stokvel-card[data-stokvel-id="${a.stokvel_id}"] [data-admin-action="select-stokvel"]`);
                if (open) open.click(); else { const nav = $('.nav-link[data-admin-page="stokvels"]'); if (nav) nav.click(); }
            });
            sec.append(kids(b, h("span", "security-mark", "!"), kids(h("span", "row-grow"), h("strong", null, a.message), h("small", null, `${names[a.stokvel_id] || "Stokvel"} · ${when(a.created_at)}`)), h("span", "status status-pending", "Review")));
        });
    }

    // ---- notification bell: alerts first, then the latest platform activity
    const bell = $('.top-icon[aria-label="View notifications"]');
    if (bell) {
        const SEEN = "themba_admin_seen";
        const seen = () => { try { return Number(localStorage.getItem(SEEN) || 0); } catch (e) { return 0; } };
        const items = [
            ...d.alerts.map((a) => ({ title: a.message, sub: names[a.stokvel_id] || "Stokvel", at: a.created_at, stokvel: a.stokvel_id, alert: true })),
            ...d.ledger.slice(0, 8).map((l) => ({ title: (LABEL[l.kind] || l.kind) + " · " + usdt(Math.abs(l.amount)), sub: names[l.stokvel_id] || "Stokvel", at: l.created_at, stokvel: l.stokvel_id }))
        ].sort((a, b) => new Date(b.at) - new Date(a.at));
        const dot = $("i", bell);
        const unread = () => items.filter((n) => new Date(n.at).getTime() > seen()).length;
        const paintDot = () => { if (dot) dot.style.display = unread() ? "" : "none"; };
        paintDot();
        bell.removeAttribute("data-admin-page");
        bell.setAttribute("aria-haspopup", "true"); bell.setAttribute("aria-expanded", "false");
        bell.parentElement.style.position = bell.parentElement.style.position || "relative";
        const pop = h("div"); pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Notifications");
        pop.style.cssText = "position:absolute;right:0;top:calc(100% + 10px);width:min(380px,88vw);max-height:70vh;overflow:auto;background:#101a15;border:1px solid #29372e;border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.45);z-index:50;padding:8px";
        bell.insertAdjacentElement("afterend", pop);
        function fill() {
            const lastSeen = seen();
            pop.replaceChildren(h("div", null, "Notifications"));
            pop.firstChild.style.cssText = "padding:10px 12px;font-weight:700";
            if (!items.length) { const e = h("p", "empty-state", "No notifications yet."); e.style.padding = "14px 12px"; pop.append(e); return; }
            items.slice(0, 15).forEach((n) => {
                const b = h("button", null); b.type = "button";
                b.style.cssText = "display:block;width:100%;text-align:left;background:" + (new Date(n.at).getTime() > lastSeen ? "rgba(79,195,140,.08)" : "transparent") + ";border:0;border-radius:10px;padding:10px 12px;color:inherit;cursor:pointer";
                const t = h("strong", null, (n.alert ? "⚠ " : "") + n.title); t.style.display = "block";
                const m = h("small", null, n.sub + " · " + when(n.at)); m.style.opacity = ".7";
                kids(b, t, m);
                b.addEventListener("click", () => {
                    pop.hidden = true; bell.setAttribute("aria-expanded", "false");
                    const open = n.stokvel && $(`.admin-stokvel-card[data-stokvel-id="${n.stokvel}"] [data-admin-action="select-stokvel"]`);
                    if (open) open.click();
                });
                pop.append(b);
            });
        }
        bell.addEventListener("click", (e) => {
            e.stopPropagation();
            pop.hidden = !pop.hidden; bell.setAttribute("aria-expanded", String(!pop.hidden));
            if (!pop.hidden) { fill(); try { localStorage.setItem(SEEN, String(Date.now())); } catch (err) { /* storage unavailable */ } paintDot(); }
        });
        document.addEventListener("click", (e) => { if (!pop.hidden && !pop.contains(e.target)) { pop.hidden = true; bell.setAttribute("aria-expanded", "false"); } });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) { pop.hidden = true; bell.focus(); } });
    }

    // ---- approvals page shows a browser-only sample vote; hide it rather than pass it off as real
    const ap = $('[data-admin-view="approvals"]');
    if (ap) { $$(".approval-request, .signers-card", ap).forEach((e) => (e.style.display = "none")); ap.append(h("p", "empty-state", "Approvals are voted on by each stokvel's signers. Nothing to review here yet.")); }
})();