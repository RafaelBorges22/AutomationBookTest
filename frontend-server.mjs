import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const FRONTEND_PORT = 3001;
const BACKEND_PORT = 3000;
const PUBLIC_DIR = path.resolve("public");
const API_PATHS = new Set([
  "/upload-swagger",
  "/load-swagger",
  "/generate",
]);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function proxyToBackend(req, res) {
  const proxyReq = http.request(
    {
      hostname: "localhost",
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${BACKEND_PORT}`,
      },
    },
    (proxyRes) => {
      res.writeHead(
        proxyRes.statusCode || 500,
        proxyRes.headers
      );
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    sendJson(res, 502, {
      success: false,
      error: `Backend indisponível: ${error.message}`,
    });
  });

  req.pipe(proxyReq);
}

async function serveStatic(req, res) {
  const url = new URL(
    req.url || "/",
    `http://localhost:${FRONTEND_PORT}`
  );

  const requestedPath =
    url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path
    .normalize(requestedPath)
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "content-type":
        MIME_TYPES[ext] ||
        "application/octet-stream",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(
    req.url || "/",
    `http://localhost:${FRONTEND_PORT}`
  );

  if (API_PATHS.has(url.pathname)) {
    proxyToBackend(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(FRONTEND_PORT, () => {
  console.log(
    `Interface web em http://localhost:${FRONTEND_PORT}`
  );
});
