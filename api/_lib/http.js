function sendJson(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
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
  } else if (
    code === "HANDSHAKE_SSL_ERROR" ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    /self-signed certificate|certificate chain|SSL connection/i.test(msg)
  ) {
    error =
      "Koneksi TLS ke database gagal. Coba set DB_SSL=0 jika server tidak memakai TLS, atau hubungi penyedia hosting. Verifikasi CA ketat: DB_SSL_STRICT=1 (butuh CA resmi).";
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
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body !== "") {
    try {
      return JSON.parse(req.body);
    } catch (_e) {
      return {};
    }
  }
  const raw = await new Promise((resolve, reject) => {
    let data = "";
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
