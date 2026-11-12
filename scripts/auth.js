/* ==========================================================================
   THEMBA — login / sign up behaviour (MOCK AUTH, front end only)
   Every spot marked TODO(supabase) / TODO(wallet) is where the real
   backend call goes later. Nothing here is secure — it is demo data only.
   ========================================================================== */

(() => {
  "use strict";

  const KEYS = { users: "themba_users", session: "themba_session" };
  const DASHBOARD_URLS = {
    platform_admin: "platform-admin-dashboard.html",
    treasurer: "treasurer-dashboard.html",
    member: "members-dashboard.html"
  };
  const page = document.body.dataset.page; // "login" | "signup"
  const sb = window.ThembaSupabase || null; // set by supabase-client.js when config.js is filled in; otherwise demo mode
  const liveConfigured = !!((window.THEMBA_CONFIG || {}).SUPABASE_URL && (window.THEMBA_CONFIG || {}).SUPABASE_ANON_KEY);
  const libraryMissing = liveConfigured && !sb; // keys are set but the Supabase library did not load: never fall back to demo silently

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Session helpers (shared with other pages via window.ThembaAuth) ---------- */

  function readJSON(storage, key, fallback) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function getSession() {
    return readJSON(localStorage, KEYS.session, null) || readJSON(sessionStorage, KEYS.session, null);
  }

  function saveSession(session, remember) {
    localStorage.removeItem(KEYS.session);
    sessionStorage.removeItem(KEYS.session);
    try {
      (remember ? localStorage : sessionStorage).setItem(KEYS.session, JSON.stringify(session));
    } catch {
      /* storage blocked — session lives only for this page load */
    }
  }

  function signOut() {
    localStorage.removeItem(KEYS.session);
    sessionStorage.removeItem(KEYS.session);
    const done = () => (window.location.href = "login.html");
    if (window.ThembaSupabase) window.ThembaSupabase.auth.signOut().finally(done);
    else done();
  }

  window.ThembaAuth = { getSession, signOut };

  function loadUsers() {
    return readJSON(localStorage, KEYS.users, []);
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(KEYS.users, JSON.stringify(users));
    } catch {
      /* ignore */
    }
  }

  /* ---------- UI helpers ---------- */

  function toast(message, type = "info", ms = 3200) {
    const stack = $("#toasts");
    if (!stack) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  function setError(input, message) {
    const field = input.closest(".field");
    if (!field) return;
    field.classList.toggle("has-error", Boolean(message));
    const out = $(".field-error", field);
    if (out) out.textContent = message || "";
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function clearErrors(form) {
    $$(".input, .select", form).forEach((i) => setError(i, ""));
  }

  function setLoading(btn, loading, label) {
    const text = $(".btn-label", btn);
    btn.disabled = loading;
    if (text && label) text.textContent = label;
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------- Password show / hide ---------- */

  $$("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $("input", btn.closest(".input-wrap"));
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  /* ---------- Form ---------- */

  const form = $("#auth-form");
  if (!form) return;

  const els = {
    name: $("#name"),
    email: $("#email"),
    password: $("#password"),
    role: $("#role"),
    remember: $("#remember"),
    submit: $("#submit-btn"),
    wallet: $("#wallet-btn"),
    forgot: $("#forgot"),
  };

  // Real mode: no demo credentials, and the "Demo role" picker is hidden on the login page (the role comes from the database).
  if (sb) {
    if (page === "login") {
      if (els.email) els.email.value = "";
      if (els.password) els.password.value = "";
      const roleField = els.role && els.role.closest(".field");
      if (roleField) roleField.style.display = "none";
    } else if (page === "signup") {
      if (els.email) els.email.value = "";
      if (els.password) els.password.value = "";
    }
  }

  // Clear an error as soon as the user starts fixing it
  $$(".input", form).forEach((i) => i.addEventListener("input", () => setError(i, "")));

  function validate() {
    clearErrors(form);
    let ok = true;

    if (page === "signup") {
      if (els.name.value.trim().length < 2) {
        setError(els.name, "Please enter your full name.");
        ok = false;
      }
    }
    if (!EMAIL_RE.test(els.email.value.trim())) {
      setError(els.email, "Enter a valid email address.");
      ok = false;
    }
    if (els.password.value.length < 6) {
      setError(els.password, "Password must be at least 6 characters.");
      ok = false;
    }

    if (!ok) {
      const firstBad = $(".field.has-error .input", form);
      if (firstBad) firstBad.focus();
    }
    return ok;
  }

  function nameFromEmail(email) {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    return local.replace(/\b\w/g, (c) => c.toUpperCase()) || "Member";
  }

  function goToDashboard(session, remember) {
    saveSession(session, remember);
    toast(`Welcome, ${session.name.split(" ")[0]}! Opening your dashboard…`, "success");
    const destination = DASHBOARD_URLS[session.role] || DASHBOARD_URLS.member;
    setTimeout(() => (window.location.href = destination), 900);
  }

  /* ---------- Real auth (Supabase) ---------- */

  // The role is read from the DATABASE (platform_admins / stokvel_members), never from the dropdown.
  async function buildSession(user) {
    const [prof, admin, mem] = await Promise.all([
      sb.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      sb.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      sb.from("stokvel_members").select("role").eq("user_id", user.id).eq("status", "active")
    ]);
    const roles = (mem.data || []).map((m) => m.role);
    let role = "member";
    if (admin.data) role = "platform_admin";
    else if (roles.includes("treasurer") || roles.includes("chairperson")) role = "treasurer";
    else if (!roles.length && user.user_metadata && user.user_metadata.intended_role === "treasurer") role = "treasurer"; // landing page only; grants no access
    const name = (prof.data && prof.data.full_name) || nameFromEmail(user.email || "");
    return { name, email: user.email, role, userId: user.id };
  }

  async function realSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const email = els.email.value.trim().toLowerCase();
    const password = els.password.value;
    const remember = els.remember ? els.remember.checked : true;
    const idleLabel = page === "signup" ? "Create secure account" : "Sign in securely";
    try {
      if (page === "signup") {
        setLoading(els.submit, true, "Creating account…");
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: {
            data: { full_name: els.name.value.trim(), intended_role: els.role.value === "treasurer" ? "treasurer" : "member" },
            emailRedirectTo: window.location.origin + "/dashboards/login.html"
          }
        });
        if (error) throw error;
        if (!data.session) {
          toast("Account created. Check your email to confirm it, then log in.", "success", 7000);
          setLoading(els.submit, false, idleLabel);
          return;
        }
        goToDashboard(await buildSession(data.user), true);
        return;
      }
      setLoading(els.submit, true, "Signing in…");
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      goToDashboard(await buildSession(data.user), remember);
    } catch (err) {
      setLoading(els.submit, false, idleLabel);
      setError(page === "signup" ? els.email : els.password, err.message || "Something went wrong. Please try again.");
    }
  }

  /* ---------- Demo mode (no Supabase keys yet) ---------- */

  function mockSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const email = els.email.value.trim().toLowerCase();
    const password = els.password.value;
    const role = els.role.value;
    const remember = els.remember ? els.remember.checked : true;
    const users = loadUsers();

    if (page === "signup") {
      if (users.some((u) => u.email === email)) {
        setError(els.email, "An account with this email already exists.");
        return;
      }

      setLoading(els.submit, true, "Creating account…");
      // TODO(supabase): supabase.auth.signUp({ email, password, options: { data: { name, role } } })
      setTimeout(() => {
        const user = { name: els.name.value.trim(), email, password, role };
        users.push(user);
        saveUsers(users);
        goToDashboard({ name: user.name, email, role }, true);
      }, 700);
      return;
    }

    // login
    const existing = users.find((u) => u.email === email);
    if (existing && existing.password !== password) {
      setError(els.password, "Incorrect password.");
      return;
    }

    setLoading(els.submit, true, "Signing in…");
    // TODO(supabase): supabase.auth.signInWithPassword({ email, password })
    setTimeout(() => {
      const defaultNames = { platform_admin: "Nomsa Mthembu", treasurer: "Nokuthula Maseko" };
      const name = existing ? existing.name : defaultNames[role] || nameFromEmail(email);
      goToDashboard({ name, email, role }, remember);
    }, 700);
  }

  form.addEventListener("submit", (e) => {
    if (libraryMissing) {
      e.preventDefault();
      toast("Cannot reach the database: the Supabase library did not load. Reload the page and check scripts/supabase.js.", "error", 7000);
      return;
    }
    return sb ? realSubmit(e) : mockSubmit(e);
  });

  /* ---------- Demo wallet ---------- */

  function fakeAddress() {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  els.wallet.addEventListener("click", () => {
    if (sb || libraryMissing) {
      toast("Wallet sign-in arrives with the Safe integration. Please use email and password.", "info", 4500);
      return; // the demo wallet shortcut skips authentication, so it is off when the real backend is on
    }
    const role = els.role.value;
    const remember = els.remember ? els.remember.checked : true;
    const wallet = fakeAddress();

    els.wallet.disabled = true;
    toast("Connecting demo wallet…");
    // TODO(wallet): replace with MetaMask: ethereum.request({ method: "eth_requestAccounts" }) on Sepolia
    setTimeout(() => {
      els.wallet.disabled = false;
      const roleName = role === "platform_admin" ? "Nomsa Mthembu" : role === "treasurer" ? "Nokuthula Maseko" : "Demo Member";
      const name = els.name && els.name.value.trim() ? els.name.value.trim() : roleName;
      goToDashboard({ name, email: els.email.value.trim() || "demo@themba.demo", role, wallet }, remember);
    }, 800);
  });

  /* ---------- Forgot password ---------- */

  if (els.forgot) {
    els.forgot.addEventListener("click", (e) => {
      e.preventDefault();
      if (!EMAIL_RE.test(els.email.value.trim())) {
        setError(els.email, "Enter your email first, then tap “Forgot password?”.");
        els.email.focus();
        return;
      }
      if (sb) {
        sb.auth
          .resetPasswordForEmail(els.email.value.trim(), { redirectTo: window.location.origin + "/dashboards/reset-password.html" })
          .then(({ error }) => toast(error ? error.message : "If that email has an account, a reset link is on its way.", error ? "error" : "success", 5000));
        return;
      }
      toast(`Reset link sent to ${els.email.value.trim()} (demo).`, "success");
    });
  }
})();