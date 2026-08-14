import type { LanguageCode } from "../../../lib/academy-data";

const LANGUAGES = new Set<LanguageCode>(["CN", "EN", "FR", "DE"]);

const VOICE_PROFILES: Record<LanguageCode, {
  role: string;
  openaiVoice: "marin" | "cedar" | "coral" | "sage";
  compatibilityVoice: "nova" | "onyx" | "shimmer" | "fable";
  instructions: string;
}> = {
  CN: {
    role: "中文讲师",
    openaiVoice: "marin",
    compatibilityVoice: "nova",
    instructions: "使用自然、温暖而克制的普通话授课。语速中等，句间有真实呼吸与思考停顿。不要播音腔，不要夸张。遇到英语、法语或德语词时，按对应语言自然发音。",
  },
  EN: {
    role: "English Lecturer",
    openaiVoice: "cedar",
    compatibilityVoice: "onyx",
    instructions: "Speak like a thoughtful university lecturer: natural, warm, precise, and conversational. Use measured pacing, meaningful pauses, and restrained emphasis. Avoid an announcer voice.",
  },
  FR: {
    role: "Professeure",
    openaiVoice: "coral",
    compatibilityVoice: "shimmer",
    instructions: "Parlez en français naturel et cultivé, comme dans un séminaire universitaire. Gardez un rythme posé, des pauses humaines et une intonation précise, sans ton publicitaire.",
  },
  DE: {
    role: "Dozent",
    openaiVoice: "sage",
    compatibilityVoice: "fable",
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
  return Response.json(
    {
      mode,
      cloudReady: mode !== "device",
      label: mode === "openai"
        ? "AI 神经原声"
        : mode === "external"
          ? "外部神经原声"
          : "设备增强声线",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function requestExternalSpeech(
  endpoint: string,
  text: string,
  language: LanguageCode,
) {
  const profile = VOICE_PROFILES[language];
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.LECTURER_PROVIDER_TOKEN
        ? { Authorization: `Bearer ${process.env.LECTURER_PROVIDER_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      version: "2",
      text,
      language,
      voice: profile.openaiVoice,
      voiceRole: profile.role,
      instructions: profile.instructions,
      format: "audio/pcm;rate=24000",
      sampleRate: 24_000,
      channels: 1,
      encoding: "signed-int16-little-endian",
    }),
  });
}

async function requestOpenAiSpeech(text: string, language: LanguageCode) {
  const profile = VOICE_PROFILES[language];
  const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
  const voice = model.includes("gpt-4o") ? profile.openaiVoice : profile.compatibilityVoice;
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      ...(model.includes("gpt-4o") ? { instructions: profile.instructions } : {}),
      response_format: "pcm",
    }),
  });
  return { response, voice };
}

export async function POST(request: Request) {
  let payload: { text?: string; language?: LanguageCode };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const text = payload.text?.trim();
  const language = payload.language;
  if (!text || text.length > 6_000 || !language || !LANGUAGES.has(language)) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const mode = configuredMode();
  if (mode === "device") {
    return Response.json(
      { error: "CLOUD_TTS_NOT_CONFIGURED", message: "正在使用设备增强声线。" },
      { status: 503 },
    );
  }

  let providerResponse: Response;
  let resolvedVoice = "provider-voice";
  try {
    if (mode === "external") {
      providerResponse = await requestExternalSpeech(process.env.LECTURER_SPEECH_ENDPOINT!, text, language);
    } else {
      const generated = await requestOpenAiSpeech(text, language);
      providerResponse = generated.response;
      resolvedVoice = generated.voice;
    }
  } catch {
    return Response.json(
      { error: "PROVIDER_NETWORK_FAILED", message: "神经语音服务暂时不可用。" },
      { status: 502 },
    );
  }

  const contentType = providerResponse.headers.get("content-type") || "";
  if (
    !providerResponse.ok ||
    (!contentType.startsWith("audio/") && !contentType.includes("application/octet-stream"))
  ) {
    return Response.json(
      { error: "PROVIDER_REQUEST_FAILED", message: "神经语音服务暂时不可用。" },
      { status: 502 },
    );
  }

  const rawPcm = mode === "openai" || contentType.includes("pcm") || contentType.includes("octet-stream");
  const voice = mode === "openai"
    ? resolvedVoice
    : providerResponse.headers.get("x-tts-voice") || "provider-voice";

  return new Response(providerResponse.body, {
    headers: {
      "Content-Type": mode === "openai" ? "audio/pcm" : contentType,
      "X-TTS-Engine": mode,
      "X-TTS-Voice": voice,
      "X-Audio-Sample-Rate": providerResponse.headers.get("x-audio-sample-rate") || "24000",
      ...(rawPcm ? { "X-Audio-Encoding": "signed-int16-little-endian" } : {}),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
