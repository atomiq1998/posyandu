const bcrypt = require("bcryptjs");
const { db } = require("../../_lib/db");
const { sendJson, sendServerError, methodNotAllowed, readJsonBody } = require("../../_lib/http");
const { signAuth, setAuthCookie } = require("../../_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) {
      return sendJson(res, 400, {
        ok: false,
        error: "Username dan password wajib.",
      });
    }

    const [rows] = await db().execute(
      "SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    const row = rows && rows[0];
    if (!row) {
      return sendJson(res, 401, { ok: false, error: "User atau password salah." });
    }

    const hash = String(row.password_hash || "").replace(/^\$2y\$/, "$2b$");
    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      return sendJson(res, 401, { ok: false, error: "User atau password salah." });
    }

    const user = { id: Number(row.id), username: String(row.username) };
    const token = signAuth(user);
    setAuthCookie(req, res, token);
    return sendJson(res, 200, { ok: true, user });
  } catch (e) {
    return sendServerError(res, e);
  }
};
