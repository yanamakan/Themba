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

    // Every write goes through a database function that checks who is calling.
    async function rpc(name, args) {
        const { data, error } = await sb.rpc(name, args);
        if (error) throw new Error(error.message);
        return data;
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
        payBillShare: (share, method, txHash = null) => rpc("pay_bill_share", { p_share: share, p_method: method, p_tx_hash: txHash }),
        requestWithdrawal: (stokvel, amount, description, payee = null) => rpc("request_withdrawal", { p_stokvel: stokvel, p_amount: amount, p_description: description, p_payee: payee }),
        requestLoan: (stokvel, principal, rate, termMonths) => rpc("request_loan", { p_stokvel: stokvel, p_principal: principal, p_rate: rate, p_term_months: termMonths }),
        amendLoanTerms: (loan, principal, rate, termMonths) => rpc("amend_loan_terms", { p_loan: loan, p_principal: principal, p_rate: rate, p_term_months: termMonths }),
        castApproval: (request, decision) => rpc("cast_approval", { p_request: request, p_decision: decision }),   // "approve" | "reject"
        executeRequest: (request, txHash = null) => rpc("execute_request", { p_request: request, p_tx_hash: txHash }), // -> {ok, reason?}
        recordLoanRepayment: (loan, amount, method, txHash = null) => rpc("record_loan_repayment", { p_loan: loan, p_amount: amount, p_method: method, p_tx_hash: txHash }),
        addCorrection: (entry, reason) => rpc("add_correction", { p_entry: entry, p_reason: reason }),
        reportTamperAttempt: (stokvel, table, record = null) => rpc("report_tamper_attempt", { p_stokvel: stokvel, p_table: table, p_record: record }),
        platformOverview: () => rpc("platform_overview", {}),

        /* ---- reads (RLS limits these to the caller's own stokvels) ---- */
        myStokvels: () => read(sb.from("stokvel_members").select("role,is_signer,stokvels(*)").eq("status", "active")),
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
        requests: (stokvel) => read(sb.from("approval_requests").select("*,approvals(approver_id,decision)").eq("stokvel_id", stokvel).order("created_at", { ascending: false })),
        ledger: (stokvel) => read(sb.from("ledger_entries").select("*").eq("stokvel_id", stokvel).order("created_at", { ascending: false })),
        auditLog: (stokvel, limit = 100) => read(sb.from("audit_log").select("*").eq("stokvel_id", stokvel).order("created_at", { ascending: false }).limit(limit)),
        alerts: (stokvel) => read(sb.from("alerts").select("*").eq("stokvel_id", stokvel).order("created_at", { ascending: false }).limit(50)),

        /* ---- live updates: onChange(table, payload) fires for anything in this stokvel ---- */
        subscribe(stokvel, onChange) {
            const channel = sb.channel("stokvel-" + stokvel);
            ["alerts", "approval_requests", "approvals", "ledger_entries", "contributions", "bills", "bill_shares", "loans"].forEach((table) => {
                channel.on("postgres_changes", { event: "*", schema: "public", table, filter: "stokvel_id=eq." + stokvel }, (p) => onChange(table, p));
            });
            channel.subscribe();
            return () => sb.removeChannel(channel);
        }
    });
})();