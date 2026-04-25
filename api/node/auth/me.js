const { sendJson, methodNotAllowed } = require("../../_lib/http");
const { getAuthUser } = require("../../_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res);

  const user = getAuthUser(req);
  if (!user) {
    return sendJson(res, 200, { ok: false, authenticated: false });
  }
  return sendJson(res, 200, { ok: true, authenticated: true, user });
};
