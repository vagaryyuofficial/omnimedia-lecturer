const VOICES = new Set(["Fenrir", "Kore", "Puck", "Charon"]);
const LANGUAGES = new Set(["CN", "EN", "FR", "DE"]);

export async function POST(request: Request) {
  const endpoint = process.env.LECTURER_SPEECH_ENDPOINT;
  if (!endpoint) {
    return Response.json({ error: "PROVIDER_NOT_CONFIGURED" }, { status: 503 });
  }

  let payload: {
    text?: string;
    voice?: string;
    language?: string;
    direction?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const text = payload.text?.trim();
  const voice = payload.voice;
  const language = payload.language;
  if (
    !text ||
    !voice ||
    !VOICES.has(voice) ||
    !language ||
    !LANGUAGES.has(language)
  ) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const providerResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.LECTURER_PROVIDER_TOKEN
        ? { Authorization: `Bearer ${process.env.LECTURER_PROVIDER_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      version: "1",
      text: text.slice(0, 12_000),
      voice,
      language,
      direction: payload.direction || "清晰、从容、具有人文气息",
      format: "audio/pcm;rate=24000",
      sampleRate: 24_000,
      channels: 1,
      encoding: "signed-int16-little-endian",
    }),
  });

  const contentType = providerResponse.headers.get("content-type") || "";
  if (
    !providerResponse.ok ||
    (!contentType.startsWith("audio/") &&
      !contentType.includes("application/octet-stream"))
  ) {
    return Response.json(
      { error: "PROVIDER_REQUEST_FAILED", message: "原声朗读暂时不可用。" },
      { status: providerResponse.ok ? 502 : providerResponse.status },
    );
  }

  return new Response(providerResponse.body, {
    headers: {
      "Content-Type": contentType,
      "X-Audio-Sample-Rate": "24000",
      ...(contentType.includes("pcm") || contentType.includes("octet-stream")
        ? { "X-Audio-Encoding": "signed-int16-little-endian" }
        : {}),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
