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

test("renders the Deep Language Expert learning workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="zh-CN"/i);
  assert.match(html, /<title>深度语言专家 · Deep Language Expert<\/title>/i);
  assert.match(html, /深度语言专家/);
  assert.match(html, /DEEP LANGUAGE EXPERT/);
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
  assert.match(html, /界面语言/);
  assert.match(html, /data-text-size="standard"/);
  assert.match(html, /文字大小/);
  assert.match(html, /标准文字/);
  assert.match(html, /大号文字/);
  assert.match(html, /特大文字/);
  assert.match(html, /本地可用 · AI 可选增强/);
  assert.match(html, /查看六阶段课程树/);
  assert.match(html, /真实多语声线/);
  assert.match(html, />离线包</);
  assert.match(html, /Italiano/);
  assert.match(html, /Español/);
  assert.match(html, /한국어/);
  assert.match(html, /日本語/);
  assert.match(html, /CN \/ EN → FR \/ DE \/ IT \/ ES \/ KO \/ JA/);
  assert.match(html, /https:\/\/zh\.wikipedia\.org\/wiki\/Special:Search\?search=/);
  assert.match(html, /https:\/\/en\.wikipedia\.org\/wiki\/Special:Search\?search=/);
  assert.match(html, /https:\/\/it\.wikipedia\.org\/wiki\/Special:Search\?search=/);
  assert.match(html, /https:\/\/es\.wikipedia\.org\/wiki\/Special:Search\?search=/);
  assert.match(html, /https:\/\/ko\.wikipedia\.org\/wiki\/Special:Search\?search=/);
  assert.match(html, /https:\/\/ja\.wikipedia\.org\/wiki\/Special:Search\?search=/);
  assert.match(html, /在维基百科检索/);
  assert.doesNotMatch(html, /class="ask-mark">✦/);
  assert.doesNotMatch(html, /深度语音专家|DEEP VOICE EXPERT/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/i);
});

test("answers course questions locally without an account, network or model key", async () => {
  const response = await render("/api/lecture/local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "机会成本为什么不等于价格？",
      subject: "economics",
      currentModuleId: "econ-l1-1",
      interfaceLanguage: "zh",
    }),
  });

  assert.equal(response.status, 200);
  const answer = await response.json();
  assert.equal(answer.engine, "local-course");
  assert.equal(answer.grounded, true);
  assert.equal(answer.confidence, "direct");
  assert.equal(answer.modules[0].id, "econ-l1-1");
  assert.match(answer.text, /机会成本不是支付的金额/);
  assert.match(answer.text, /\[\[FR:/);
  assert.match(answer.text, /\[\[DE:/);
  assert.match(answer.text, /\[\[IT:/);
  assert.match(answer.text, /\[\[ES:/);
  assert.match(answer.text, /\[\[KO:/);
  assert.match(answer.text, /\[\[JA:/);
  assert.ok(answer.sources.some((source) => /OpenStax/.test(source.publisher)));
});

test("rejects empty local-course questions", async () => {
  const response = await render("/api/lecture/local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "", subject: "economics" }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_REQUEST");
});

test("explains a course title as a concrete lesson instead of a fake dictionary example", async () => {
  const response = await render("/api/term/local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      term: "抵达与问路：确认而非猜测",
      language: "CN",
      subject: "daily",
      moduleId: "daily-l1-1",
      interfaceLanguage: "zh",
    }),
  });

  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.engine, "local-course-term");
  assert.equal(report.moduleId, "daily-l1-1");
  assert.match(report.definition, /先说明目的地，再确认方向、站名、换乘和时间/);
  assert.match(report.etymology, /课程主题标题/);
  assert.match(report.etymology, /不是一个具有单一词源的词条/);
  assert.match(report.grammar, /主题：方法或判断/);
  assert.match(report.nuance, /即使听漏一个词也能通过复述恢复信息/);
  assert.match(report.example, /具体课程任务/);
  assert.doesNotMatch(JSON.stringify(report), /becomes precise only|应把日常用法|划定语义边界/);
});

test("grounds a vocabulary report in the actual multilingual course card", async () => {
  const response = await render("/api/term/local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      term: "nachfragen",
      language: "DE",
      subject: "daily",
      moduleId: "daily-l1-1",
      interfaceLanguage: "zh",
    }),
  });

  assert.equal(response.status, 200);
  const report = await response.json();
  assert.match(report.definition, /追问确认/);
  assert.match(report.grammar, /trennbares Verb/);
  assert.match(report.grammar, /可分前缀通常移到句末/);
  assert.match(report.nuance, /nachfragen.*追问确认.*bestätigen.*确认/);
  assert.equal(report.example, "In diesem Kurs wird „nachfragen“ in folgendem Zusammenhang verwendet: Verständnis sichern.");
  assert.match(report.translation, /追问确认/);
  assert.doesNotMatch(JSON.stringify(report), /becomes precise only|应把日常用法|划定语义边界/);
});

test("retrieves research and expert-stage modules beyond the original three levels", async () => {
  const response = await render("/api/lecture/local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "高风险 AI 部署为什么需要安全论证？",
      subject: "science",
      currentModuleId: "sci-l3-3",
      interfaceLanguage: "zh",
    }),
  });
  assert.equal(response.status, 200);
  const answer = await response.json();
  assert.equal(answer.modules[0].id, "sci-l6-2");
  assert.equal(answer.modules[0].level, "L6");
  assert.match(answer.text, /可审计安全论证/);
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
    body: JSON.stringify({ text: "Knowledge gives language its purpose.", language: "EN" }),
  });
  assert.equal(speechResponse.status, 503);
  assert.equal((await speechResponse.json()).error, "CLOUD_TTS_NOT_CONFIGURED");
});

