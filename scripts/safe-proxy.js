// scripts/safe-proxy.js
// Forwards Safe Transaction Service calls from the browser and adds the API key
// on the server, so the key never appears in front-end code.
//
// Needs a .env file in the project root:
//   SAFE_API_KEY=your_key_here
// Optional:
//   SAFE_TX_SERVICE_URL=https://api.safe.global/tx-service/sep

"use strict";

const express = require("express");
const path = require("node:path");

// Load .env without needing the dotenv package (Node 20.12+).
try {
  process.loadEnvFile(path.resolve(__dirname, "..", ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const DEFAULT_BASE = "https://api.safe.global/tx-service/sep";

// Only the Safe endpoints the app actually uses.
const ALLOWED_PATH = /^\/api\/v[12]\/(safes|multisig-transactions|about)(\/|$)/;

function createSafeProxy() {
  if (!process.env.SAFE_API_KEY) {
    console.warn("\n  WARNING: SAFE_API_KEY is not set, so the Safe panel cannot load pending/executed requests (HTTP 500).");
    console.warn("  Create a file named exactly .env in the project root (next to package.json) containing:");
    console.warn("    SAFE_API_KEY=your_key_here");
    console.warn("  then restart the server. (On Windows check it is not called .env.txt.)\n");
  } else {
    console.log(`  Safe proxy: SAFE_API_KEY loaded (${process.env.SAFE_API_KEY.length} characters).`);
  }
  const router = express.Router();
  router.use(express.json({ limit: "100kb" }));

  router.use(async (req, res) => {
    const apiKey = process.env.SAFE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "SAFE_API_KEY is not set on the server. Add it to .env and restart." });
    }
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed." });
    }
    // Some API Kit versions call /v1/... and others /api/v1/... on a custom URL.
    // Normalise to /api/... because Safe's real endpoints live under /api.
    const incoming = req.url; // path + query string
    const normalized = incoming.startsWith("/api/") ? incoming : `/api${incoming}`;
    const pathOnly = normalized.split("?")[0];
    if (!ALLOWED_PATH.test(pathOnly)) {
      return res.status(403).json({ error: "This Safe endpoint is not allowed through the proxy." });
    }

    const base = (process.env.SAFE_TX_SERVICE_URL || DEFAULT_BASE).replace(/\/+$/, "");
    const url = `${base}${normalized}`;

    try {
      const upstream = await fetch(url, {
        method: req.method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: req.method === "POST" ? JSON.stringify(req.body ?? {}) : undefined,
        signal: AbortSignal.timeout(15000)
      });
      const text = await upstream.text();
      if (!upstream.ok) {
        console.error(`Safe proxy: ${req.method} ${url} -> ${upstream.status} ${text.slice(0, 200)}`);
      }
      res.status(upstream.status);
      res.set("Content-Type", upstream.headers.get("content-type") || "application/json");
      return res.send(text);
    } catch (error) {
      console.error("Safe proxy error:", error.message);
      return res.status(502).json({ error: "Could not reach the Safe service." });
    }
  });

  return router;
}

module.exports = { createSafeProxy };