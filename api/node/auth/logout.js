const { clearAuthCookie } = require("../../_lib/auth");
const { sendJson, methodNotAllowed } = require("../../_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res);
  clearAuthCookie(req, res);
  return sendJson(res, 200, { ok: true });
};
