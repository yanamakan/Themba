"use strict";
// Tests for invitation email delivery: the backend handler, the browser helper and the wiring.
// No network or SMTP is used: Supabase and the mail transport are replaced with fakes.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { createInvitationEmailHandler, buildEmail } = require("../scripts/invitation-email");

const base = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(base, file), "utf8");

const JWT = "eyJhbGciOiJIUzI1NiJ9.treasurer-session-token.signature";
const STOKVEL = "11111111-2222-3333-4444-555555555555";
const ENV = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  APP_BASE_URL: "https://themba.example",
  SMTP_HOST: "smtp.example",
  MAIL_FROM: "Themba <invites@themba.example>"
};

function response(status, json) {
  return { ok: status >= 200 && status < 300, status, json: async () => json };
}

// Fake Supabase. `overrides` can replace any endpoint's reply.
function fakeSupabase(overrides = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith("/auth/v1/user")) return overrides.user || response(200, { id: "user-1", email: "treasurer@example.com" });
    if (url.endsWith("/rest/v1/rpc/invite_member")) return overrides.rpc || response(200, "TOKEN abc/123");
    if (url.includes("/rest/v1/stokvels")) return overrides.stokvel || response(200, [{ name: "Khula Savings Circle" }]);
    if (url.includes("/rest/v1/profiles")) return overrides.profile || response(200, [{ full_name: "Thandi Mokoena" }]);
    throw new Error("unexpected request " + url);
  };
  return { fetchImpl, calls };
}

function fakeMailer(failWith) {
  const sent = [];
  return { sent, sendMail: async (message) => { if (failWith) throw failWith; sent.push(message); } };
}

function fakeRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  res.set = (k, v) => { res.headers[k] = v; return res; };
  return res;
}

function setup({ supabase = {}, mailer = fakeMailer(), env = ENV, limits = {} } = {}) {
  const sb = fakeSupabase(supabase);
  const handler = createInvitationEmailHandler({ env, fetchImpl: sb.fetchImpl, transporter: mailer, quiet: true, ...limits });
  const call = async (body, headers = { authorization: `Bearer ${JWT}` }) => {
    const res = fakeRes();
    await handler({ headers, body }, res);
    return res;
  };
  return { call, sb, mailer };
}

const valid = { stokvelId: STOKVEL, email: "Zinhle@Example.com" };

test("sends a personalised email after Supabase creates the token as the signed-in treasurer", async () => {
  const { call, sb, mailer } = setup();
  const res = await call(valid);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { data: { emailed: true, to: "zinhle@example.com" } });

  // Session verified with Supabase Auth using the anon key + the caller's token.
  const userCall = sb.calls.find((c) => c.url.endsWith("/auth/v1/user"));
  assert.equal(userCall.init.headers.apikey, "anon-key");
  assert.equal(userCall.init.headers.Authorization, `Bearer ${JWT}`);

  // The EXISTING invite_member RPC is called as the caller (their JWT), so the database enforces permission.
  const rpc = sb.calls.find((c) => c.url.endsWith("/rest/v1/rpc/invite_member"));
  assert.equal(rpc.init.headers.Authorization, `Bearer ${JWT}`);
  assert.deepEqual(JSON.parse(rpc.init.body), { p_stokvel: STOKVEL, p_email: "zinhle@example.com", p_role: "member" });

  assert.equal(mailer.sent.length, 1);
  const mail = mailer.sent[0];
  assert.equal(mail.to, "zinhle@example.com");
  assert.equal(mail.from, ENV.MAIL_FROM);
  assert.match(mail.subject, /Thandi Mokoena invited you to join Khula Savings Circle/);
  assert.match(mail.html, /Join Khula Savings Circle/);
  // Join button goes to the existing login-with-invite route; the token is URL-encoded.
  const joinUrl = "https://themba.example/dashboards/login.html?invite=TOKEN%20abc%2F123";
  assert.ok(mail.html.includes(`href="${joinUrl}"`));
  assert.ok(mail.text.includes(joinUrl));
  assert.ok(mail.html.includes("https://themba.example/dashboards/signup.html?invite=TOKEN%20abc%2F123"));
  // The token and link are not handed back to the browser when email succeeded.
  assert.doesNotMatch(JSON.stringify(res.body), /TOKEN|login\.html/);
});

