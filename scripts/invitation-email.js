// scripts/invitation-email.js
// Server-side delivery of stokvel invitation emails.
//
// Flow (POST /api/invitations/email):
//   1. The treasurer's browser sends { stokvelId, email } with its Supabase access token.
//   2. This service verifies that token with Supabase Auth.
//   3. It calls the EXISTING invite_member RPC *as that user* (their JWT, the public anon key).
//      Supabase therefore enforces who may invite, and creates the invitation token. The
//      service-role key is never used or needed.
//   4. It emails the recipient a personalised invitation with a button to join.
//   5. The button opens login.html?invite=<token>; the existing login / signup / accept_invite
//      flow does the rest.
//
// Because the server creates the token itself, a caller cannot make this service email an
// arbitrary token or an arbitrary message: every email is the fixed template below, and only
// for an invitation the database has just agreed to create.
//
// Configuration comes from environment variables (see .env.example). Secrets stay on the server.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Same .env loading approach as scripts/safe-proxy.js (Node 20.12+); harmless if absent.
try {
  if (typeof process.loadEnvFile === "function") process.loadEnvFile(path.resolve(__dirname, "..", ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const ROUTE = "/api/invitations/email";
const HOUR = 60 * 60 * 1000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EMAIL_PATTERN = /^[^\s@<>()[\],;:"\\]+@[^\s@<>()[\],;:"\\]+\.[^\s@<>()[\],;:"\\]{2,}$/;
const ALLOWED_ROLES = new Set(["member"]);
const FETCH_TIMEOUT_MS = 8000;

/* ------------------------------ configuration ------------------------------ */

// The Supabase URL and anon key are public values already shipped in scripts/config.js,
// so fall back to reading them from there when the env vars are not set.
function readPublicConfig() {
  try {
    const text = fs.readFileSync(path.resolve(__dirname, "config.js"), "utf8");
    return {
      url: (text.match(/SUPABASE_URL\s*:\s*["']([^"']+)["']/) || [])[1] || "",
      anonKey: (text.match(/SUPABASE_ANON_KEY\s*:\s*["']([^"']+)["']/) || [])[1] || ""
    };
  } catch (_error) {
    return { url: "", anonKey: "" };
  }
}

function readConfig(env = process.env) {
  const fallback = readPublicConfig();
  const supabaseUrl = String(env.SUPABASE_URL || fallback.url || "").trim().replace(/\/+$/, "");
  const anonKey = String(env.SUPABASE_ANON_KEY || fallback.anonKey || "").trim();

  // The link in the email is built from this fixed, trusted value, never from the request's
  // Host header, so a forged Host cannot turn invitations into phishing links.
  let appBaseUrl = "";
  try {
    const parsed = new URL(String(env.APP_BASE_URL || "").trim());
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.protocol === "https:" || (parsed.protocol === "http:" && local)) {
      appBaseUrl = parsed.origin + parsed.pathname.replace(/\/+$/, "");
    }
  } catch (_error) { /* left empty, reported as not configured */ }

  const port = Number(env.SMTP_PORT) || 587;
  const secure = env.SMTP_SECURE ? String(env.SMTP_SECURE).toLowerCase() === "true" : port === 465;
  const smtp = {
    host: String(env.SMTP_HOST || "").trim(),
    port,
    secure,
    user: String(env.SMTP_USER || ""),
    pass: String(env.SMTP_PASS || "")
  };
  const from = String(env.MAIL_FROM || "").replace(/[\r\n]+/g, " ").trim();
  const expiryDays = Math.max(1, Number(env.INVITE_EXPIRY_DAYS) || 7);

  const missing = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!anonKey) missing.push("SUPABASE_ANON_KEY");
  if (!appBaseUrl) missing.push("APP_BASE_URL (https URL, or http://localhost)");
  if (!smtp.host) missing.push("SMTP_HOST");
  if (!from) missing.push("MAIL_FROM");

  return { supabaseUrl, anonKey, appBaseUrl, smtp, from, expiryDays, missing };
}

/* ------------------------------ small helpers ------------------------------ */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Names go into the subject line and body: strip control characters / line breaks and cap length.
function cleanName(value, fallback, max = 80) {
  const text = String(value || "").replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return text || fallback;
}

function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: { code, message }, ...extra });
}

