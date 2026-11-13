"use strict";

const path = require("node:path");
const express = require("express");
const { createSafeProxy } = require("../scripts/safe-proxy");
const {
  approvals,
  contributions,
  platformOverview,
  transactions,
  treasurerOverview
} = require("./data/demo-data");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.resolve(__dirname, ".."), {
  dotfiles: "ignore",
  index: false
}));
app.use("/api/safe-proxy", createSafeProxy());
app.post('/api/send-invite', (_req, res) => {
  return res.status(503).json({ error: 'Use the authenticated invitation-link flow.' });
});

app.get("/", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "..", "index.html"));
});

app.get("/login.html", (_req, res) => {
  res.redirect("/dashboards/login.html" + (_req.originalUrl.includes("?") ? _req.originalUrl.slice(_req.originalUrl.indexOf("?")) : ""));
});

app.get("/signup.html", (_req, res) => {
  res.redirect("/dashboards/signup.html" + (_req.originalUrl.includes("?") ? _req.originalUrl.slice(_req.originalUrl.indexOf("?")) : ""));
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: "demo",
    database: "not_configured"
  });
});

app.get("/api/treasurer/overview", (_req, res) => {
  res.json({ data: treasurerOverview });
});

app.get("/api/treasurer/contributions", (_req, res) => {
  res.json({ data: contributions });
});

app.get("/api/treasurer/transactions", (_req, res) => {
  res.json({ data: transactions });
});

app.get("/api/treasurer/approvals", (_req, res) => {
  res.json({ data: approvals });
});

app.get("/api/platform/overview", (_req, res) => {
  res.json({ data: platformOverview });
});

app.use("/api", (_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "API endpoint not found."
    }
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON."
      }
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred."
    }
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Themba demo API listening on http://localhost:${port}`);
    console.log("Demo data is in memory only; no database or real financial services are connected.");
  });
}

module.exports = app;