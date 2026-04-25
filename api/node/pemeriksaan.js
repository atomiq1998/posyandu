const { db } = require("../_lib/db");
const { requireAuth } = require("../_lib/auth");
const { wargaUnderFive } = require("../_lib/domain");
const { sendJson, sendServerError, methodNotAllowed, getQuery, readJsonBody } = require("../_lib/http");

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  const conn = db();
  const method = req.method || "GET";
  const id = Number(getQuery(req, "id") || 0);

  try {
    if (method === "GET" && id < 1) {
      const wid = Number(getQuery(req, "warga_id") || 0);
      if (wid < 1) {
        return sendJson(res, 400, { ok: false, error: "Parameter warga_id wajib." });
      }
      if (!(await wargaUnderFive(conn, wid))) {
        return sendJson(res, 400, {
          ok: false,
          error: "Bukan data balita (usia harus < 5 tahun) atau warga tidak ada.",
        });
      }
      const [rows] = await conn.execute(
        "SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.warga_id = ? ORDER BY p.tanggal ASC, p.id ASC",
        [wid]
      );
      return sendJson(res, 200, { ok: true, pemeriksaan: rows });
    }

    if (method === "GET" && id > 0) {
      const [rows] = await conn.execute(
        "SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.id = ?",
        [id]
      );
      const row = rows[0];
      if (!row) return sendJson(res, 404, { ok: false, error: "Data tidak ditemukan." });
      if (!(await wargaUnderFive(conn, Number(row.warga_id)))) {
        return sendJson(res, 400, {
          ok: false,
          error: "Tidak dapat mengakses pemeriksaan untuk warga usia 5+ tahun.",
        });
      }
      return sendJson(res, 200, { ok: true, pemeriksaan: row });
    }

    if (method === "POST") {
      const body = await readJsonBody(req);
      const wid = Number(body.warga_id || 0);
      const tgl = String(body.tanggal || "").trim();
      const berat = body.berat_kg;
      const tinggi = body.tinggi_cm;
      const catatan = body.catatan ? String(body.catatan) : null;

      if (wid < 1) return sendJson(res, 400, { ok: false, error: "warga_id wajib." });
      if (!(await wargaUnderFive(conn, wid))) {
        return sendJson(res, 400, { ok: false, error: "Bukan data balita (usia harus < 5 tahun)." });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
        return sendJson(res, 400, { ok: false, error: "Tanggal tidak valid (YYYY-MM-DD)." });
      }
      if (!Number.isFinite(Number(berat)) || Number(berat) < 0 || Number(berat) > 50) {
        return sendJson(res, 400, { ok: false, error: "Berat badan tidak valid." });
      }
      if (!Number.isFinite(Number(tinggi)) || Number(tinggi) < 0 || Number(tinggi) > 200) {
        return sendJson(res, 400, { ok: false, error: "Tinggi badan tidak valid." });
      }

      const [ret] = await conn.execute(
        "INSERT INTO pemeriksaan_balita (warga_id, tanggal, berat_kg, tinggi_cm, catatan) VALUES (?,?,?,?,?)",
        [wid, tgl, Number(berat), Number(tinggi), catatan]
      );
      const [rows] = await conn.execute(
        "SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.id = ?",
        [ret.insertId]
      );
      return sendJson(res, 201, { ok: true, pemeriksaan: rows[0] });
    }

    if (method === "PUT" && id > 0) {
      const [wRows] = await conn.execute("SELECT warga_id FROM pemeriksaan_balita WHERE id = ?", [id]);
      const wRow = wRows[0];
      if (!wRow) return sendJson(res, 404, { ok: false, error: "Data tidak ditemukan." });
      if (!(await wargaUnderFive(conn, Number(wRow.warga_id)))) {
        return sendJson(res, 400, { ok: false, error: "Tidak dapat memperbarui." });
      }

      const body = await readJsonBody(req);
      const [cRows] = await conn.execute(
        "SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.id = ?",
        [id]
      );
      const cur = cRows[0];
      if (!cur) return sendJson(res, 404, { ok: false, error: "Data tidak ditemukan." });

      const tgl =
        body.tanggal == null || String(body.tanggal).trim() === ""
          ? String(cur.tanggal)
          : String(body.tanggal).trim();
      const berat =
        Number.isFinite(Number(body.berat_kg)) && Number(body.berat_kg) >= 0
          ? Number(body.berat_kg)
          : Number(cur.berat_kg);
      const tinggi =
        Number.isFinite(Number(body.tinggi_cm)) && Number(body.tinggi_cm) >= 0
          ? Number(body.tinggi_cm)
          : Number(cur.tinggi_cm);
      const catatan =
        Object.prototype.hasOwnProperty.call(body, "catatan")
          ? body.catatan == null || String(body.catatan).trim() === ""
            ? null
            : String(body.catatan)
          : cur.catatan;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
        return sendJson(res, 400, { ok: false, error: "Tanggal tidak valid (YYYY-MM-DD)." });
      }

      await conn.execute(
        "UPDATE pemeriksaan_balita SET tanggal=?, berat_kg=?, tinggi_cm=?, catatan=? WHERE id=?",
        [tgl, berat, tinggi, catatan, id]
      );
      const [rows] = await conn.execute(
        "SELECT p.*, w.nama, w.nik AS warga_nik FROM pemeriksaan_balita p JOIN warga w ON w.id = p.warga_id WHERE p.id = ?",
        [id]
      );
      return sendJson(res, 200, { ok: true, pemeriksaan: rows[0] });
    }

    if (method === "DELETE" && id > 0) {
      const [rows] = await conn.execute("SELECT warga_id FROM pemeriksaan_balita WHERE id = ?", [id]);
      const row = rows[0];
      if (!row) return sendJson(res, 404, { ok: false, error: "Data tidak ditemukan." });
      if (!(await wargaUnderFive(conn, Number(row.warga_id)))) {
        return sendJson(res, 400, { ok: false, error: "Tidak dapat menghapus." });
      }
      await conn.execute("DELETE FROM pemeriksaan_balita WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res);
  } catch (e) {
    return sendServerError(res, e);
  }
};
