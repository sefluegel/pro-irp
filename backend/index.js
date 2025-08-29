const express = require("express");
const cors = require("cors");
const pkg = require("./package.json");

const app = express();

// CORS: allow all origins for now (we'll lock down later)
app.use(cors({ origin: true, credentials: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/version", (_req, res) => {
  const sha = process.env.GIT_SHA || "dev";
  const time = process.env.BUILD_TIME || new Date().toISOString();
  res.json({
    name: pkg.name || "pro-irp-api",
    version: pkg.version || "1.0.0",
    sha,
    time,
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
