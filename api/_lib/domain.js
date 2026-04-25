async function wargaUnderFive(conn, wargaId) {
  const [rows] = await conn.execute(
    "SELECT TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) AS y FROM warga WHERE id = ?",
    [wargaId]
  );
  if (!rows || rows.length === 0) return false;
  return Number(rows[0].y) < 5;
}

module.exports = { wargaUnderFive };
