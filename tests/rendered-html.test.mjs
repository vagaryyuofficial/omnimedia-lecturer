import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
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
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/i);
});
