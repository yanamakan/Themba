/* Themba · Supabase client + API helpers.
   Load order on a page:  config.js → supabase-js (CDN) → supabase-client.js → your page script.
   If config.js is empty this file does nothing and the app keeps running in demo (local) mode. */
(() => {
    "use strict";
    const cfg = window.THEMBA_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) return;

    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.ThembaSupabase = sb;
    window.ThembaBindUser = (id) => { boundUser = id; };

    // Every write goes through a database function that checks who is calling.
    // A page binds itself to the user it is showing. Supabase keeps ONE session per browser, so if a second
    // account signs in from another tab, writes from this tab would silently run as that other account
    // (e.g. a member's loan request being recorded as the treasurer's, so nobody can approve it).
    let boundUser = null;
    async function rpc(name, args) {
        if (boundUser) {
            const { data: { session } } = await sb.auth.getSession();
            if (!session || session.user.id !== boundUser) throw new Error("This tab belongs to a different account than the one now signed in on this browser. Reload the page, or use a separate browser profile / private window for each test user.");
        }
        const { data, error } = await sb.rpc(name, args);
        if (error) throw new Error(error.message);
        return data;
    }
    async function uid() {   // local session (no network call)
        const { data: { session } } = await sb.auth.getSession();
        if (!session) throw new Error("Not signed in");
        return session.user.id;
    }
    async function read(query) {
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    }

    window.ThembaAPI = Object.freeze({
        /* ---- writes ---- */
        createStokvel: (name, monthly = 0, safeAddress = null) => rpc("create_stokvel", { p_name: name, p_monthly: monthly, p_safe_address: safeAddress }),
        inviteMember: (stokvel, email, role = "member") => rpc("invite_member", { p_stokvel: stokvel, p_email: email, p_role: role }),
        acceptInvite: (token) => rpc("accept_invite", { p_token: token }),
        setSigner: (stokvel, user, value) => rpc("set_signer", { p_stokvel: stokvel, p_user: user, p_value: value }),
        logCashContribution: (stokvel, member, amount, period) => rpc("log_cash_contribution", { p_stokvel: stokvel, p_member: member, p_amount: amount, p_period: period }),
        confirmContribution: (id, accept = true) => rpc("confirm_contribution", { p_id: id, p_accept: accept }),
        recordUsdtContribution: (stokvel, amount, period, txHash) => rpc("record_usdt_contribution", { p_stokvel: stokvel, p_amount: amount, p_period: period, p_tx_hash: txHash }),
        createBill: (stokvel, title, total, split, shares) => rpc("create_bill", { p_stokvel: stokvel, p_title: title, p_total: total, p_split: split, p_shares: shares }),
        confirmBillCash: (share, accept = true) => rpc("confirm_bill_cash", { p_share: share, p_accept: accept }),
        payBillShare: (share, method, txHash = null) => rpc("pay_bill_share", { p_share: share, p_method: method, p_tx_hash: txHash }),
        requestWithdrawal: (stokvel, amount, description, payee = null) => rpc("request_withdrawal", { p_stokvel: stokvel, p_amount: amount, p_description: description, p_payee: payee }),
        requestLoan: (stokvel, principal, rate, termMonths) => rpc("request_loan", { p_stokvel: stokvel, p_principal: principal, p_rate: rate, p_term_months: termMonths }),
        amendLoanTerms: (loan, principal, rate, termMonths) => rpc("amend_loan_terms", { p_loan: loan, p_principal: principal, p_rate: rate, p_term_months: termMonths }),
        castApproval: (request, decision) => rpc("cast_approval", { p_request: request, p_decision: decision }),   // "approve" | "reject"
        executeRequest: (request, txHash = null) => rpc("execute_request", { p_request: request, p_tx_hash: txHash }), // -> {ok, reason?}
        logCashRepayment: (loan, amount) => rpc("log_cash_repayment", { p_loan: loan, p_amount: amount }),
        confirmCashRepayment: (claim, accept = true) => rpc("confirm_cash_repayment", { p_claim: claim, p_accept: accept }),
        recordLoanRepayment: (loan, amount, method, txHash = null) => rpc("record_loan_repayment", { p_loan: loan, p_amount: amount, p_method: method, p_tx_hash: txHash }),
        addCorrection: (entry, reason) => rpc("add_correction", { p_entry: entry, p_reason: reason }),
        reportTamperAttempt: (stokvel, table, record = null) => rpc("report_tamper_attempt", { p_stokvel: stokvel, p_table: table, p_record: record }),
        linkSafeTx: (request, safeTxHash) => rpc("link_safe_tx", { p_request: request, p_safe_tx_hash: safeTxHash }),
        setOnchainRelease: (stokvel, value) => rpc("set_onchain_release", { p_stokvel: stokvel, p_value: value }),
        myProfile: async () => read(sb.from("profiles").select("full_name,wallet_address").eq("id", await uid()).maybeSingle()),
        saveWallet: async (address) => { const { error } = await sb.from("profiles").update({ wallet_address: address }).eq("id", await uid()); if (error) throw new Error(error.message); },
        platformOverview: () => rpc("platform_overview", {}),
        adminDirectory: () => rpc("admin_directory", {}),
        adminSetMemberFlag: (stokvel, user, flagged) => rpc("admin_set_member_flag", { p_stokvel: stokvel, p_user: user, p_flagged: flagged }),
        adminRemoveMember: (stokvel, user) => rpc("admin_remove_member", { p_stokvel: stokvel, p_user: user }),

        /* ---- reads (RLS limits these to the caller's own stokvels) ---- */
        // RLS lets you read every member of your stokvels, so filter to YOUR OWN membership rows
        myStokvels: async () => read(sb.from("stokvel_members").select("role,is_signer,stokvels(*)").eq("user_id", await uid()).eq("status", "active")),
        members: async (stokvel) => {   // profiles are fetched separately: Supabase cannot embed them through auth.users
            const rows = await read(sb.from("stokvel_members").select("user_id,role,is_signer").eq("stokvel_id", stokvel).eq("status", "active"));
            const ids = rows.map((r) => r.user_id);
            const profs = ids.length ? await read(sb.from("profiles").select("id,full_name,email").in("id", ids)) : [];
            const byId = Object.fromEntries(profs.map((p) => [p.id, p]));
            return rows.map((r) => ({ ...r, profiles: byId[r.user_id] || null }));
        },
        balance: async (stokvel) => (await read(sb.from("pot_balances").select("balance").eq("stokvel_id", stokvel).maybeSingle()))?.balance ?? 0,
        contributions: (stokvel) => read(sb.from("contributions").select("*").eq("stokvel_id", stokvel).order("created_at", { ascending: false })),
        bills: (stokvel) => read(sb.from("bills").select("*,bill_shares(*)").eq("stokvel_id", stokvel).order("created_at", { ascending: false })),
        loans: (stokvel) => read(sb.from("loan_balances").select("*").eq("stokvel_id", stokvel)),
        loanTerms: () => read(sb.from("loan_terms_history").select("*").order("version")),
        repaymentClaims: (stokvel) => read(sb.from("repayment_claims").select("*").eq("stokvel_id", stokvel).order("created_at", { ascending: false })),
        requests: (stokvel) => read(sb.from("approval_requests").select("*,approvals(approver_id,decision)").eq("stokvel_id", stokvel).order("created_at", { ascending: false })),
        ledger: (stokvel) => read(sb.from("ledger_entries").select("*").eq("stokvel_id", stokvel).order("created_at", { ascending: false })),
        auditLog: (stokvel, limit = 100) => read(sb.from("audit_log").select("*").eq("stokvel_id", stokvel).order("created_at", { ascending: false }).limit(limit)),
        alerts: (stokvel) => read(sb.from("alerts").select("*").eq("stokvel_id", stokvel).order("created_at", { ascending: false }).limit(50)),

        /* ---- live updates: onChange(table, payload) fires for anything in this stokvel ---- */
        subscribe(stokvel, onChange) {
            const channel = sb.channel("stokvel-" + stokvel);
            ["alerts", "approval_requests", "approvals", "ledger_entries", "contributions", "bills", "bill_shares", "loans", "loan_repayments", "repayment_claims"].forEach((table) => {
                channel.on("postgres_changes", { event: "*", schema: "public", table, filter: "stokvel_id=eq." + stokvel }, (p) => onChange(table, p));
            });
            channel.subscribe();
            return () => sb.removeChannel(channel);
        }
    });
})();