function sendJson(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function methodNotAllowed(res) {
  sendJson(res, 405, { ok: false, error: "Method not allowed" });
}

function getQuery(req, key) {
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, key)) {
    return req.query[key];
  }
  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get(key);
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body !== "") {
    try {
      return JSON.parse(req.body);
    } catch (_e) {
      return {};
    }
  }
  const raw = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return {};
  }
}

module.exports = { sendJson, methodNotAllowed, getQuery, readJsonBody };
