const bcrypt = require("bcryptjs");
const { db } = require("../../_lib/db");
const { sendJson, sendServerError, methodNotAllowed, readJsonBody } = require("../../_lib/http");
const { requireAuth } = require("../../_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const body = await readJsonBody(req);
    const cur = String(body.current_password || "");
    const newPassword = String(body.new_password || "");

    if (!cur || !newPassword) {
      return sendJson(res, 400, { ok: false, error: "Password lama dan password baru wajib." });
    }
    if (newPassword.length < 8) {
      return sendJson(res, 400, { ok: false, error: "Password baru minimal 8 karakter." });
    }

    const [rows] = await db().execute("SELECT id, password_hash FROM users WHERE id = ? LIMIT 1", [user.id]);
    const row = rows && rows[0];
    if (!row) {
      return sendJson(res, 404, { ok: false, error: "Pengguna tidak ditemukan." });
    }

    const existing = String(row.password_hash || "").replace(/^\$2y\$/, "$2b$");
    const valid = await bcrypt.compare(cur, existing);
    if (!valid) {
      return sendJson(res, 400, { ok: false, error: "Password lama salah." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    const phpCompat = String(hash).replace(/^\$2b\$/, "$2y$");
    await db().execute("UPDATE users SET password_hash = ? WHERE id = ?", [phpCompat, user.id]);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    return sendServerError(res, e);
  }
};