test("rejects Chinese speech because Chinese is explanation-only", async () => {
  const response = await render("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "知识为体，语言为用。", language: "CN" }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "CHINESE_SPEECH_DISABLED");
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
      body: JSON.stringify({ text: "Knowledge gives language its purpose.", language: "EN" }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tts-engine"), "gemini");
    assert.equal(response.headers.get("x-tts-voice"), "Puck");
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

test("routes Japanese Qwen3 TTS through the selected region and returns the signed audio", async () => {
  const originalFetch = globalThis.fetch;
  const apiKey = "sk-qwen-user-owned-test-key-1234567890";
  const audio = Buffer.from("qwen-audio-test");
  const observed = [];

  globalThis.fetch = async (input, init) => {
    observed.push({ input: String(input), init });
    if (observed.length === 1) {
      return Response.json({ output: { audio: { url: "https://dashscope-result.oss-cn-beijing.aliyuncs.com/audio/test.mp3" } } });
    }
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg" } });
  };

  try {
    const response = await render("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TTS-Provider": "qwen",
        "X-TTS-API-Key": apiKey,
        "X-TTS-Model": "qwen3-tts-instruct-flash",
        "X-TTS-Region": "china",
      },
      body: JSON.stringify({ text: "言葉は知識を生きたものにします。", language: "JA" }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tts-engine"), "qwen");
    assert.equal(response.headers.get("x-tts-voice"), "Serena");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), audio);
    assert.match(observed[0].input, /^https:\/\/dashscope\.aliyuncs\.com\//);
    assert.equal(observed[0].init.headers.Authorization, `Bearer ${apiKey}`);
    const body = JSON.parse(observed[0].init.body);
    assert.equal(body.model, "qwen3-tts-instruct-flash");
    assert.equal(body.input.language_type, "Japanese");
    assert.equal(body.input.voice, "Serena");
    assert.doesNotMatch(JSON.stringify([...response.headers]), new RegExp(apiKey));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proxies Fish Audio S2 Pro with an optional reference voice", async () => {
  const originalFetch = globalThis.fetch;
  const apiKey = "fish-user-owned-test-key-1234567890";
  const audio = Buffer.from("fish-audio-test");
  let observedRequest;
  globalThis.fetch = async (input, init) => {
    observedRequest = { input: String(input), init };
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg" } });
  };

  try {
    const response = await render("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TTS-Provider": "fish",
        "X-TTS-API-Key": apiKey,
        "X-TTS-Voice-ID": "public-reference-voice",
      },
      body: JSON.stringify({ text: "Sprache macht Wissen beweglich.", language: "DE" }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tts-engine"), "fish");
    assert.equal(response.headers.get("x-tts-voice"), "public-reference-voice");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), audio);
    assert.equal(observedRequest.input, "https://api.fish.audio/v1/tts");
    assert.equal(observedRequest.init.headers.Authorization, `Bearer ${apiKey}`);
    assert.equal(observedRequest.init.headers.model, "s2-pro");
    assert.equal(JSON.parse(observedRequest.init.body).reference_id, "public-reference-voice");
    assert.doesNotMatch(JSON.stringify([...response.headers]), new RegExp(apiKey));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
