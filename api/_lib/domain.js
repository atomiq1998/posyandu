async function wargaUnderFive(conn, wargaId) {
  const [rows] = await conn.execute(
    "SELECT TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) AS y FROM warga WHERE id = ?",
    [wargaId]
  );
  if (!rows || rows.length === 0) return false;
  const y = rows[0].y;
  if (y == null || y === "") return false;
  return Number(y) < 5;
}

module.exports = { wargaUnderFive };
