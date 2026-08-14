import type { LanguageCode } from "../../../lib/academy-data";

type UserProvider = "gemini" | "qwen" | "fish" | "openai";
type ProviderResult = {
  response: Response;
  voice: string;
  sampleRate?: number;
  rawPcm?: boolean;
};

const LANGUAGES = new Set<LanguageCode>(["CN", "EN", "FR", "DE"]);
const USER_PROVIDERS = new Set<UserProvider>(["gemini", "qwen", "fish", "openai"]);
const HEADER = {
  provider: "x-tts-provider",
  apiKey: "x-tts-api-key",
  model: "x-tts-model",
  region: "x-tts-region",
  voiceId: "x-tts-voice-id",
  legacyGeminiKey: "x-gemini-api-key",
};
const RECITATION_PREFIX: Record<LanguageCode, string> = {
  CN: "请只朗读下面的正文，不要读出这条说明：",
  EN: "Read only the following text aloud. Do not read this instruction:",
  FR: "Lisez uniquement le texte suivant. Ne lisez pas cette consigne :",
  DE: "Lesen Sie nur den folgenden Text vor. Lesen Sie diese Anweisung nicht vor:",
};
const QWEN_LANGUAGE: Record<LanguageCode, "Chinese" | "English" | "French" | "German"> = {
  CN: "Chinese",
  EN: "English",
  FR: "French",
  DE: "German",
};

const VOICE_PROFILES: Record<LanguageCode, {
  role: string;
  openaiVoice: "marin" | "cedar" | "coral" | "sage";
  compatibilityVoice: "nova" | "onyx" | "shimmer" | "fable";
  geminiVoice: "Kore" | "Puck" | "Charon" | "Fenrir";
  qwenVoice: "Serena" | "Jennifer" | "Emilien" | "Lenn";
  instructions: string;
}> = {
  CN: {
    role: "中文讲师", openaiVoice: "marin", compatibilityVoice: "nova", geminiVoice: "Kore", qwenVoice: "Serena",
    instructions: "使用自然、温暖而克制的普通话授课。语速中等，句间有真实呼吸与思考停顿。不要播音腔，不要夸张。遇到英语、法语或德语词时，按对应语言自然发音。",
  },
  EN: {
    role: "English Lecturer", openaiVoice: "cedar", compatibilityVoice: "onyx", geminiVoice: "Puck", qwenVoice: "Jennifer",
    instructions: "Speak like a thoughtful university lecturer: natural, warm, precise, and conversational. Use measured pacing, meaningful pauses, and restrained emphasis. Avoid an announcer voice.",
  },
  FR: {
    role: "Professeure", openaiVoice: "coral", compatibilityVoice: "shimmer", geminiVoice: "Charon", qwenVoice: "Emilien",
    instructions: "Parlez en français naturel et cultivé, comme dans un séminaire universitaire. Gardez un rythme posé, des pauses humaines et une intonation précise, sans ton publicitaire.",
  },
  DE: {
    role: "Dozent", openaiVoice: "sage", compatibilityVoice: "fable", geminiVoice: "Fenrir", qwenVoice: "Lenn",
    instructions: "Sprechen Sie natürlich, ruhig und präzise wie in einem Universitätsseminar. Verwenden Sie ein gemäßigtes Tempo, sinnvolle Pausen und keine künstliche Ansagerstimme.",
  },
};

function configuredMode() {
  if (process.env.LECTURER_SPEECH_ENDPOINT) return "external" as const;
  if (process.env.OPENAI_API_KEY) return "openai" as const;
  return "device" as const;
}

export function GET() {
  const mode = configuredMode();
  return Response.json({
    mode,
    cloudReady: mode !== "device",
    label: mode === "openai" ? "AI 神经原声" : mode === "external" ? "外部神经原声" : "设备增强声线",
  }, { headers: { "Cache-Control": "no-store" } });
}

