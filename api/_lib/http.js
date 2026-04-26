function jsonReplacer(_key, value) {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

function sendJson(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    res.end(JSON.stringify(data, jsonReplacer));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: "Server error" }, jsonReplacer));
  }
}

function sendServerError(res, err) {
  console.error(err);
  let error = "Server error";
  const code = err && err.code;
  const msg = err && err.message ? String(err.message) : "";
  if (/^Missing DB env:/i.test(msg)) {
    error =
      "Database belum dikonfigurasi di deployment (tambahkan DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME di Environment Variables Vercel).";
  } else if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND") {
    error = "Tidak bisa terhubung ke server database (host/port atau jaringan).";
  } else if (code === "ER_ACCESS_DENIED_ERROR") {
    error = "Akses database ditolak (periksa DB_USER / DB_PASS).";
  } else if (code === "ER_BAD_DB_ERROR") {
    error = "Nama database tidak ditemukan (periksa DB_NAME).";
  } else if (code === "ER_NO_SUCH_TABLE" || (msg && /doesn't exist/i.test(msg) && /Table/i.test(msg))) {
    error = "Tabel belum dibuat. Impor file sql/schema.sql ke MySQL.";
  } else if (code === "PROTOCOL_CONNECTION_LOST" || (msg && /protocol connection/i.test(msg))) {
    error = "Koneksi ke database putus. Coba lagi; periksa DB_HOST, firewall, dan SSL (DB_SSL).";
  } else if (
    code === "HANDSHAKE_SSL_ERROR" ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    /self-signed certificate|certificate chain|SSL connection/i.test(msg)
  ) {
    error =
      "Koneksi TLS ke database gagal. Coba set DB_SSL=0 jika server tidak memakai TLS, atau hubungi penyedia hosting. Verifikasi CA ketat: DB_SSL_STRICT=1 (butuh CA resmi).";
  } else if (msg && /Data too long for column|ER_DATA_TOO_LONG/i.test(msg)) {
    error = "Data melebihi batas di database.";
  } else if (String(process.env.API_DEBUG) === "1" && (code || msg)) {
    error = [code, String(msg).slice(0, 200)].filter(Boolean).join(" ");
  }
  return sendJson(res, 500, { ok: false, error });
}

function methodNotAllowed(res) {
  sendJson(res, 405, { ok: false, error: "Method not allowed" });
}

function getQuery(req, key) {
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, key)) {
    return req.query[key];
  }
  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get(key);
}

async function readJsonBody(req) {
  if (Buffer.isBuffer(req.body)) {
    const s = req.body.toString("utf8");
    if (!s) return {};
    try {
      return JSON.parse(s);
    } catch (_e) {
      return {};
    }
  }
  if (typeof req.body === "string") {
    if (req.body === "") return {};
    try {
      return JSON.parse(req.body);
    } catch (_e) {
      return {};
    }
  }
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    return req.body;
  }
  const raw = await new Promise((resolve, reject) => {
    let data = "";
    if (!req || typeof req.on !== "function") {
      return resolve("");
    }
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return {};
  }
}

module.exports = { sendJson, sendServerError, methodNotAllowed, getQuery, readJsonBody };
