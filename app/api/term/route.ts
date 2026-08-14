import type { LanguageCode } from "../../../lib/academy-data";
import type { SubjectId } from "../../../lib/prompts";

const LANGUAGES = new Set<LanguageCode>(["CN", "EN", "FR", "DE"]);
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
const REPORT_FIELDS = [
  "definition",
  "etymology",
  "grammar",
  "nuance",
  "example",
  "translation",
] as const;

export async function POST(request: Request) {
  const endpoint = process.env.LECTURER_TERM_ENDPOINT;
  if (!endpoint) {
    return Response.json({ error: "PROVIDER_NOT_CONFIGURED" }, { status: 503 });
  }

  let payload: {
    term?: string;
    language?: LanguageCode;
    subject?: SubjectId;
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (
    !payload.term?.trim() ||
    payload.term.length > 160 ||
    !payload.language ||
    !LANGUAGES.has(payload.language) ||
    !payload.subject ||
    !SUBJECTS.has(payload.subject)
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
      task: "term-inspection",
      term: payload.term.trim(),
      language: payload.language,
      subject: payload.subject,
      responseSchema: {
        definition: "string",
        etymology: "string",
        grammar: "string",
        nuance: "string",
        example: "string",
        translation: "string",
      },
    }),
  });

  if (!providerResponse.ok) {
    return Response.json({ error: "PROVIDER_REQUEST_FAILED" }, { status: providerResponse.status });
  }
  const result = await providerResponse.json() as Record<string, unknown>;
  if (!REPORT_FIELDS.every((field) => typeof result[field] === "string")) {
    return Response.json({ error: "INVALID_PROVIDER_RESPONSE" }, { status: 502 });
  }
  return Response.json(Object.fromEntries(
    REPORT_FIELDS.map((field) => [field, (result[field] as string).trim()]),
  ));
}
