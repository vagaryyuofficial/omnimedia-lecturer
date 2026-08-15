import { buildLocalCourseAnswer } from "../../../../lib/local-answer-engine";
import type { SubjectId } from "../../../../lib/prompts";

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

export async function POST(request: Request) {
  let payload: {
    query?: string;
    subject?: SubjectId;
    currentModuleId?: string;
    interfaceLanguage?: "zh" | "en";
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const query = payload.query?.trim() || "";
  if (!payload.subject || !SUBJECTS.has(payload.subject) || !query || query.length > 2_000) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const answer = buildLocalCourseAnswer({
    query,
    subject: payload.subject,
    currentModuleId: payload.currentModuleId,
    locale: payload.interfaceLanguage === "en" ? "en" : "zh",
  });

  return Response.json({
    text: answer.dsl,
    confidence: answer.confidence,
    modules: answer.modules.map((module) => ({
      id: module.id,
      title: module.title,
      titleEn: module.titleEn,
      level: module.level,
    })),
    sources: answer.sources.map((source) => ({
      title: payload.interfaceLanguage === "en" ? source.titleEn : source.title,
      publisher: source.publisher,
      url: source.url,
    })),
    grounded: true,
    engine: "local-course",
  });
}
