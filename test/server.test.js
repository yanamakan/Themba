"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");
const app = require("../src/server");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("health endpoint identifies the demo environment and unconfigured database", async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    environment: "demo",
    database: "not_configured"
  });
});

test("treasurer endpoints return the dashboard demo data", async () => {
  const endpoints = [
    ["/api/treasurer/overview", "groupBalance"],
    ["/api/treasurer/contributions"],
    ["/api/treasurer/transactions"],
    ["/api/treasurer/approvals"]
  ];

  for (const [endpoint, key] of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    const body = await response.json();

    assert.equal(response.status, 200, endpoint);
    assert.ok(body.data, endpoint);
    if (key) assert.ok(body.data[key], `${endpoint} should contain ${key}`);
    else assert.ok(body.data.length > 0, `${endpoint} should return records`);
  }
});

test("platform overview endpoint returns platform metrics", async () => {
  const response = await fetch(`${baseUrl}/api/platform/overview`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.activeStokvels, 684);
  assert.equal(body.data.registeredUsers, 8429);
});

test("unknown API routes return a JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "NOT_FOUND");
});

test("Safe proxy forwards allowed requests with the server-side API key", async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.SAFE_API_KEY;
  let upstreamRequest;
  process.env.SAFE_API_KEY = "safe-proxy-test-key";
  global.fetch = async (url, options) => {
    upstreamRequest = { url: String(url), options };
    return new Response(JSON.stringify({ count: 0, results: [] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    const response = await new Promise((resolve, reject) => {
      http.get(`${baseUrl}/api/safe-proxy/v2/safes/0xdFCAc3d0006A920E005212eE3c0F357B5c24DFB4/multisig-transactions/?executed=false`, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      }).on("error", reject);
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { count: 0, results: [] });
    assert.equal(
      upstreamRequest.url,
      "https://api.safe.global/tx-service/sep/api/v2/safes/0xdFCAc3d0006A920E005212eE3c0F357B5c24DFB4/multisig-transactions/?executed=false"
    );
    assert.equal(upstreamRequest.options.headers.Authorization, "Bearer safe-proxy-test-key");
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.SAFE_API_KEY;
    else process.env.SAFE_API_KEY = originalApiKey;
  }
});

test("the server serves the existing login page", async () => {
  const response = await fetch(`${baseUrl}/login.html`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
});

test("the server serves dashboard pages, styles, and scripts from their folders", async () => {
  const paths = [
    "/dashboards/members-dashboard.html",
    "/dashboards/treasurer-dashboard.html",
    "/dashboards/platform-admin-dashboard.html",
    "/dashboards/login.html",
    "/dashboards/signup.html",
    "/dashboards/dashboard.css",
    "/dashboards/treasurer.css",
    "/dashboards/platform-admin.css",
    "/styles/theme.css",
    "/styles/auth.css",
    "/scripts/auth.js",
    "/scripts/dashboard.js",
    "/scripts/dashboard.bundle.js",
    "/scripts/treasurer.js",
    "/scripts/platform-admin.js"
  ];

  for (const resource of paths) {
    const response = await fetch(`${baseUrl}${resource}`);
    assert.equal(response.status, 200, resource);
  }
});

test('legacy login and signup redirects retain invitation tokens', async () => {
  for (const page of ['login', 'signup']) {
    const response = await fetch(`${baseUrl}/${page}.html?invite=abc%2B123`, {redirect:'manual'});
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), `/dashboards/${page}.html?invite=abc%2B123`);
  }
});
test('legacy unauthenticated email endpoint cannot send invitations', async () => {
  const response = await fetch(`${baseUrl}/api/send-invite`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'someone@example.com',inviteCode:'123'})});
  assert.equal(response.status, 503);
});
