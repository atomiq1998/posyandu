const { db } = require("../_lib/db");
const { requireAuth } = require("../_lib/auth");
const { sendJson, sendServerError, methodNotAllowed } = require("../_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res);
  if (!requireAuth(req, res)) return;

  try {
    const [rows] = await db().query(
      `SELECT w.*,
      TIMESTAMPDIFF(MONTH, w.tanggal_lahir, CURDATE()) AS umur_bulan,
      TIMESTAMPDIFF(YEAR, w.tanggal_lahir, CURDATE()) AS umur_tahun
      FROM warga w
      WHERE TIMESTAMPDIFF(YEAR, w.tanggal_lahir, CURDATE()) < 5
      ORDER BY w.tanggal_lahir DESC, w.nama`
    );
    return sendJson(res, 200, { ok: true, balita: rows });
  } catch (e) {
    return sendServerError(res, e);
  }
};
