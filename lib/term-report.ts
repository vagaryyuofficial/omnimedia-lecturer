import type { LanguageCode, TermReport } from "./academy-data";
import type { CourseModule } from "./course-library";
import { parseLectureDsl } from "./dsl";

type TermReportInput = {
  term: { value: string; language: LanguageCode };
  module: CourseModule;
  dsl: string;
  locale: "zh" | "en";
  knownReport?: TermReport;
};

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[.,!?，。！？：:\s]/g, "");
}

function titleStructure(title: string) {
  const [topic, qualifier] = title.split(/[：:]/, 2).map((part) => part.trim());
  return { topic, qualifier: qualifier || "" };
}

function contextExample(language: LanguageCode, term: string, sentence: string) {
  switch (language) {
    case "FR": return `Dans ce cours, « ${term} » s’emploie dans le contexte suivant : ${sentence}.`;
    case "DE": return `In diesem Kurs wird „${term}“ in folgendem Zusammenhang verwendet: ${sentence}.`;
    case "IT": return `In questo corso, «${term}» si usa nel seguente contesto: ${sentence}.`;
    case "ES": return `En este curso, «${term}» se usa en el siguiente contexto: ${sentence}.`;
    case "KO": return `이 수업에서 ‘${term}’은 다음 맥락에서 사용됩니다: ${sentence}.`;
    case "JA": return `この授業では「${term}」を次の文脈で使います：${sentence}。`;
    case "CN": return `本课在“${sentence}”这一明确语境中使用“${term}”。`;
    default: return `In this lesson, “${term}” is used in this context: ${sentence}.`;
  }
}

function grammarUsageRule(language: LanguageCode, annotation: string, locale: "zh" | "en") {
  const say = (zh: string, en: string) => locale === "en" ? en : zh;
  const lower = annotation.toLocaleLowerCase();
  if (language === "DE" && /trennbares verb/.test(lower)) return say("在德语主句中，变位部分位于第二位，可分前缀通常移到句末。", "In a German main clause, the inflected stem occupies the second position and the separable prefix normally moves to the end.");
  if (language === "FR" && /verbe transitif/.test(lower)) return say("作为法语及物动词使用时，动作直接作用于宾语。", "As a French transitive verb, it takes a direct object.");
  if (language === "FR" && /nom (féminin|masculin)/.test(lower)) return say("名词的冠词与修饰语需要按标注的阴阳性配合。", "Articles and modifiers must agree with the recorded grammatical gender.");
  if (language === "IT" && /nome (femminile|maschile)/.test(lower)) return say("名词的冠词和形容词需要按标注的性与数保持一致。", "Articles and adjectives must agree with the recorded gender and number.");
  if (language === "ES" && /sustantivo (femenino|masculino)/.test(lower)) return say("名词的冠词和形容词需要按标注的性与数保持一致。", "Articles and adjectives must agree with the recorded gender and number.");
  if (language === "KO" && /(동사|동사구)/.test(annotation)) return say("作为韩语动词或动词短语使用时，需要按语体和时态选择句尾。", "As a Korean verb or verb phrase, its ending changes with speech level and tense.");
  if (language === "KO" && /명사/.test(annotation)) return say("作为韩语名词使用时，通过助词标记它在句中的语法角色。", "As a Korean noun, particles mark its grammatical role in the sentence.");
  if (language === "JA" && /サ変動詞/.test(annotation)) return say("作为サ变动词使用时，以「する」承担时态、礼貌体与否定等变化。", "As a Japanese sahen verb, する carries tense, politeness and negation changes.");
  if (language === "JA" && /動詞/.test(annotation)) return say("作为日语动词使用时，需要根据时态、否定和礼貌程度变形。", "As a Japanese verb, it inflects for tense, negation and politeness.");
  if (language === "JA" && /名詞/.test(annotation)) return say("作为日语名词使用时，通过助词标记主题、主语或宾语等句法角色。", "As a Japanese noun, particles mark roles such as topic, subject or object.");
  if (["FR", "IT", "ES"].includes(language) && /verbe|verbo/.test(lower)) return say("作为动词使用时，需要按人称、时态和语气进行变位。", "As a verb, it must be conjugated for person, tense and mood.");
  return say("本地词卡只确认了上述词法属性；更细的变位和搭配应继续查验可靠词典。", "The local card verifies only the stated lexical property; finer inflection and collocation require a reliable dictionary.");
}

export function isModuleTitleTerm(value: string, module: CourseModule) {
  const term = normalize(value);
  return [module.title, module.titleEn].some((title) => normalize(title) === term);
}

