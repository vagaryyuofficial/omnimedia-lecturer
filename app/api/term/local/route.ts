import {
  ALL_LANGUAGE_CODES,
  TERM_REPORTS,
  type LanguageCode,
} from "../../../../lib/academy-data";
import {
  buildCourseModuleDsl,
  courseModuleFor,
} from "../../../../lib/course-library";
import { buildContextualTermReport } from "../../../../lib/term-report";
import type { SubjectId } from "../../../../lib/prompts";

const LANGUAGES = new Set<LanguageCode>(ALL_LANGUAGE_CODES);
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
    term?: string;
    language?: LanguageCode;
    subject?: SubjectId;
    moduleId?: string;
    interfaceLanguage?: "zh" | "en";
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (
    !payload.term?.trim()
    || payload.term.length > 160
    || !payload.language
    || !LANGUAGES.has(payload.language)
    || !payload.subject
    || !SUBJECTS.has(payload.subject)
  ) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const locale = payload.interfaceLanguage === "en" ? "en" : "zh";
  const courseModule = courseModuleFor(payload.subject, payload.moduleId);
  const normalized = payload.term.toLowerCase().replace(/[.,!?]/g, "");
  const report = buildContextualTermReport({
    term: { value: payload.term.trim(), language: payload.language },
    module: courseModule,
    dsl: buildCourseModuleDsl(courseModule, "concept", locale),
    locale,
    knownReport: TERM_REPORTS[normalized],
  });

  return Response.json({
    ...report,
    engine: "local-course-term",
    moduleId: courseModule.id,
  });
}