function providerError(provider: UserProvider, status: number) {
  const name = provider === "gemini" ? "Gemini" : provider === "qwen" ? "Qwen" : provider === "fish" ? "Fish Audio" : "OpenAI";
  if (status === 429) {
    return Response.json(
      { error: `${provider.toUpperCase()}_QUOTA_EXCEEDED`, message: `${name} 的额度或速率限制已用尽，请稍后再试。` },
      { status: 429 },
    );
  }
  if (status === 400 || status === 401 || status === 403) {
    return Response.json(
      { error: `${provider.toUpperCase()}_KEY_REJECTED`, message: `${name} 拒绝了这个 Key 或请求配置。请检查密钥、地区、模型权限与余额。` },
      { status: 401 },
    );
  }
  return Response.json(
    { error: `${provider.toUpperCase()}_REQUEST_FAILED`, message: `${name} 语音服务暂时不可用。` },
    { status: 502 },
  );
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function requestGeminiSpeech(apiKey: string, text: string, language: LanguageCode, requestedModel: string): Promise<ProviderResult> {
  const profile = VOICE_PROFILES[language];
  const allowedModels = new Set(["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]);
  const model = allowedModels.has(requestedModel) ? requestedModel : "gemini-3.1-flash-tts-preview";
  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      "x-goog-api-client": "omnimedia-lecturer/0.2.0",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${profile.instructions}\n\n${RECITATION_PREFIX[language]}\n${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: profile.geminiVoice } } },
      },
    }),
  });
  if (!upstream.ok) return { response: providerError("gemini", upstream.status), voice: profile.geminiVoice };
  let payload: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> };
  try { payload = await upstream.json(); } catch { return { response: providerError("gemini", 502), voice: profile.geminiVoice }; }
  const inlineData = payload.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
  if (!inlineData?.data) return { response: providerError("gemini", 502), voice: profile.geminiVoice };
  let bytes: Uint8Array;
  try { bytes = decodeBase64(inlineData.data); } catch { return { response: providerError("gemini", 502), voice: profile.geminiVoice }; }
  const sampleRate = Number(inlineData.mimeType?.match(/rate=(\d+)/i)?.[1]) || 24_000;
  return {
    response: new Response(bytes, { headers: { "Content-Type": "audio/pcm" } }),
    voice: profile.geminiVoice,
    sampleRate,
    rawPcm: true,
  };
}

async function requestQwenSpeech(
  apiKey: string,
  text: string,
  language: LanguageCode,
  requestedModel: string,
  region: string,
): Promise<ProviderResult> {
  const profile = VOICE_PROFILES[language];
  const model = requestedModel === "qwen3-tts-instruct-flash" ? requestedModel : "qwen3-tts-flash";
  const endpoint = region === "china"
    ? "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
    : "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: {
        text,
        voice: profile.qwenVoice,
        language_type: QWEN_LANGUAGE[language],
        ...(model.includes("instruct") ? { instructions: profile.instructions, optimize_instructions: true } : {}),
      },
    }),
  });
  if (!upstream.ok) return { response: providerError("qwen", upstream.status), voice: profile.qwenVoice };
  let payload: { output?: { audio?: { url?: string } } };
  try { payload = await upstream.json(); } catch { return { response: providerError("qwen", 502), voice: profile.qwenVoice }; }
  const audioUrl = payload.output?.audio?.url;
  if (!audioUrl) return { response: providerError("qwen", 502), voice: profile.qwenVoice };
  let parsed: URL;
  try { parsed = new URL(audioUrl); } catch { return { response: providerError("qwen", 502), voice: profile.qwenVoice }; }
  if (parsed.protocol !== "https:" || !(parsed.hostname === "aliyuncs.com" || parsed.hostname.endsWith(".aliyuncs.com"))) {
    return { response: providerError("qwen", 502), voice: profile.qwenVoice };
  }
  const audio = await fetch(parsed);
  if (!audio.ok) return { response: providerError("qwen", audio.status), voice: profile.qwenVoice };
  return { response: audio, voice: profile.qwenVoice, sampleRate: 24_000 };
}

async function requestFishSpeech(apiKey: string, text: string, voiceId: string): Promise<ProviderResult> {
  const upstream = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", model: "s2-pro" },
    body: JSON.stringify({
      text,
      ...(voiceId ? { reference_id: voiceId } : {}),
      prosody: { speed: 1, volume: 0, normalize_loudness: true },
      chunk_length: 300,
      normalize: true,
      format: "mp3",
      sample_rate: 44_100,
      mp3_bitrate: 128,
      latency: "normal",
    }),
  });
  if (!upstream.ok) return { response: providerError("fish", upstream.status), voice: voiceId || "S2 Pro 默认声线" };
  return { response: upstream, voice: voiceId || "S2 Pro 默认声线", sampleRate: 44_100 };
}

async function requestOpenAiSpeech(apiKey: string, text: string, language: LanguageCode, requestedModel: string): Promise<ProviderResult> {
  const profile = VOICE_PROFILES[language];
  const allowedModels = new Set(["gpt-4o-mini-tts", "tts-1-hd", "tts-1"]);
  const model = allowedModels.has(requestedModel) ? requestedModel : "gpt-4o-mini-tts";
  const voice = model.includes("gpt-4o") ? profile.openaiVoice : profile.compatibilityVoice;
  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      ...(model.includes("gpt-4o") ? { instructions: profile.instructions } : {}),
      response_format: "mp3",
    }),
  });
  if (!upstream.ok) return { response: providerError("openai", upstream.status), voice };
  return { response: upstream, voice, sampleRate: 24_000 };
}