test("not configured: 503 before any Supabase call, so the browser can fall back to the manual link", async () => {
  const { call, sb, mailer } = setup({ env: { ...ENV, SMTP_HOST: "" } });
  const res = await call(valid);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error.code, "EMAIL_NOT_CONFIGURED");
  assert.equal(sb.calls.length, 0);
  assert.equal(mailer.sent.length, 0);
});

test("APP_BASE_URL must be https (or localhost): otherwise email stays disabled", async () => {
  const { call } = setup({ env: { ...ENV, APP_BASE_URL: "http://themba.example" } });
  assert.equal((await call(valid)).statusCode, 503);
  const local = setup({ env: { ...ENV, APP_BASE_URL: "http://localhost:3000" } });
  assert.equal((await local.call(valid)).statusCode, 200);
});

test("requires a verified Supabase session", async () => {
  let s = setup();
  let res = await s.call(valid, {});
  assert.equal(res.statusCode, 401);
  assert.equal(s.sb.calls.length, 0);

  s = setup({ supabase: { user: response(401, { msg: "invalid JWT" }) } });
  res = await s.call(valid);
  assert.equal(res.statusCode, 401);
  assert.equal(s.sb.calls.some((c) => c.url.endsWith("invite_member")), false);
  assert.equal(s.mailer.sent.length, 0);
});

test("rejects bad input without creating an invitation or sending mail", async () => {
  for (const [body, code] of [
    [{ ...valid, email: "not-an-email" }, "INVALID_EMAIL"],
    [{ ...valid, email: "a@b.co\r\nBcc: victim@example.com" }, "INVALID_EMAIL"],
    [{ ...valid, stokvelId: "x?select=*" }, "INVALID_STOKVEL"],
    [{ ...valid, role: "treasurer" }, "INVALID_ROLE"],
    [{}, "INVALID_STOKVEL"]
  ]) {
    const s = setup();
    const res = await s.call(body);
    assert.equal(res.statusCode, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, code);
    assert.equal(s.sb.calls.some((c) => c.url.endsWith("invite_member")), false);
    assert.equal(s.mailer.sent.length, 0);
  }
});

test("a caller who may not invite gets 403 and nothing is emailed", async () => {
  for (const rpc of [response(403, { message: "permission denied" }), response(400, { code: "42501", message: "not a treasurer" })]) {
    const s = setup({ supabase: { rpc } });
    const res = await s.call(valid);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, "NOT_ALLOWED");
    assert.equal(s.mailer.sent.length, 0);
  }
});

test("a database rejection message is shown, a database outage is a 502", async () => {
  let s = setup({ supabase: { rpc: response(400, { message: "Already a member of this stokvel" }) } });
  let res = await s.call(valid);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.message, "Already a member of this stokvel");
  s = setup({ supabase: { rpc: response(500, { message: "boom" }) } });
  assert.equal((await s.call(valid)).statusCode, 502);
  assert.equal(s.mailer.sent.length, 0);
});

