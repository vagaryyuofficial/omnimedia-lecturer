import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/", init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, init || { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Omnimedia Lecturer academy", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="zh-CN"/i);
  assert.match(html, /<title>全媒体领域学院 · Omnimedia Lecturer<\/title>/i);
  assert.match(html, /文学名著/);
  assert.match(html, /经济学/);
  assert.match(html, /心理学/);
  assert.match(html, /商务交流/);
  assert.match(html, /生活用语/);
  assert.match(html, /艺术美学/);
  assert.match(html, /哲学/);
  assert.match(html, /科学技术/);
  assert.match(html, /CLIL · 内容与语言整合/);
  assert.match(html, /概念定义/);
  assert.match(html, /案例分析/);
  assert.match(html, /学术精读/);
  assert.match(html, /真实多语声线/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/i);
});

test("reports the real audio engine without exposing fake cloud voices", async () => {
  const statusResponse = await render("/api/tts");
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.deepEqual(status, {
    mode: "device",
    cloudReady: false,
    label: "设备增强声线",
  });

  const speechResponse = await render("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "知识为体，语言为用。", language: "CN" }),
  });
  assert.equal(speechResponse.status, 503);
  assert.equal((await speechResponse.json()).error, "CLOUD_TTS_NOT_CONFIGURED");
});

test("proxies a user-owned Gemini key without persisting or returning it", async () => {
  const originalFetch = globalThis.fetch;
  const apiKey = "AIza-user-owned-test-key-1234567890";
  const pcm = Buffer.from([0, 0, 255, 127, 0, 128]);
  let observedRequest;

  globalThis.fetch = async (input, init) => {
    observedRequest = { input: String(input), init };
    return Response.json({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              data: pcm.toString("base64"),
              mimeType: "audio/L16;codec=pcm;rate=24000",
            },
          }],
        },
      }],
    });
  };

  try {
    const response = await render("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gemini-API-Key": apiKey,
      },
      body: JSON.stringify({ text: "知识为体，语言为用。", language: "CN" }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tts-engine"), "gemini");
    assert.equal(response.headers.get("x-tts-voice"), "Kore");
    assert.equal(response.headers.get("x-audio-sample-rate"), "24000");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pcm);
    assert.match(observedRequest.input, /gemini-3\.1-flash-tts-preview:generateContent$/);
    assert.equal(observedRequest.init.headers["x-goog-api-key"], apiKey);
    assert.doesNotMatch(JSON.stringify(observedRequest.init.body), new RegExp(apiKey));
    assert.doesNotMatch(JSON.stringify([...response.headers]), new RegExp(apiKey));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns a useful error when the user's Gemini quota is exhausted", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: { message: "quota" } }, { status: 429 });

  try {
    const response = await render("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gemini-API-Key": "AIza-user-owned-test-key-1234567890",
      },
      body: JSON.stringify({ text: "Knowledge gives language its purpose.", language: "EN" }),
    });
    assert.equal(response.status, 429);
    const error = await response.json();
    assert.equal(error.error, "GEMINI_QUOTA_EXCEEDED");
    assert.match(error.message, /额度|速率限制/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
