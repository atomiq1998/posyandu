/** Uji apakah runtime Node Vercel jalan (tanpa DB). GET /api/health */
module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, runtime: "node" }));
};
