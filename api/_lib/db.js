const mysql = require("mysql2/promise");

let pool;

function resolveSsl() {
  const flag = String(process.env.DB_SSL || "").toLowerCase();
  const host = String(process.env.DB_HOST || "").toLowerCase();
  const isLocal = !host || host === "localhost" || host === "127.0.0.1";

  if (flag === "0" || flag === "false" || flag === "off") return undefined;

  const wantSsl =
    flag === "1" || flag === "true" || flag === "on" || (!isLocal && flag === "");

  if (!wantSsl) return undefined;

  const strict =
    process.env.DB_SSL_STRICT === "1" || String(process.env.DB_SSL_STRICT || "").toLowerCase() === "true";
  if (strict) {
    return {};
  }
  // Default: TLS dengan CA self-signed (umum di shared MySQL). Verifikasi CA penuh: DB_SSL_STRICT=1.
  return { rejectUnauthorized: false };
}

function db() {
  if (!pool) {
    const required = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing DB env: ${missing.join(", ")}`);
    }

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      charset: "utf8mb4",
      ssl: resolveSsl(),
    });
  }
  return pool;
}

module.exports = { db };