test("email failure keeps the invitation and returns the private link for manual sharing", async () => {
  const s = setup({ mailer: fakeMailer(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNECTION" })) });
  const res = await s.call(valid);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error.code, "EMAIL_SEND_FAILED");
  assert.equal(res.body.link, "https://themba.example/dashboards/login.html?invite=TOKEN%20abc%2F123");
  assert.doesNotMatch(JSON.stringify(res.body), /ECONNREFUSED/); // SMTP internals are not leaked
});

test("names are escaped in HTML and cannot inject headers or markup", async () => {
  const s = setup({ supabase: {
    stokvel: response(200, [{ name: 'Evil <script>alert(1)</script>\r\nBcc: x@y.z' }]),
    profile: response(200, [{ full_name: '"><img src=x onerror=alert(1)>' }])
  } });
  const res = await s.call(valid);
  assert.equal(res.statusCode, 200);
  const mail = s.mailer.sent[0];
  assert.doesNotMatch(mail.subject, /[\r\n]/);
  assert.doesNotMatch(mail.html, /<script>|<img src=x/);
  assert.match(mail.html, /&lt;script&gt;/);
});

test("still sends with generic wording if the stokvel / profile lookups fail", async () => {
  const s = setup({ supabase: { stokvel: response(500, {}), profile: response(404, {}) } });
  const res = await s.call(valid);
  assert.equal(res.statusCode, 200);
  assert.match(s.mailer.sent[0].subject, /A Themba member invited you to join a stokvel/);
});

test("rate limits repeat invitations to the same person and per signed-in user", async () => {
  const s = setup();
  for (let i = 0; i < 3; i += 1) assert.equal((await s.call(valid)).statusCode, 200);
  const limited = await s.call(valid);
  assert.equal(limited.statusCode, 429);
  assert.ok(Number(limited.headers["Retry-After"]) > 0);
  assert.equal(s.mailer.sent.length, 3);
  assert.equal(s.sb.calls.filter((c) => c.url.endsWith("invite_member")).length, 3);

  const user = setup({ limits: { perUserPerHour: 2 } });
  assert.equal((await user.call({ ...valid, email: "a@example.com" })).statusCode, 200);
  assert.equal((await user.call({ ...valid, email: "b@example.com" })).statusCode, 200);
  assert.equal((await user.call({ ...valid, email: "c@example.com" })).statusCode, 429);
});

test("email template states the recipient, expiry, ignore-if-unexpected, and a plain-text part", () => {
  const mail = buildEmail({ inviterName: "Thandi", stokvelName: "Khula", recipient: "z@example.com", joinUrl: "https://x/login.html?invite=T", signupUrl: "https://x/signup.html?invite=T", expiryDays: 7 });
  for (const part of [mail.text, mail.html]) {
    assert.match(part, /z@example\.com/);
    assert.match(part, /7 days/);
    assert.match(part, /ignore this email/);
  }
});

/* ---- browser helper: ThembaAPI.sendInvitation ---- */

function loadClient({ fetchImpl, rpcResult = "TOKEN-1", session = { access_token: "tok", user: { id: "user-1" } } }) {
  const rpcCalls = [];
  const sb = {
    auth: { getSession: async () => ({ data: { session } }) },
    rpc: async (name, args) => { rpcCalls.push({ name, args }); return { data: rpcResult, error: null }; }
  };
  const window = {
    THEMBA_CONFIG: { SUPABASE_URL: "https://project.supabase.co", SUPABASE_ANON_KEY: "anon" },
    supabase: { createClient: () => sb },
    location: { href: "https://themba.example/dashboards/members-dashboard.html" }
  };
  const context = { window, fetch: fetchImpl, URL, JSON, Promise, Error, Object, String, console };
  vm.createContext(context);
  vm.runInContext(read("scripts/supabase-client.js"), context);
  return { api: window.ThembaAPI, rpcCalls, window };
}

test("browser helper posts the session token and reports success when emailed", async () => {
  const seen = [];
  const { api, rpcCalls } = loadClient({ fetchImpl: async (url, init) => { seen.push({ url, init }); return response(200, { data: { emailed: true } }); } });
  const out = await api.sendInvitation(STOKVEL, " Zinhle@Example.com ");
  assert.deepEqual({ ...out }, { emailed: true, email: "zinhle@example.com" });
  assert.equal(seen[0].url, "/api/invitations/email");
  assert.equal(seen[0].init.headers.Authorization, "Bearer tok");
  assert.deepEqual(JSON.parse(seen[0].init.body), { stokvelId: STOKVEL, email: "zinhle@example.com", role: "member" });
  assert.equal(rpcCalls.length, 0); // the server creates the token; the browser never sees it
});

test("browser helper falls back to the existing private-link flow when email is unavailable", async () => {
  for (const fetchImpl of [
    async () => response(503, { error: { code: "EMAIL_NOT_CONFIGURED", message: "no" } }),
    async () => response(404, {}),
    async () => { throw new TypeError("Failed to fetch"); }
  ]) {
    const { api, rpcCalls } = loadClient({ fetchImpl, rpcResult: "TOKEN 1" });
    const out = await api.sendInvitation(STOKVEL, "z@example.com");
    assert.equal(out.emailed, false);
    assert.equal(out.link, "https://themba.example/dashboards/login.html?invite=TOKEN+1");
    assert.equal(rpcCalls.length, 1);
    assert.equal(rpcCalls[0].name, "invite_member");
    assert.deepEqual({ ...rpcCalls[0].args }, { p_stokvel: STOKVEL, p_email: "z@example.com", p_role: "member" });
  }
});

test("browser helper returns the server's link when the invite exists but the email failed (no second invite)", async () => {
  const { api, rpcCalls } = loadClient({ fetchImpl: async () => response(502, { error: { code: "EMAIL_SEND_FAILED" }, link: "https://themba.example/dashboards/login.html?invite=T" }) });
  const out = await api.sendInvitation(STOKVEL, "z@example.com");
  assert.equal(out.emailed, false);
  assert.equal(out.link, "https://themba.example/dashboards/login.html?invite=T");
  assert.equal(rpcCalls.length, 0);
});

test("browser helper surfaces real errors instead of silently falling back", async () => {
  for (const [status, code, message] of [[403, "NOT_ALLOWED", "You are not allowed to invite members to this stokvel."], [429, "RATE_LIMITED", "Wait a bit."], [400, "INVALID_EMAIL", "Enter a valid email address."]]) {
    const { api, rpcCalls } = loadClient({ fetchImpl: async () => response(status, { error: { code, message } }) });
    await assert.rejects(() => api.sendInvitation(STOKVEL, "z@example.com"), { message });
    assert.equal(rpcCalls.length, 0);
  }
  const signedOut = loadClient({ fetchImpl: async () => response(200, {}), session: null });
  await assert.rejects(() => signedOut.api.sendInvitation(STOKVEL, "z@example.com"), /Not signed in/);
});

test("browser helper refuses to act for a different account than the tab was opened with", async () => {
  const { api, window } = loadClient({ fetchImpl: async () => response(200, {}) });
  window.ThembaBindUser("someone-else");
  await assert.rejects(() => api.sendInvitation(STOKVEL, "z@example.com"), /different account/);
});

/* ---- wiring ---- */

test("server mounts the authenticated email route and keeps the open relay disabled", () => {
  const server = read("src/server.js");
  assert.match(server, /app\.post\(INVITATION_EMAIL_ROUTE, createInvitationEmailHandler\(\)\)/);
  assert.match(server, /'\/api\/send-invite'[\s\S]*?status\(503\)/);
});

test("both invite forms use sendInvitation and the members modal keeps its duplicate-handler guard", () => {
  assert.match(read("scripts/live-data.js"), /api\.sendInvitation\(S\.sid/);
  const html = read("dashboards/members-dashboard.html");
  assert.match(html, /window\.ThembaAPI\.sendInvitation\(/);
  assert.match(html, /event\.stopImmediatePropagation\(\)/);
  assert.match(html, /Send Invitation/);
});

test("no secrets are shipped to the browser", () => {
  for (const file of ["scripts/supabase-client.js", "scripts/live-data.js", "dashboards/members-dashboard.html", "scripts/config.js"]) {
    assert.doesNotMatch(read(file), /SMTP_PASS|SMTP_USER|MAIL_FROM|SUPABASE_SERVICE_ROLE/, file);
  }
});
