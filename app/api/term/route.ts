import { ALL_LANGUAGE_CODES, type LanguageCode } from "../../../lib/academy-data";
import { courseModuleFor } from "../../../lib/course-library";
import type { SubjectId } from "../../../lib/prompts";

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
    moduleId?: string;
    interfaceLanguage?: "zh" | "en";
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

  const courseModule = courseModuleFor(payload.subject, payload.moduleId);
  const interfaceLanguage = payload.interfaceLanguage === "en" ? "en" : "zh";

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
      moduleId: courseModule.id,
      interfaceLanguage,
      courseContext: {
        title: courseModule.title,
        titleEn: courseModule.titleEn,
        overview: courseModule.overview,
        overviewEn: courseModule.overviewEn,
        inquiry: courseModule.inquiry,
        inquiryEn: courseModule.inquiryEn,
      },
      instruction: interfaceLanguage === "en"
        ? "Return concrete, verifiable content for every field. Definition must state what the item is and is not in this course. Etymology must cite a reliable root or explicitly say that no verified etymology is available; never guess. Grammar must give the part of speech or title structure plus at least one usage rule. Nuance must compare a named neighboring concept or state an exact operational boundary. Example must be a natural, complete target-language sentence that actually uses the term; if the item is a course title, provide a concrete worked task instead. Translation must accurately translate the example. Do not use empty phrases such as ‘depends on context’, ‘make the context explicit’ or ‘define the semantic boundary’."
        : "每个字段都必须给出具体、可核验的内容。definition 要说明该条目在本课中是什么、又不是什么；etymology 必须给出可靠词根，无法核实时明确写明没有可靠记录，禁止猜测；grammar 必须给出词性或标题结构以及至少一条使用规则；nuance 必须点名一个相邻概念进行比较，或给出可操作的明确边界；example 必须是自然、完整且实际包含该词的目标语句，若条目是课程标题则改为具体课程任务；translation 必须准确翻译例句。禁止使用“需结合语境”“使语境明确”“划定语义边界”等空话。",
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
  const normalizedReport = Object.fromEntries(
    REPORT_FIELDS.map((field) => [field, typeof result[field] === "string" ? result[field].trim() : ""]),
  ) as Record<(typeof REPORT_FIELDS)[number], string>;
  const emptyBoilerplate = /becomes precise only when its context is made explicit|应把日常用法与当前学科中的技术含义分开|通过近义词比较划定语义边界|只有在语境被明确以后/iu;
  if (
    !REPORT_FIELDS.every((field) => normalizedReport[field].length >= 8)
    || emptyBoilerplate.test(JSON.stringify(normalizedReport))
  ) {
    return Response.json({ error: "INVALID_PROVIDER_RESPONSE" }, { status: 502 });
  }
  return Response.json(normalizedReport);
}
