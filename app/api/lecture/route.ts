import {
  buildSystemInstruction,
  buildUserPrompt,
  type InterfaceLanguage,
  type SubjectId,
  type TeachingMode,
} from "../../../lib/prompts";

const SUBJECTS = new Set<SubjectId>([
  "literature",
  "economics",
  "psychology",
  "business",
  "daily",
  "art",
  "philosophy",
  "science",
]);
const MODES = new Set<TeachingMode>([
  "concept",
  "case",
  "close-reading",
  "question",
]);

type Source = { title?: string; url?: string };
type Visual = {
  src?: string;
  title?: string;
  caption?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

export async function POST(request: Request) {
  const endpoint = process.env.LECTURER_TEXT_ENDPOINT;
  if (!endpoint) {
    return Response.json(
      {
        error: "PROVIDER_NOT_CONFIGURED",
        message: "当前使用内置课程。",
      },
      { status: 503 },
    );
  }

  let payload: {
    subject?: SubjectId;
    mode?: TeachingMode;
    query?: string;
    interfaceLanguage?: InterfaceLanguage;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { subject, mode, query } = payload;
  const interfaceLanguage = payload.interfaceLanguage === "en" ? "en" : "zh";
  if (!subject || !SUBJECTS.has(subject) || !mode || !MODES.has(mode)) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  if (query && query.length > 2_000) {
    return Response.json({ error: "QUERY_TOO_LONG" }, { status: 400 });
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
      subject,
      mode,
      query: query?.trim() || null,
      interfaceLanguage,
      systemInstruction: buildSystemInstruction(subject, interfaceLanguage),
      prompt: buildUserPrompt(subject, mode, query, interfaceLanguage),
      requestedCapabilities: [
        "web-search",
        "source-citations",
        "visual-grounding",
        "multilingual-terminology",
        "clil-dsl-v2",
      ],
    }),
  });

  const contentType = providerResponse.headers.get("content-type") || "";
  if (!providerResponse.ok || !contentType.includes("application/json")) {
    return Response.json(
      { error: "PROVIDER_REQUEST_FAILED", message: "实时讲师暂时不可用。" },
      { status: providerResponse.ok ? 502 : providerResponse.status },
    );
  }

  const result = (await providerResponse.json()) as {
    text?: string;
    sources?: Source[];
    visuals?: Visual[];
    grounded?: boolean;
  };
  const text = result.text?.trim();
  if (!text) {
    return Response.json({ error: "EMPTY_RESPONSE" }, { status: 502 });
  }

  const sources = (result.sources || [])
    .filter(
      (source): source is { title?: string; url: string } =>
        Boolean(source?.url && /^https?:\/\//i.test(source.url)),
    )
    .map((source) => ({
      title: source.title || new URL(source.url).hostname,
      url: source.url,
    }))
    .slice(0, 6);

  const visuals = (result.visuals || [])
    .filter(
      (visual): visual is Required<Visual> =>
        Boolean(
          visual.src &&
            visual.title &&
            visual.caption &&
            visual.sourceUrl &&
            visual.sourceLabel &&
            /^https?:\/\//i.test(visual.src) &&
            /^https?:\/\//i.test(visual.sourceUrl),
        ),
    )
    .slice(0, 4);

  return Response.json({
    text,
    sources,
    visuals,
    grounded: result.grounded ?? sources.length > 0,
  });
}
