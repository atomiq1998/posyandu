const jwt = require("jsonwebtoken");
const { sendJson } = require("./http");

const COOKIE_NAME = "posyandu_token";

function parseCookies(req) {
  const cookie = req.headers.cookie || "";
  const out = {};
  cookie.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) return;
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function cookieHeader(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path || "/"}`);
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

function secret() {
  return process.env.JWT_SECRET || "please-change-jwt-secret";
}

function signAuth(user) {
  return jwt.sign(
    { uid: Number(user.id), username: String(user.username || "") },
    secret(),
    { expiresIn: "7d" }
  );
}

function verifyAuthToken(token) {
  try {
    const payload = jwt.verify(token, secret());
    return { id: Number(payload.uid), username: String(payload.username || "") };
  } catch (_e) {
    return null;
  }
}

function setAuthCookie(req, res, token) {
  const secure =
    req.headers["x-forwarded-proto"] === "https" ||
    process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    cookieHeader(COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure,
      maxAge: 60 * 60 * 24 * 7,
    })
  );
}

function clearAuthCookie(req, res) {
  const secure =
    req.headers["x-forwarded-proto"] === "https" ||
    process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    cookieHeader(COOKIE_NAME, "", {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure,
      maxAge: 0,
    })
  );
}

function getAuthUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifyAuthToken(token);
}

function requireAuth(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }
  return user;
}

module.exports = {
  signAuth,
  setAuthCookie,
  clearAuthCookie,
  getAuthUser,
  requireAuth,
};
