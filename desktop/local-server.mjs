import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const DESKTOP_PORT = 43117;

const MIME_TYPES = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".wav", "audio/wav"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function isInside(root, target) {
  const pathFromRoot = relative(root, target);
  return pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`) && !pathFromRoot.startsWith(sep);
}

function createAssetHandler(clientRoot) {
  return async function fetchAsset(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }

    const requestedPath = resolve(clientRoot, pathname.replace(/^\/+/, ""));
    if (!isInside(clientRoot, requestedPath)) {
      return new Response("Forbidden", { status: 403 });
    }

    let filePath = requestedPath;
    try {
      const fileStats = await stat(filePath);
      if (fileStats.isDirectory()) filePath = join(filePath, "index.html");
    } catch {
      return new Response("Not found", { status: 404 });
    }

    try {
      const body = request.method === "HEAD" ? null : await readFile(filePath);
      const headers = new Headers({
        "Content-Type": MIME_TYPES.get(extname(filePath).toLowerCase()) ?? "application/octet-stream",
      });
      if (pathname.startsWith("/_next/static/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      }
      return new Response(body, { status: 200, headers });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  };
}

async function requestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function webRequestFromNode(request, origin) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined || name === "connection" || name === "transfer-encoding" || name === "host") continue;
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else headers.set(name, value);
  }

  const method = request.method ?? "GET";
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") init.body = await requestBody(request);
  return new Request(new URL(request.url ?? "/", origin), init);
}

async function sendWebResponse(response, nodeResponse) {
  nodeResponse.statusCode = response.status;
  nodeResponse.statusMessage = response.statusText;
  for (const [name, value] of response.headers) nodeResponse.setHeader(name, value);

  if (nodeResponse.req.method === "HEAD" || response.body === null) {
    nodeResponse.end();
    return;
  }

  nodeResponse.end(Buffer.from(await response.arrayBuffer()));
}

export async function startLocalServer({ runtimeRoot, port = DESKTOP_PORT } = {}) {
  if (!runtimeRoot) throw new Error("A desktop runtime root is required.");

  const serverEntry = join(runtimeRoot, "server", "index.js");
  const clientRoot = join(runtimeRoot, "client");
  await Promise.all([stat(serverEntry), stat(clientRoot)]);

  const { default: worker } = await import(pathToFileURL(serverEntry).href);
  if (!worker || typeof worker.fetch !== "function") {
    throw new Error("The production worker does not expose a fetch handler.");
  }

  const fetchAsset = createAssetHandler(clientRoot);
  const pendingTasks = new Set();
  let origin = `http://127.0.0.1:${port}`;

  const server = createServer(async (nodeRequest, nodeResponse) => {
    try {
      const request = await webRequestFromNode(nodeRequest, origin);
      if (request.method === "GET" || request.method === "HEAD") {
        const staticResponse = await fetchAsset(request);
        if (staticResponse.ok) {
          await sendWebResponse(staticResponse, nodeResponse);
          return;
        }
      }
      const response = await worker.fetch(
        request,
        { ASSETS: { fetch: fetchAsset } },
        {
          passThroughOnException() {},
          waitUntil(promise) {
            const task = Promise.resolve(promise)
              .catch(() => {})
              .finally(() => pendingTasks.delete(task));
            pendingTasks.add(task);
          },
        },
      );
      await sendWebResponse(response, nodeResponse);
    } catch (error) {
      console.error("Desktop request failed:", error);
      if (!nodeResponse.headersSent) {
        nodeResponse.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      }
      nodeResponse.end("Deep Language Expert could not complete this local request.");
    }
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", rejectPromise);
      resolvePromise();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine the desktop server address.");
  }
  origin = `http://127.0.0.1:${address.port}`;

  return {
    origin,
    async close() {
      await new Promise((resolvePromise, rejectPromise) => {
        server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
      });
      await Promise.allSettled([...pendingTasks]);
    },
  };
}
