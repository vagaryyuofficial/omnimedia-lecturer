import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { startLocalServer } from "../desktop/local-server.mjs";

test("serves the production application through the local desktop runtime", async (context) => {
  const server = await startLocalServer({ runtimeRoot: resolve("dist"), port: 0 });
  context.after(() => server.close());

  assert.match(server.origin, /^http:\/\/127\.0\.0\.1:\d+$/);

  const pageResponse = await fetch(server.origin);
  assert.equal(pageResponse.status, 200);
  const html = await pageResponse.text();
  assert.match(html, /<title>深度语言专家 · Deep Language Expert<\/title>/i);

  const assetPath = html.match(/(?:src|href)="(\/_next\/static\/[^"]+)"/)?.[1];
  assert.ok(assetPath, "the production HTML should include a static asset");
  const assetResponse = await fetch(new URL(assetPath, server.origin));
  assert.equal(assetResponse.status, 200);
  assert.match(assetResponse.headers.get("cache-control") ?? "", /immutable/);

  const ttsResponse = await fetch(new URL("/api/tts", server.origin));
  assert.equal(ttsResponse.status, 200);
  assert.equal((await ttsResponse.json()).mode, "device");
});
