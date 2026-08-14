const VOICES = new Set(["Fenrir", "Kore", "Puck", "Charon"]);

export async function POST(request: Request) {
  const endpoint = process.env.LECTURER_SPEECH_ENDPOINT;
  if (!endpoint) {
    return Response.json({ error: "PROVIDER_NOT_CONFIGURED" }, { status: 503 });
  }

  let payload: { text?: string; voice?: string; direction?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const text = payload.text?.trim();
  const voice = payload.voice;
  if (!text || !voice || !VOICES.has(voice)) {
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
      direction: payload.direction || "清晰、从容、具有人文气息",
      format: "audio/wav",
    }),
  });

  const contentType = providerResponse.headers.get("content-type") || "";
  if (!providerResponse.ok || !contentType.startsWith("audio/")) {
    return Response.json(
      { error: "PROVIDER_REQUEST_FAILED", message: "原声朗读暂时不可用。" },
      { status: providerResponse.ok ? 502 : providerResponse.status },
    );
  }

  return new Response(providerResponse.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
