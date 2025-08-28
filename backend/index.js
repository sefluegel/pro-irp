require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

const PORT = process.env.PORT || 5000;
const ORIGINS = [
  process.env.CORS_ORIGIN || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://www.proirp.com",
];

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: ORIGINS, credentials: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "pro-irp-backend",
    env: process.env.NODE_ENV || "dev",
    time: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