async function timedFetch(fetchImpl, url, init = {}) {
  return fetchImpl(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// Simple in-memory sliding window. Fine for one server process; use a shared store if you scale out.
function createLimiter(limit, windowMs, now) {
  const hits = new Map();
  return {
    // Returns 0 if allowed (and records the hit), otherwise the seconds to wait.
    take(key) {
      const t = now();
      const fresh = (hits.get(key) || []).filter((stamp) => t - stamp < windowMs);
      if (fresh.length >= limit) {
        hits.set(key, fresh);
        return Math.max(1, Math.ceil((fresh[0] + windowMs - t) / 1000));
      }
      fresh.push(t);
      hits.set(key, fresh);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((s) => t - s < windowMs)) hits.delete(k);
      return 0;
    }
  };
}

/* --------------------------------- email ---------------------------------- */

function buildEmail({ inviterName, stokvelName, recipient, joinUrl, signupUrl, expiryDays }) {
  const subject = `${inviterName} invited you to join ${stokvelName} on Themba`;
  const text = [
    `Hi,`,
    ``,
    `${inviterName} has invited you to join the stokvel "${stokvelName}" on Themba.`,
    ``,
    `Join the stokvel: ${joinUrl}`,
    ``,
    `Already have a Themba account? Sign in with ${recipient} and the invitation is added to your account.`,
    `New to Themba? Create your account with ${recipient}: ${signupUrl}`,
    ``,
    `This invitation was made for ${recipient} and expires in ${expiryDays} days. Please use that email address, otherwise it will not be accepted.`,
    ``,
    `If you were not expecting this, you can safely ignore this email. Nothing happens unless you accept.`,
    ``,
    `Themba`
  ].join("\n");

  const e = { inviter: escapeHtml(inviterName), stokvel: escapeHtml(stokvelName), to: escapeHtml(recipient), join: escapeHtml(joinUrl), signup: escapeHtml(signupUrl) };
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#0b1310;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e.inviter} invited you to join ${e.stokvel} on Themba.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1310;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0d1612;border:1px solid #1f3a2b;border-radius:14px;font-family:Arial,Helvetica,sans-serif;color:#e8efe9;">
<tr><td style="padding:28px 32px 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e9c46a;font-weight:bold;">Themba</td></tr>
<tr><td style="padding:8px 32px 0;font-size:24px;line-height:1.3;font-weight:bold;color:#ffffff;">You&rsquo;re invited to join ${e.stokvel}</td></tr>
<tr><td style="padding:16px 32px 0;font-size:16px;line-height:1.6;color:#c9d6cd;"><strong style="color:#ffffff;">${e.inviter}</strong> has invited you to join the stokvel <strong style="color:#ffffff;">${e.stokvel}</strong> on Themba, a shared space to save, split bills and manage group money together.</td></tr>
<tr><td align="center" style="padding:28px 32px;">
<a href="${e.join}" style="display:inline-block;background:#e9c46a;color:#07150e;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:10px;">Join ${e.stokvel}</a>
</td></tr>
<tr><td style="padding:0 32px;font-size:14px;line-height:1.6;color:#c9d6cd;">
<p style="margin:0 0 10px;"><strong style="color:#ffffff;">Already on Themba?</strong> Sign in and the invitation is added to your existing account.</p>
<p style="margin:0;"><strong style="color:#ffffff;">New here?</strong> <a href="${e.signup}" style="color:#e9c46a;">Create your account</a>, then accept the invitation.</p>
</td></tr>
<tr><td style="padding:20px 32px 0;font-size:13px;line-height:1.6;color:#9fb3a6;">This invitation was made for <strong>${e.to}</strong> and expires in ${expiryDays} days. Please sign in or sign up with that email address, otherwise it cannot be accepted.</td></tr>
<tr><td style="padding:16px 32px 0;font-size:12px;line-height:1.6;color:#7d948a;">Button not working? Copy this link into your browser:<br><span style="word-break:break-all;color:#9fb3a6;">${e.join}</span></td></tr>
<tr><td style="padding:20px 32px 28px;font-size:12px;line-height:1.6;color:#7d948a;border-top:1px solid #1f3a2b;margin-top:20px;">If you weren&rsquo;t expecting this, you can safely ignore this email. Nothing happens unless you accept.</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}

/* -------------------------------- handler --------------------------------- */

function createInvitationEmailHandler(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || Date.now;
  const config = readConfig(env);
  const perUser = createLimiter(options.perUserPerHour || 30, HOUR, now);
  const perRecipient = createLimiter(options.perRecipientPerHour || 3, HOUR, now);

  let transporter = options.transporter || null;
  function getTransporter() {
    if (!transporter) {
      const nodemailer = require("nodemailer"); // loaded lazily so the app still starts without SMTP set up
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000
      });
    }
    return transporter;
  }

  const configured = config.missing.length === 0;
  if (!configured && options.quiet !== true) {
    console.warn(`\n  Invitation email is NOT configured (missing: ${config.missing.join(", ")}).`);
    console.warn("  Treasurers will get a private invitation link to share manually instead. See .env.example.\n");
  } else if (options.quiet !== true) {
    console.log(`  Invitation email: enabled (sending as ${config.from} via ${config.smtp.host}).`);
  }

  async function handler(req, res) {
    try {
      // The email feature needs complete server configuration; the browser falls back to the manual link.
      if (!configured) {
        return fail(res, 503, "EMAIL_NOT_CONFIGURED", "Invitation email is not set up on this server.");
      }

      // 1. Who is calling? Verify their Supabase session with Supabase itself.
      const header = String((req.headers && req.headers.authorization) || "");
      const match = header.match(/^Bearer ([A-Za-z0-9._~+/=-]{20,4096})$/);
      if (!match) return fail(res, 401, "UNAUTHENTICATED", "Sign in to send invitations.");
      const jwt = match[1];

      const userResponse = await timedFetch(fetchImpl, `${config.supabaseUrl}/auth/v1/user`, {
        headers: { apikey: config.anonKey, Authorization: `Bearer ${jwt}` }
      });
      if (!userResponse.ok) return fail(res, 401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");
      const user = await userResponse.json().catch(() => null);
      if (!user || !user.id) return fail(res, 401, "UNAUTHENTICATED", "Your session could not be verified.");

      // 2. Validate input.
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const stokvelId = typeof body.stokvelId === "string" ? body.stokvelId.trim() : "";
      const recipient = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const role = body.role === undefined ? "member" : body.role;
      if (!ID_PATTERN.test(stokvelId)) return fail(res, 400, "INVALID_STOKVEL", "Choose a stokvel to invite to.");
      if (recipient.length > 254 || !EMAIL_PATTERN.test(recipient)) return fail(res, 400, "INVALID_EMAIL", "Enter a valid email address.");
      if (!ALLOWED_ROLES.has(role)) return fail(res, 400, "INVALID_ROLE", "Only member invitations can be sent by email.");

      // 3. Throttle, so this cannot be used to spam an inbox or burn the sending quota.
      const waitUser = perUser.take(user.id);
      const waitRecipient = waitUser ? 0 : perRecipient.take(`${stokvelId}:${recipient}`);
      const wait = waitUser || waitRecipient;
      if (wait) {
        res.set("Retry-After", String(wait));
        return fail(res, 429, "RATE_LIMITED", waitRecipient
          ? "That person was invited recently. Please wait before sending another email."
          : "Too many invitations sent. Please try again later.");
      }

      // 4. Supabase creates the invitation token, authorised as the caller (invite_member checks the role).
      const rpcResponse = await timedFetch(fetchImpl, `${config.supabaseUrl}/rest/v1/rpc/invite_member`, {
        method: "POST",
        headers: { apikey: config.anonKey, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_stokvel: stokvelId, p_email: recipient, p_role: role })
      });
      if (!rpcResponse.ok) {
        const problem = await rpcResponse.json().catch(() => ({}));
        if (rpcResponse.status === 401 || rpcResponse.status === 403 || problem.code === "42501") {
          return fail(res, 403, "NOT_ALLOWED", "You are not allowed to invite members to this stokvel.");
        }
        if (rpcResponse.status >= 500) return fail(res, 502, "INVITE_FAILED", "The invitation could not be created. Please try again.");
        return fail(res, 400, "INVITE_REJECTED", cleanName(problem.message, "The invitation could not be created.", 200));
      }
      let token = await rpcResponse.json().catch(() => null);
      if (Array.isArray(token)) token = token[0];
      if (token && typeof token === "object") token = token.token || token.invite_token || token.code;
      if (typeof token !== "string" || !token.trim()) {
        return fail(res, 502, "INVITE_FAILED", "The invitation service returned an unexpected response.");
      }
      token = token.trim();

      const encoded = encodeURIComponent(token);
      const joinUrl = `${config.appBaseUrl}/dashboards/login.html?invite=${encoded}`;
      const signupUrl = `${config.appBaseUrl}/dashboards/signup.html?invite=${encoded}`;

      // 5. Personalise (best effort, using the caller's own permissions). A failure just means generic wording.
      const lookup = async (table, filter, column) => {
        try {
          const r = await timedFetch(fetchImpl, `${config.supabaseUrl}/rest/v1/${table}?${filter}&select=${column}`, {
            headers: { apikey: config.anonKey, Authorization: `Bearer ${jwt}` }
          });
          if (!r.ok) return "";
          const rows = await r.json();
          return Array.isArray(rows) && rows[0] ? rows[0][column] : "";
        } catch (_error) { return ""; }
      };
      const [stokvelRaw, inviterRaw] = await Promise.all([
        lookup("stokvels", `id=eq.${encodeURIComponent(stokvelId)}`, "name"),
        lookup("profiles", `id=eq.${encodeURIComponent(user.id)}`, "full_name")
      ]);
      const stokvelName = cleanName(stokvelRaw, "a stokvel");
      const inviterName = cleanName(inviterRaw, "A Themba member");

      // 6. Send.
      const message = buildEmail({ inviterName, stokvelName, recipient, joinUrl, signupUrl, expiryDays: config.expiryDays });
      try {
        await getTransporter().sendMail({ from: config.from, to: recipient, subject: message.subject, text: message.text, html: message.html });
      } catch (error) {
        // Log the cause, never the token. The invitation exists, so hand the (already authorised)
        // treasurer the private link to share manually.
        console.error("Invitation email failed:", error && (error.code || error.message));
        return fail(res, 502, "EMAIL_SEND_FAILED", "The invitation was created but the email could not be sent.", { link: joinUrl });
      }

      return res.status(200).json({ data: { emailed: true, to: recipient } });
    } catch (error) {
      console.error("Invitation email error:", error && (error.code || error.message));
      return fail(res, 500, "INTERNAL_SERVER_ERROR", "Something went wrong sending the invitation.");
    }
  }

  handler.configured = configured;
  handler.config = config;
  return handler;
}

module.exports = { ROUTE, createInvitationEmailHandler, readConfig, buildEmail, escapeHtml };