export function buildContextualTermReport({ term, module, dsl, locale, knownReport }: TermReportInput): TermReport {
  if (knownReport && locale === "zh") return knownReport;

  if (isModuleTitleTerm(term.value, module)) {
    const title = term.language === "EN" ? module.titleEn : module.title;
    const structure = titleStructure(title);
    if (locale === "en") {
      return {
        definition: module.overviewEn,
        etymology: `This is a course-topic title, not a single lexical item with one etymology. “${structure.topic}” names the object of study${structure.qualifier ? `; “${structure.qualifier}” states the analytical rule that narrows it` : ""}.`,
        grammar: structure.qualifier
          ? `A nominal topic followed by a colon and a methodological qualifier: “${structure.topic}: ${structure.qualifier}”. The second part limits how the first part should be studied.`
          : `A nominal academic title naming the object of study: “${structure.topic}”. It should not be parsed as one dictionary word.`,
        nuance: `The title is operational rather than decorative. In this module it means: ${module.overviewEn} The boundary is tested by this question: “${module.inquiryEn}”`,
        example: `Concrete course task: ${module.inquiryEn}`,
        translation: `具体课程任务：${module.inquiry}`,
      };
    }
    return {
      definition: module.overview,
      etymology: `这是课程主题标题，不是一个具有单一词源的词条。“${structure.topic}”指出研究对象${structure.qualifier ? `；“${structure.qualifier}”是限定研究方式的判断` : ""}。因此不能把整个标题机械地当作一个单词解释。`,
      grammar: structure.qualifier
        ? `中文名词性标题，采用“主题：方法或判断”的结构。冒号前的“${structure.topic}”确定对象，冒号后的“${structure.qualifier}”限定分析标准。`
        : `中文名词性课程标题，中心语是“${structure.topic}”。它命名一个研究主题，不是普通句子。`,
      nuance: `标题在本课中的具体含义是：${module.overview} 判断是否真正理解，要能回答：“${module.inquiry}”`,
      example: `具体课程任务：${module.inquiry}`,
      translation: `Task in English: ${module.inquiryEn}`,
    };
  }

  const cards = parseLectureDsl(dsl).filter((block) => block.type === "language-card");
  for (const card of cards) {
    const entry = card.entries.find((candidate) => normalize(candidate.term) === normalize(term.value));
    if (!entry) continue;
    const neighbor = card.entries.find((candidate) => candidate !== entry);
    const hasEtymology = /(源|来自|from|latin|greek|dal |del |de |어|由来|漢語|和語)/i.test(entry.grammar);
    const example = contextExample(card.language, entry.term, card.sentence);
    const usageRule = grammarUsageRule(card.language, entry.grammar, locale);
    if (locale === "en") {
      return {
        definition: `In this ${module.titleEn} module, “${entry.term}” is used for “${entry.meaning}”. The course context is concrete: ${module.overviewEn}`,
        etymology: hasEtymology
          ? `The local card records the following grammatical or word-history evidence: ${entry.grammar}`
          : `No reliable historical etymology is stored locally for “${entry.term}”. The card records only “${entry.grammar}”; the application does not invent an origin beyond that evidence.`,
        grammar: `${card.language} course-card annotation: ${entry.grammar}. Usage rule: ${usageRule} It appears under the phrase “${card.sentence}”.`,
        nuance: neighbor
          ? `The card distinguishes “${entry.term}” (${entry.meaning}) from “${neighbor.term}” (${neighbor.meaning}). The first should not be treated as an interchangeable label for the second. Apply the distinction to: ${module.inquiryEn}`
          : `Here the term is restricted to “${entry.meaning}” within ${module.titleEn}. Apply it to this exact test: ${module.inquiryEn}`,
        example,
        translation: `本句明确说明：本课在“${card.sentence}”语境中使用“${entry.term}”，其词卡义为“${entry.meaning}”。`,
      };
    }
    return {
      definition: `在“${module.title}”课程中，“${entry.term}”明确表示“${entry.meaning}”。它服务于这一具体判断：${module.overview}`,
      etymology: hasEtymology
        ? `本地词卡记录的语法或构词证据是：${entry.grammar}`
        : `本地资料没有保存“${entry.term}”的可靠历史词源，因此不作猜测。当前能够确认的词法资料只有：“${entry.grammar}”。`,
      grammar: `${card.language} 词卡标注：${entry.grammar}。使用规则：${usageRule} 它位于短语“${card.sentence}”所建立的语境中。`,
      nuance: neighbor
        ? `词卡把“${entry.term}”（${entry.meaning}）与“${neighbor.term}”（${neighbor.meaning}）并列区分；前者不能在没有说明的情况下替代后者。检验问题是：${module.inquiry}`
        : `本课把它限定为“${entry.meaning}”。可以用这个明确问题检验是否掌握：${module.inquiry}`,
      example,
      translation: `本句明确说明：本课在“${card.sentence}”语境中使用“${entry.term}”，其词卡义为“${entry.meaning}”。`,
    };
  }

  if (locale === "en") {
    return {
      definition: `The local curriculum does not yet contain an independent dictionary entry for “${term.value}”. It occurs in the ${module.titleEn} context, whose established explanation is: ${module.overviewEn}`,
      etymology: `No verified local etymology is available for this item. Rather than guess, the application marks the gap and links to the relevant Wikipedia editions and course sources.`,
      grammar: `Language tag: ${term.language}. No locally verified part of speech, inflection or construction rule is currently stored for this exact form.`,
      nuance: `What can be stated from the current course is limited to this boundary question: ${module.inquiryEn} A finer synonym comparison requires a verified lexical source.`,
      example: `Course context requiring a concrete answer: ${module.inquiryEn}`,
      translation: `对应课程任务：${module.inquiry}`,
    };
  }
  return {
    definition: `本地课程尚未保存“${term.value}”的独立词典条目。当前可以确认的是，它出现在“${module.title}”语境中；该课程的明确解释为：${module.overview}`,
    etymology: `本地没有这一词形的可靠词源记录，因此不作推测。可以通过下方对应语言 Wikipedia 与课程来源继续核验。`,
    grammar: `当前语言标记为 ${term.language}；本地资料尚未保存该词形经过核验的词性、变位或搭配规则。`,
    nuance: `当前课程能够确定的语义边界是这个具体问题：“${module.inquiry}”更细的近义词比较需要可靠词典或语料来源。`,
    example: `课程中的具体问题：${module.inquiry}`,
    translation: `Course question: ${module.inquiryEn}`,
  };
}
