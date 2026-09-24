import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const generatedRoot = path.join(root, "dist");
const contentRoots = [generatedRoot, root].filter((candidate) =>
  fs.existsSync(path.join(candidate, "index.html")),
);
const dist = contentRoots[0] || root;
const port = Number(process.env.PORT || 4173);
const sessionSecret = process.env.SESSION_SECRET;
const sessionTtl = Number(process.env.SESSION_TTL_SECONDS || 28800);
const isProduction = process.env.NODE_ENV === "production";

if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET must be set before starting the protected server.",
  );
}

const accounts = [
  {
    role: "day",
    username: process.env.CEREMONY_USERNAME,
    password: process.env.CEREMONY_PASSWORD,
  },
  {
    role: "evening",
    username: process.env.RECEPTION_USERNAME,
    password: process.env.RECEPTION_PASSWORD,
  },
];

if (accounts.some((account) => !account.username || !account.password)) {
  throw new Error("All guest username and password environment variables must be set before starting the protected server.");
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const eveningBlockedPaths = new Set([
  "/order-of-the-day/",
  "/q---a-s/",
  "/food/",
  "/rsvp/",
]);

function digest(value, secret = "") {
  return crypto.createHash("sha256").update(`${secret}:${value}`).digest();
}

function matchesSecret(value, expected) {
  const actualDigest = digest(value);
  const expectedDigest = digest(expected);
  return crypto.timingSafeEqual(actualDigest, expectedDigest);
}

function matchesAccount(username, password, account) {
  return matchesSecret(username.trim().toLowerCase(), account.username.trim().toLowerCase()) && matchesSecret(password, account.password);
}

function sign(value) {
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(value)
    .digest("base64url");
}

function encodeSession(role) {
  const payload = Buffer.from(
    JSON.stringify({ role, expires: Date.now() + sessionTtl * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSession(request) {
  const cookies = Object.fromEntries(
    (request.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf("=");
        return [
          item.slice(0, separator).trim(),
          decodeURIComponent(item.slice(separator + 1)),
        ];
      }),
  );
  const cookie = cookies.wedding_session || "";
  const separator = cookie.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = cookie.slice(0, separator);
  const signature = cookie.slice(separator + 1);
  const expectedSignature = sign(payload);
  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    )
  )
    return null;
  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    return session.expires > Date.now() &&
      (session.role === "day" || session.role === "evening")
      ? session
      : null;
  } catch {
    return null;
  }
}

function setSession(response, role) {
  const secure = isProduction ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `wedding_session=${encodeSession(role)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${sessionTtl}`,
  );
}

function redirect(response, location) {
  response.writeHead(303, { Location: location, "Cache-Control": "no-store" });
  response.end();
}

function renderLogin(response, message = "") {
  const loginCandidates = [
    path.join(dist, "login", "index.html"),
    path.join(root, "public", "login", "index.html"),
  ];
  const loginFile = loginCandidates.find((candidate) => fs.existsSync(candidate));
  const template = loginFile
    ? fs.readFileSync(loginFile, "utf8")
    : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Guest access | Anchen &amp; Joe</title></head><body><main><h1>Welcome to Anchen &amp; Joe's Wedding</h1><p>Enter your guest username and password to continue.</p><form method="post" action="/auth/login"><label>Username <input name="username" autocomplete="username" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Continue</button>{{ERROR_MESSAGE}}</form></main></body></html>`;
  const error = message
    ? `<p class="auth-card__error" role="alert">${message}</p>`
    : "";
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  response.end(template.replace("{{ERROR_MESSAGE}}", error));
}

function renderSession(response, session) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  response.end(JSON.stringify({
    authenticated: Boolean(session),
    role: session?.role || null,
  }));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) reject(new Error("Request too large"));
    });
    request.on("end", () => resolve(new URLSearchParams(body)));
    request.on("error", reject);
  });
}

function canAccess(role, pathname) {
  if (role === "day") return true;
  return !eveningBlockedPaths.has(
    pathname.endsWith("/") ? pathname : `${pathname}/`,
  );
}

function serveFile(request, response, session, pathname) {
  if (!session && !["/site.css", "/site.js", "/robots.txt"].includes(pathname))
    return redirect(response, "/login/");
  if (session && !canAccess(session.role, pathname))
    return (
      response.writeHead(403, {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      }),
      response.end("Forbidden")
    );

  let relative;
  try {
    relative = pathname === "/"
      ? "index.html"
      : decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return response.writeHead(400).end("Bad request");
  }
  if (relative.endsWith("/")) relative += "index.html";
  const rootPath = path.resolve(dist);
  const file = path.resolve(dist, relative);
  if (!file.startsWith(`${rootPath}${path.sep}`))
    return redirect(response, "/login/");

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Not found");
    }
    response.writeHead(200, {
      "Content-Type":
        mimeTypes[path.extname(file)] || "application/octet-stream",
      "Cache-Control": session ? "private, no-store" : "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    response.end(data);
  });
}

http
  .createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const session = readSession(request);

    if (url.pathname === "/auth/me" && request.method === "GET")
      return renderSession(response, session);
    if (url.pathname === "/login/" && request.method === "GET")
      return renderLogin(response);
    if (url.pathname === "/auth/login" && request.method === "POST") {
      try {
        const fields = await readBody(request);
        const username = fields.get("username") || "";
        const password = fields.get("password") || "";
        const role = accounts.find((account) => matchesAccount(username, password, account))?.role;
        if (!role)
          return renderLogin(
            response,
            "Those login details were not recognised. Please try again.",
          );
        setSession(response, role);
        return redirect(response, "/");
      } catch {
        return renderLogin(
          response,
          "We could not process that code. Please try again.",
        );
      }
    }
    if (url.pathname === "/logout") {
      const secure = isProduction ? "; Secure" : "";
      response.setHeader(
        "Set-Cookie",
        `wedding_session=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Lax`,
      );
      return redirect(response, "/login/");
    }
    return serveFile(request, response, session, url.pathname);
  })
  .listen(port, () =>
    console.log(`Protected wedding site: http://127.0.0.1:${port}/`),
  );