async function requestExternalSpeech(endpoint: string, text: string, language: LanguageCode) {
  const profile = VOICE_PROFILES[language];
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.LECTURER_PROVIDER_TOKEN ? { Authorization: `Bearer ${process.env.LECTURER_PROVIDER_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      version: "2", text, language, voice: profile.openaiVoice, voiceRole: profile.role,
      instructions: profile.instructions, format: "audio/pcm;rate=24000", sampleRate: 24_000,
      channels: 1, encoding: "signed-int16-little-endian",
    }),
  });
}

export async function POST(request: Request) {
  let payload: { text?: string; language?: LanguageCode };
  try { payload = await request.json(); } catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const text = payload.text?.trim();
  const language = payload.language;
  if (!text || text.length > 6_000 || !language || !LANGUAGES.has(language)) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const legacyGeminiKey = request.headers.get(HEADER.legacyGeminiKey)?.trim() || "";
  const rawProvider = request.headers.get(HEADER.provider)?.trim().toLowerCase() || (legacyGeminiKey ? "gemini" : "");
  const userProvider = USER_PROVIDERS.has(rawProvider as UserProvider) ? rawProvider as UserProvider : null;
  const userApiKey = request.headers.get(HEADER.apiKey)?.trim() || legacyGeminiKey;
  const requestedModel = request.headers.get(HEADER.model)?.trim() || "";
  const region = request.headers.get(HEADER.region)?.trim() || "international";
  const voiceId = request.headers.get(HEADER.voiceId)?.trim() || "";
  if (rawProvider && !userProvider) return Response.json({ error: "UNSUPPORTED_TTS_PROVIDER" }, { status: 400 });
  if ([userApiKey, requestedModel, region, voiceId].some((value) => value.length > 512)) {
    return Response.json({ error: "INVALID_TTS_CONFIGURATION" }, { status: 400 });
  }
  if (userProvider && !userApiKey) return Response.json({ error: "MISSING_TTS_KEY" }, { status: 400 });

  const serverMode = configuredMode();
  if (!userProvider && serverMode === "device") {
    return Response.json({ error: "CLOUD_TTS_NOT_CONFIGURED", message: "正在使用设备增强声线。" }, { status: 503 });
  }

  let result: ProviderResult;
  let engine: UserProvider | "external" | "openai";
  try {
    if (userProvider === "gemini") result = await requestGeminiSpeech(userApiKey, text, language, requestedModel);
    else if (userProvider === "qwen") result = await requestQwenSpeech(userApiKey, text, language, requestedModel, region);
    else if (userProvider === "fish") result = await requestFishSpeech(userApiKey, text, voiceId);
    else if (userProvider === "openai") result = await requestOpenAiSpeech(userApiKey, text, language, requestedModel);
    else if (serverMode === "external") {
      result = { response: await requestExternalSpeech(process.env.LECTURER_SPEECH_ENDPOINT!, text, language), voice: "provider-voice", sampleRate: 24_000, rawPcm: true };
    } else {
      result = await requestOpenAiSpeech(process.env.OPENAI_API_KEY!, text, language, process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts");
    }
    engine = userProvider || serverMode;
  } catch {
    return Response.json({ error: "PROVIDER_NETWORK_FAILED", message: "无法连接语音服务，请检查网络、地区与服务状态。" }, { status: 502 });
  }

  if (!result.response.ok) return result.response;
  const contentType = result.response.headers.get("content-type") || "";
  if (!contentType.startsWith("audio/") && !contentType.includes("application/octet-stream")) {
    return Response.json({ error: "INVALID_AUDIO_RESPONSE", message: "语音服务没有返回可播放音频。" }, { status: 502 });
  }
  const rawPcm = result.rawPcm || contentType.includes("pcm") || (engine === "external" && contentType.includes("octet-stream"));
  return new Response(result.response.body, {
    headers: {
      "Content-Type": rawPcm ? "audio/pcm" : contentType,
      "X-TTS-Engine": engine,
      "X-TTS-Voice": result.voice,
      "X-Audio-Sample-Rate": String(result.sampleRate || Number(result.response.headers.get("x-audio-sample-rate")) || 24_000),
      ...(rawPcm ? { "X-Audio-Encoding": "signed-int16-little-endian" } : {}),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
