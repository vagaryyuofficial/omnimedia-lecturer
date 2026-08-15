import {
  COURSE_MODULES,
  buildCourseModuleDsl,
  courseModuleFor,
  sourcesForCourseModule,
  type CourseModule,
  type CourseSource,
} from "./course-library";
import type { SubjectId } from "./prompts";

export type LocalAnswer = {
  dsl: string;
  modules: CourseModule[];
  sources: CourseSource[];
  confidence: "direct" | "related" | "course-context";
};

type LocalAnswerInput = {
  query: string;
  subject: SubjectId;
  currentModuleId?: string | null;
  locale: "zh" | "en";
};

function normalized(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");
}

function searchTerms(value: string) {
  const terms = new Set<string>();
  const normalizedValue = value.normalize("NFKC").toLocaleLowerCase();

  for (const word of normalizedValue.match(/[a-z\p{L}\p{N}][a-z\p{L}\p{N}-]*/gu) || []) {
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+$/u.test(word)) {
      for (let size = 2; size <= Math.min(5, word.length); size += 1) {
        for (let index = 0; index <= word.length - size; index += 1) {
          terms.add(word.slice(index, index + size));
        }
      }
    } else if (word.length >= 2) {
      terms.add(word);
    }
  }

  return [...terms];
}

function scoreField(queryTerms: string[], value: string, weight: number) {
  const haystack = value.normalize("NFKC").toLocaleLowerCase();
  return queryTerms.reduce((score, term) => score + (haystack.includes(term) ? weight : 0), 0);
}

function scoreModule(module: CourseModule, query: string, subject: SubjectId, currentModuleId?: string | null) {
  const queryTerms = searchTerms(query);
  const normalizedQuery = normalized(query);
  const normalizedTitles = [normalized(module.title), normalized(module.titleEn)];
  let score = module.subject === subject ? 2 : 0;

  if (module.id === currentModuleId) score += 5;
  if (normalizedQuery && normalizedTitles.some((title) => title.includes(normalizedQuery) || normalizedQuery.includes(title))) score += 24;
  score += scoreField(queryTerms, `${module.title} ${module.titleEn}`, 6);
  score += scoreField(queryTerms, `${module.overview} ${module.overviewEn}`, 2.5);
  score += scoreField(queryTerms, `${module.inquiry} ${module.inquiryEn}`, 1.5);
  return score;
}

function safeQuestion(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/\{\{|\}\}|\[\[|\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2_000);
}

function uniqueSources(modules: CourseModule[]) {
  const sources = modules.flatMap(sourcesForCourseModule);
  return sources.filter((source, index) => sources.findIndex((candidate) => candidate.id === source.id) === index).slice(0, 6);
}

function targetCardsFor(module: CourseModule, locale: "zh" | "en") {
  return buildCourseModuleDsl(module, "concept", locale)
    .split("\n")
    .filter((line) => /^\[\[(FR|DE|IT|ES|KO|JA):/.test(line.trim()))
    .join("\n");
}

export function findRelevantCourseModules({
  query,
  subject,
  currentModuleId,
}: Omit<LocalAnswerInput, "locale">) {
  const ranked = COURSE_MODULES
    .map((module) => ({ module, score: scoreModule(module, query, subject, currentModuleId) }))
    .sort((left, right) => right.score - left.score || left.module.id.localeCompare(right.module.id));

  const bestScore = ranked[0]?.score || 0;
  const selected = ranked
    .filter((result, index) => index === 0 || result.score >= Math.max(5, bestScore * 0.56))
    .slice(0, 3)
    .map((result) => result.module);

  return selected.length ? selected : [courseModuleFor(subject, currentModuleId)];
}

export function buildLocalCourseAnswer(input: LocalAnswerInput): LocalAnswer {
  const question = safeQuestion(input.query);
  const modules = findRelevantCourseModules(input);
  const primary = modules[0] || courseModuleFor(input.subject, input.currentModuleId);
  const related = modules.slice(1);
  const directScore = scoreModule(primary, question, input.subject, input.currentModuleId);
  const confidence: LocalAnswer["confidence"] = directScore >= 18
    ? "direct"
    : directScore >= 7
      ? "related"
      : "course-context";
  const sources = uniqueSources(modules);
  const relatedZh = related.length
    ? related.map((module) => `- ${module.title}：${module.overview}`).join("\n")
    : `- ${primary.title}：${primary.inquiry}`;
  const relatedEn = related.length
    ? related.map((module) => `- ${module.titleEn}: ${module.overviewEn}`).join("\n")
    : `- ${primary.titleEn}: ${primary.inquiryEn}`;

  const dsl = input.locale === "en"
    ? `## Local course answer\nYou asked: “${question}”\n\n{{${primary.title}|CN}} · {{${primary.titleEn}|EN}}\n\nCentral answer: ${primary.overviewEn}\n\n## 中文理解\n核心回答：${primary.overview}\n\n## Related perspectives\n${relatedEn}\n\n## How to test the answer\n${primary.inquiryEn}\n\nDefine the central term, look for a counterexample, and state what evidence would change the conclusion.\n\n## 回答边界\n这是一条根据本地开放课程资料检索生成的回答，能够解释课程范围内的问题，但不会伪装成实时联网研究。右侧来源可用于继续核验。\n\n## Multilingual concept map\n${targetCardsFor(primary, input.locale)}`
    : `## 本地课程回答\n你问：“${question}”\n\n{{${primary.title}|CN}} · {{${primary.titleEn}|EN}}\n\n核心回答：${primary.overview}\n\n## English explanation\nCentral answer: ${primary.overviewEn}\n\n## 关联视角\n${relatedZh}\n\n## 如何检验这个回答\n${primary.inquiry}\n\n先定义核心术语，再寻找一个反例，并说明什么证据会使你改变结论。\n\n## 回答边界\n这是一条根据本地开放课程资料检索生成的回答，能够解释课程范围内的问题，但不会伪装成实时联网研究。下方来源可用于继续核验。\n\n## 多语概念地图\n${targetCardsFor(primary, input.locale)}`;

  return { dsl, modules, sources, confidence };
}
