const { db } = require("../_lib/db");
const { requireAuth } = require("../_lib/auth");
const { sendJson, sendServerError, methodNotAllowed, getQuery, readJsonBody } = require("../_lib/http");

function normalizeWargaInput(body, existing) {
  const out = existing || {
    alamat: "",
    no_kk: null,
    nama: "",
    nik: "",
    tempat_lahir: null,
    tanggal_lahir: null,
    jenis_kelamin: "L",
    agama: null,
    warga_negara: "WNI",
    hubungan_keluarga: null,
    status_nikah: null,
    pendidikan: null,
    pekerjaan: null,
    status: "aktif",
  };

  [
    "alamat",
    "no_kk",
    "nama",
    "nik",
    "tempat_lahir",
    "agama",
    "warga_negara",
    "hubungan_keluarga",
    "status_nikah",
    "pendidikan",
    "pekerjaan",
    "status",
  ].forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(body, k)) return;
    const v = body[k];
    const nullable = [
      "no_kk",
      "tempat_lahir",
      "agama",
      "hubungan_keluarga",
      "status_nikah",
      "pendidikan",
      "pekerjaan",
    ];
    if (v == null || String(v).trim() === "") {
      out[k] = nullable.includes(k) ? null : "";
    } else {
      out[k] = String(v).trim();
    }
  });

  if (Object.prototype.hasOwnProperty.call(body, "tanggal_lahir")) {
    out.tanggal_lahir = String(body.tanggal_lahir || "");
  }
  if (Object.prototype.hasOwnProperty.call(body, "jenis_kelamin")) {
    const jk = String(body.jenis_kelamin || "").toUpperCase();
    out.jenis_kelamin = jk === "P" ? "P" : "L";
  }
  if (!out.warga_negara) out.warga_negara = "WNI";
  if (!out.status) out.status = "aktif";
  out.nik = String(out.nik || "").replace(/\D/g, "");
  return out;
}

function validateWargaForSave(out) {
  if (!String(out.nama || "").trim()) return "Nama wajib diisi.";
  if (out.nik.length < 10 || out.nik.length > 16) return "NIK harus 10–16 digit angka.";
  if (!out.tanggal_lahir) return "Tanggal lahir wajib diisi.";
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(out.tanggal_lahir);
  if (!isDate) return "Tanggal lahir tidak valid (format YYYY-MM-DD).";
  return null;
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  const conn = db();
  const method = req.method || "GET";
  const id = Number(getQuery(req, "id") || 0);
  const q = String(getQuery(req, "q") || "").trim();

  try {
    if (method === "GET" && id < 1) {
      let rows;
      if (q) {
        const like = `%${q}%`;
        [rows] = await conn.execute(
          "SELECT * FROM warga WHERE nama LIKE ? OR nik LIKE ? ORDER BY nama",
          [like, like]
        );
      } else {
        [rows] = await conn.query("SELECT * FROM warga ORDER BY nama");
      }
      return sendJson(res, 200, { ok: true, warga: rows });
    }

    if (method === "GET" && id > 0) {
      const [rows] = await conn.execute("SELECT * FROM warga WHERE id = ?", [id]);
      if (!rows[0]) return sendJson(res, 404, { ok: false, error: "Warga tidak ditemukan." });
      return sendJson(res, 200, { ok: true, warga: rows[0] });
    }

    if (method === "POST") {
      const body = await readJsonBody(req);
      const out = normalizeWargaInput(body, null);
      const err = validateWargaForSave(out);
      if (err) return sendJson(res, 400, { ok: false, error: err });

      const [ret] = await conn
        .execute(
          "INSERT INTO warga (alamat, no_kk, nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, warga_negara, hubungan_keluarga, status_nikah, pendidikan, pekerjaan, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            out.alamat || null,
            out.no_kk,
            out.nama,
            out.nik,
            out.tempat_lahir,
            out.tanggal_lahir,
            out.jenis_kelamin,
            out.agama,
            out.warga_negara,
            out.hubungan_keluarga,
            out.status_nikah,
            out.pendidikan,
            out.pekerjaan,
            out.status,
          ]
        )
        .catch((e) => {
          if (e && e.code === "ER_DUP_ENTRY") {
            sendJson(res, 409, { ok: false, error: "NIK sudah terdaftar." });
            return null;
          }
          throw e;
        });
      if (!ret) return;
      const [rows] = await conn.execute("SELECT * FROM warga WHERE id = ?", [ret.insertId]);
      return sendJson(res, 201, { ok: true, warga: rows[0] });
    }

    if (method === "PUT" && id > 0) {
      const [exRows] = await conn.execute("SELECT * FROM warga WHERE id = ?", [id]);
      const ex = exRows[0];
      if (!ex) return sendJson(res, 404, { ok: false, error: "Warga tidak ditemukan." });

      const body = await readJsonBody(req);
      const out = normalizeWargaInput(body, { ...ex });
      const err = validateWargaForSave(out);
      if (err) return sendJson(res, 400, { ok: false, error: err });

      if (String(ex.nik) !== String(out.nik)) {
        const [dupRows] = await conn.execute("SELECT id FROM warga WHERE nik = ? AND id != ?", [
          out.nik,
          id,
        ]);
        if (dupRows[0]) {
          return sendJson(res, 409, { ok: false, error: "NIK sudah dipakai warga lain." });
        }
      }

      await conn.execute(
        "UPDATE warga SET alamat=?, no_kk=?, nama=?, nik=?, tempat_lahir=?, tanggal_lahir=?, jenis_kelamin=?, agama=?, warga_negara=?, hubungan_keluarga=?, status_nikah=?, pendidikan=?, pekerjaan=?, status=? WHERE id=?",
        [
          out.alamat || null,
          out.no_kk,
          out.nama,
          out.nik,
          out.tempat_lahir,
          out.tanggal_lahir,
          out.jenis_kelamin,
          out.agama,
          out.warga_negara,
          out.hubungan_keluarga,
          out.status_nikah,
          out.pendidikan,
          out.pekerjaan,
          out.status,
          id,
        ]
      );
      const [rows] = await conn.execute("SELECT * FROM warga WHERE id = ?", [id]);
      return sendJson(res, 200, { ok: true, warga: rows[0] });
    }

    if (method === "DELETE" && id > 0) {
      const [ret] = await conn.execute("DELETE FROM warga WHERE id = ?", [id]);
      if (!ret.affectedRows) {
        return sendJson(res, 404, { ok: false, error: "Warga tidak ditemukan." });
      }
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res);
  } catch (e) {
    return sendServerError(res, e);
  }
};
