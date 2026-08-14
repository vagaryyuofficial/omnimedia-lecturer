import type { LanguageCode } from "../../../lib/academy-data";

const LANGUAGES = new Set<LanguageCode>(["CN", "EN", "FR", "DE"]);
const GEMINI_API_KEY_HEADER = "x-gemini-api-key";
const RECITATION_PREFIX: Record<LanguageCode, string> = {
  CN: "请只朗读下面的正文，不要读出这条说明：",
  EN: "Read only the following text aloud. Do not read this instruction:",
  FR: "Lisez uniquement le texte suivant. Ne lisez pas cette consigne :",
  DE: "Lesen Sie nur den folgenden Text vor. Lesen Sie diese Anweisung nicht vor:",
};

const VOICE_PROFILES: Record<LanguageCode, {
  role: string;
  openaiVoice: "marin" | "cedar" | "coral" | "sage";
  compatibilityVoice: "nova" | "onyx" | "shimmer" | "fable";
  geminiVoice: "Kore" | "Puck" | "Charon" | "Fenrir";
  instructions: string;
}> = {
  CN: {
    role: "中文讲师",
    openaiVoice: "marin",
    compatibilityVoice: "nova",
    geminiVoice: "Kore",
    instructions: "使用自然、温暖而克制的普通话授课。语速中等，句间有真实呼吸与思考停顿。不要播音腔，不要夸张。遇到英语、法语或德语词时，按对应语言自然发音。",
  },
  EN: {
    role: "English Lecturer",
    openaiVoice: "cedar",
    compatibilityVoice: "onyx",
    geminiVoice: "Puck",
    instructions: "Speak like a thoughtful university lecturer: natural, warm, precise, and conversational. Use measured pacing, meaningful pauses, and restrained emphasis. Avoid an announcer voice.",
  },
  FR: {
    role: "Professeure",
    openaiVoice: "coral",
    compatibilityVoice: "shimmer",
    geminiVoice: "Charon",
    instructions: "Parlez en français naturel et cultivé, comme dans un séminaire universitaire. Gardez un rythme posé, des pauses humaines et une intonation précise, sans ton publicitaire.",
  },
  DE: {
    role: "Dozent",
    openaiVoice: "sage",
    compatibilityVoice: "fable",
    geminiVoice: "Fenrir",
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

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function geminiError(status: number) {
  if (status === 429) {
    return Response.json(
      { error: "GEMINI_QUOTA_EXCEEDED", message: "Gemini 免费额度或速率限制已用尽，请稍后再试。" },
      { status: 429 },
    );
  }
  if (status === 400 || status === 401 || status === 403) {
    return Response.json(
      { error: "GEMINI_KEY_REJECTED", message: "Gemini 拒绝了这个 Key。请检查 Key、地区与 API 权限。" },
      { status: 401 },
    );
  }
  return Response.json(
    { error: "GEMINI_REQUEST_FAILED", message: "Gemini 语音服务暂时不可用。" },
    { status: 502 },
  );
}

async function requestGeminiSpeech(
  apiKey: string,
  text: string,
  language: LanguageCode,
) {
  const profile = VOICE_PROFILES[language];
  const model = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-api-client": "omnimedia-lecturer/0.1.0",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${profile.instructions}\n\n${RECITATION_PREFIX[language]}\n${text}` }],
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: profile.geminiVoice },
            },
          },
        },
      }),
    },
  );

  if (!response.ok) return { response: geminiError(response.status), voice: profile.geminiVoice };

  let payload: {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    }>;
  };
  try {
    payload = await response.json();
  } catch {
    return { response: geminiError(502), voice: profile.geminiVoice };
  }

  const inlineData = payload.candidates?.[0]?.content?.parts
    ?.find((part) => part.inlineData?.data)?.inlineData;
  if (!inlineData?.data) return { response: geminiError(502), voice: profile.geminiVoice };

  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(inlineData.data);
  } catch {
    return { response: geminiError(502), voice: profile.geminiVoice };
  }

  const sampleRate = inlineData.mimeType?.match(/rate=(\d+)/i)?.[1] || "24000";
  return {
    response: new Response(bytes, {
      headers: {
        "Content-Type": "audio/pcm",
        "X-Audio-Encoding": "signed-int16-little-endian",
        "X-Audio-Sample-Rate": sampleRate,
      },
    }),
    voice: profile.geminiVoice,
  };
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

  const userGeminiKey = request.headers.get(GEMINI_API_KEY_HEADER)?.trim() || "";
  if (userGeminiKey.length > 256) {
    return Response.json({ error: "INVALID_GEMINI_KEY" }, { status: 400 });
  }

  const mode = userGeminiKey ? "gemini" as const : configuredMode();
  if (mode === "device") {
    return Response.json(
      { error: "CLOUD_TTS_NOT_CONFIGURED", message: "正在使用设备增强声线。" },
      { status: 503 },
    );
  }

  let providerResponse: Response;
  let resolvedVoice = "provider-voice";
  try {
    if (mode === "gemini") {
      const generated = await requestGeminiSpeech(userGeminiKey, text, language);
      providerResponse = generated.response;
      resolvedVoice = generated.voice;
    } else if (mode === "external") {
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
  if (mode === "gemini" && !providerResponse.ok) return providerResponse;
  if (
    !providerResponse.ok ||
    (!contentType.startsWith("audio/") && !contentType.includes("application/octet-stream"))
  ) {
    return Response.json(
      { error: "PROVIDER_REQUEST_FAILED", message: "神经语音服务暂时不可用。" },
      { status: 502 },
    );
  }

  const rawPcm = mode === "openai" || mode === "gemini" || contentType.includes("pcm") || contentType.includes("octet-stream");
  const voice = mode === "openai" || mode === "gemini"
    ? resolvedVoice
    : providerResponse.headers.get("x-tts-voice") || "provider-voice";

  return new Response(providerResponse.body, {
    headers: {
      "Content-Type": mode === "openai" || mode === "gemini" ? "audio/pcm" : contentType,
      "X-TTS-Engine": mode,
      "X-TTS-Voice": voice,
      "X-Audio-Sample-Rate": providerResponse.headers.get("x-audio-sample-rate") || "24000",
      ...(rawPcm ? { "X-Audio-Encoding": "signed-int16-little-endian" } : {}),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
