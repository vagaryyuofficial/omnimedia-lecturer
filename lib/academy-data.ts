import type { SubjectId } from "./prompts";
import { COURSE_MODULES } from "./course-library";

export const ALL_LANGUAGE_CODES = ["CN", "EN", "FR", "DE", "IT", "ES", "KO", "JA"] as const;
export type LanguageCode = typeof ALL_LANGUAGE_CODES[number];
export const TARGET_LANGUAGE_CODES = ["FR", "DE", "IT", "ES", "KO", "JA"] as const;
export type TargetLanguageCode = typeof TARGET_LANGUAGE_CODES[number];

export type Subject = {
  id: SubjectId;
  campaign: string;
  symbol: string;
  name: string;
  nameEn: string;
  track: string;
  accent: string;
};

export type CurriculumLevel = {
  id: "L1" | "L2" | "L3" | "L4" | "L5" | "L6";
  name: string;
  en: string;
  descriptor: string;
  descriptorEn: string;
  topics: string[];
  topicsEn: string[];
};

const ADVANCED_CURRICULUM: Record<SubjectId, CurriculumLevel[]> = {
  literature: [
    { id: "L4", name: "方法", en: "Methods", descriptor: "叙事学、比较诗学与档案阅读", descriptorEn: "Narratology, comparative poetics and archival reading", topics: [], topicsEn: [] },
    { id: "L5", name: "研究", en: "Research", descriptor: "经典、媒介与数字人文", descriptorEn: "Canons, media and digital humanities", topics: [], topicsEn: [] },
    { id: "L6", name: "专家", en: "Expert Synthesis", descriptor: "原创批评、翻译实践与公共写作", descriptorEn: "Original criticism, translation practice and public writing", topics: [], topicsEn: [] },
  ],
  economics: [
    { id: "L4", name: "方法", en: "Methods", descriptor: "理论建模、宏观测量与因果识别", descriptorEn: "Theory, macro measurement and causal identification", topics: [], topicsEn: [] },
    { id: "L5", name: "研究", en: "Research", descriptor: "市场权力、劳动、发展与环境", descriptorEn: "Market power, labor, development and environment", topics: [], topicsEn: [] },
    { id: "L6", name: "专家", en: "Expert Synthesis", descriptor: "制度、政策评估与可复现研究", descriptorEn: "Institutions, policy evaluation and reproducible research", topics: [], topicsEn: [] },
  ],
  psychology: [
    { id: "L4", name: "方法", en: "Methods", descriptor: "测量、实验设计与认知神经方法", descriptorEn: "Measurement, experimental design and cognitive neuroscience", topics: [], topicsEn: [] },
    { id: "L5", name: "研究", en: "Research", descriptor: "分类、文化发展与计算模型", descriptorEn: "Classification, culture, development and computational models", topics: [], topicsEn: [] },
    { id: "L6", name: "专家", en: "Expert Synthesis", descriptor: "元分析、干预伦理与独立研究", descriptorEn: "Meta-analysis, intervention ethics and independent research", topics: [], topicsEn: [] },
  ],
  business: [
    { id: "L4", name: "方法", en: "Methods", descriptor: "财务、运营与市场证据", descriptorEn: "Finance, operations and market evidence", topics: [], topicsEn: [] },
    { id: "L5", name: "研究", en: "Research", descriptor: "竞争、组织设计与治理", descriptorEn: "Competition, organization design and governance", topics: [], topicsEn: [] },
    { id: "L6", name: "专家", en: "Expert Synthesis", descriptor: "跨境转型、情景规划与高层决策", descriptorEn: "Cross-border transformation, scenarios and executive decisions", topics: [], topicsEn: [] },
  ],
  daily: [
    { id: "L4", name: "独立", en: "Independent", descriptor: "公共服务、职场与媒体理解", descriptorEn: "Public services, work and media literacy", topics: [], topicsEn: [] },
    { id: "L5", name: "精通", en: "Proficiency", descriptor: "语域、幽默与冲突调解", descriptorEn: "Register, humor and conflict mediation", topics: [], topicsEn: [] },
    { id: "L6", name: "专家", en: "Expert Mediation", descriptor: "主持、公共表达与跨语社会参与", descriptorEn: "Facilitation, public speaking and plurilingual participation", topics: [], topicsEn: [] },
  ],
  art: [
    { id: "L4", name: "方法", en: "Methods", descriptor: "技术艺术史、影像与建筑", descriptorEn: "Technical art history, lens media and architecture", topics: [], topicsEn: [] },
    { id: "L5", name: "研究", en: "Research", descriptor: "全球现代性、权力与数字媒介", descriptorEn: "Global modernities, power and digital media", topics: [], topicsEn: [] },
    { id: "L6", name: "专家", en: "Expert Synthesis", descriptor: "来源研究、策展与原创论证", descriptorEn: "Provenance, curating and original argument", topics: [], topicsEn: [] },
  ],
  philosophy: [
    { id: "L4", name: "方法", en: "Methods", descriptor: "形式逻辑、语言分析与伦理论证", descriptorEn: "Formal logic, language analysis and ethical argument", topics: [], topicsEn: [] },
    { id: "L5", name: "研究", en: "Research", descriptor: "心灵、科学、正义与权力", descriptorEn: "Mind, science, justice and power", topics: [], topicsEn: [] },
    { id: "L6", name: "专家", en: "Expert Synthesis", descriptor: "比较哲学、原创论文与公共哲学", descriptorEn: "Comparative philosophy, original theses and public philosophy", topics: [], topicsEn: [] },
  ],
  science: [
    { id: "L4", name: "方法", en: "Methods", descriptor: "数学工具、统计推断与可复现实验", descriptorEn: "Mathematics, statistical inference and reproducible experiments", topics: [], topicsEn: [] },
    { id: "L5", name: "研究", en: "Research", descriptor: "安全、生物技术与气候能源系统", descriptorEn: "Security, biotechnology, climate and energy systems", topics: [], topicsEn: [] },
    { id: "L6", name: "专家", en: "Expert Synthesis", descriptor: "量子信息、AI 系统与研究架构", descriptorEn: "Quantum information, AI systems and research architecture", topics: [], topicsEn: [] },
  ],
};

export type VisualReference = {
  src: string;
  title: string;
  caption: string;
  captionEn?: string;
  sourceUrl: string;
  sourceLabel: string;
};

export type Lesson = {
  index: string;
  title: string;
  deck: string;
  quote: string;
  quoteSource: string;
  conceptDsl: string;
  caseDsl: string;
  closeReadingDsl: string;
  question: string;
  visuals: VisualReference[];
};

export type TermReport = {
  definition: string;
  etymology: string;
  grammar: string;
  nuance: string;
  example: string;
  translation: string;
};

export const SUBJECTS: Subject[] = [
  { id: "literature", campaign: "Q1", symbol: "文", name: "文学名著", nameEn: "Literature", track: "Masterpieces & Theory", accent: "#9a5d47" },
  { id: "economics", campaign: "Q2", symbol: "经", name: "经济学", nameEn: "Economics", track: "Markets & Policy", accent: "#3f6f62" },
  { id: "psychology", campaign: "Q3", symbol: "心", name: "心理学", nameEn: "Psychology", track: "Mind & Behavior", accent: "#7c5f82" },
  { id: "business", campaign: "Q4", symbol: "商", name: "商务交流", nameEn: "Business", track: "Corporate & Strategy", accent: "#446c87" },
  { id: "daily", campaign: "Q5", symbol: "行", name: "生活用语", nameEn: "Daily Life", track: "Culture & Lifestyle", accent: "#b06d3c" },
  { id: "art", campaign: "Q6", symbol: "艺", name: "艺术美学", nameEn: "Art & Aesthetics", track: "History & Criticism", accent: "#725e87" },
  { id: "philosophy", campaign: "Q7", symbol: "哲", name: "哲学", nameEn: "Philosophy", track: "Logic & Existence", accent: "#596172" },
  { id: "science", campaign: "Q8", symbol: "科", name: "科学技术", nameEn: "Sci-Tech", track: "Innovation & Code", accent: "#41768b" },
];

export const CURRICULUM: Record<SubjectId, CurriculumLevel[]> = {
  literature: [
    { id: "L1", name: "基础", en: "Foundation", descriptor: "作品、体裁与阅读方法", descriptorEn: "Works, genres and reading methods", topics: ["短篇小说：叙述者与视角", "十四行诗：格律与转折", "亚里士多德：悲剧与净化"], topicsEn: ["Short fiction: narrator and perspective", "The sonnet: meter and volta", "Aristotle: tragedy and catharsis"] },
    { id: "L2", name: "进阶", en: "Genre", descriptor: "文类、修辞与跨语翻译", descriptorEn: "Genre, rhetoric and translation", topics: ["浮士德：Streben 与现代性", "象征主义：意象的多义性", "世界文学：流通与翻译"], topicsEn: ["Faust: Streben and modernity", "Symbolism: the plurality of images", "World literature: circulation and translation"] },
    { id: "L3", name: "高阶", en: "Theory", descriptor: "形式主义、符号学与批评", descriptorEn: "Formalism, semiotics and criticism", topics: ["俄国形式主义：陌生化", "符号学：能指与所指", "后殖民阅读：中心与边缘"], topicsEn: ["Russian formalism: defamiliarization", "Semiotics: signifier and signified", "Postcolonial reading: center and margin"] },
  ],
  economics: [
    { id: "L1", name: "基础", en: "Foundation", descriptor: "选择、价格与市场", descriptorEn: "Choice, prices and markets", topics: ["稀缺与机会成本", "供给、需求与均衡", "比较优势与贸易"], topicsEn: ["Scarcity and opportunity cost", "Supply, demand and equilibrium", "Comparative advantage and trade"] },
    { id: "L2", name: "核心", en: "Policy", descriptor: "宏观政策与制度", descriptorEn: "Macroeconomic policy and institutions", topics: ["通胀、预期与货币", "失业与经济周期", "财政政策与公共债务"], topicsEn: ["Inflation, expectations and money", "Unemployment and business cycles", "Fiscal policy and public debt"] },
    { id: "L3", name: "高阶", en: "Frontier", descriptor: "博弈、行为与全球治理", descriptorEn: "Games, behavior and global governance", topics: ["纳什均衡与策略互动", "行为经济学与助推", "Debt、dette 与 Schulden"], topicsEn: ["Nash equilibrium and strategic interaction", "Behavioral economics and nudging", "Debt, dette, Schulden and debito"] },
  ],
  psychology: [
    { id: "L1", name: "基础", en: "Foundation", descriptor: "行为、认知与研究方法", descriptorEn: "Behavior, cognition and research methods", topics: ["经典条件反射", "记忆与注意", "实验、相关与因果"], topicsEn: ["Classical conditioning", "Memory and attention", "Experiment, correlation and causation"] },
    { id: "L2", name: "核心", en: "Clinical", descriptor: "人格、发展与临床概念", descriptorEn: "Personality, development and clinical concepts", topics: ["Es / Ich / Über-Ich", "依恋与发展", "认知行为疗法"], topicsEn: ["Es / Ich / Über-Ich", "Attachment and development", "Cognitive behavioral therapy"] },
    { id: "L3", name: "高阶", en: "Theory", descriptor: "精神分析与社会心理", descriptorEn: "Psychoanalysis and social psychology", topics: ["拉康：镜像与大他者", "群体、服从与从众", "自我叙事与身份"], topicsEn: ["Lacan: mirror and the big Other", "Groups, obedience and conformity", "Self-narrative and identity"] },
  ],
  business: [
    { id: "L1", name: "基础", en: "Foundation", descriptor: "清晰、礼貌与执行", descriptorEn: "Clarity, courtesy and execution", topics: ["商务邮件的行动结构", "会议主持与纪要", "反馈与困难对话"], topicsEn: ["Action structure in business email", "Chairing meetings and writing minutes", "Feedback and difficult conversations"] },
    { id: "L2", name: "核心", en: "Strategy", descriptor: "协作、谈判与管理", descriptorEn: "Collaboration, negotiation and management", topics: ["多国谈判与锚定", "敏捷管理与复盘", "品牌定位与价值主张"], topicsEn: ["Multinational negotiation and anchoring", "Agile management and retrospectives", "Brand positioning and value propositions"] },
    { id: "L3", name: "高阶", en: "Executive", descriptor: "跨文化领导与决策", descriptorEn: "Cross-cultural leadership and decisions", topics: ["董事会叙事与修辞", "危机沟通与信任", "跨文化领导力"], topicsEn: ["Boardroom narrative and rhetoric", "Crisis communication and trust", "Cross-cultural leadership"] },
  ],
  daily: [
    { id: "L1", name: "基础", en: "Foundation", descriptor: "抵达、询问与生存", descriptorEn: "Arrival, questions and survival", topics: ["欧洲交通与问路", "餐厅点单与过敏说明", "酒店与紧急求助"], topicsEn: ["European transport and directions", "Ordering food and explaining allergies", "Hotels and emergency assistance"] },
    { id: "L2", name: "核心", en: "Lifestyle", descriptor: "居住、医疗与行政", descriptorEn: "Housing, healthcare and administration", topics: ["租房合同与押金", "看病、症状与处方", "银行、税务与行政"], topicsEn: ["Rental contracts and deposits", "Doctors, symptoms and prescriptions", "Banking, taxes and administration"] },
    { id: "L3", name: "高阶", en: "Culture", descriptor: "习俗、俚语与文化语感", descriptorEn: "Customs, idioms and cultural tone", topics: ["米其林与法餐术语", "德语区礼仪与界限", "六种目标语言的俚语分寸"], topicsEn: ["Michelin and French dining language", "Etiquette and boundaries in German-speaking regions", "Idioms across the six target languages"] },
  ],
  art: [
    { id: "L1", name: "基础", en: "Foundation", descriptor: "观看、构图与材料", descriptorEn: "Seeing, composition and materials", topics: ["构图与视觉重心", "色彩、明度与空间", "媒介、笔触与肌理"], topicsEn: ["Composition and visual weight", "Color, value and space", "Medium, brushwork and texture"] },
    { id: "L2", name: "核心", en: "History", descriptor: "流派与视觉制度", descriptorEn: "Movements and regimes of vision", topics: ["文艺复兴与透视", "印象派的光与时间", "现代主义与抽象"], topicsEn: ["Renaissance and perspective", "Impressionist light and time", "Modernism and abstraction"] },
    { id: "L3", name: "高阶", en: "Criticism", descriptor: "美学、制度与批评", descriptorEn: "Aesthetics, institutions and criticism", topics: ["黄金分割的神话与事实", "康德：无利害的愉悦", "黑格尔与艺术终结论"], topicsEn: ["Golden ratio: myth and evidence", "Kant: disinterested pleasure", "Hegel and the end of art"] },
  ],
  philosophy: [
    { id: "L1", name: "基础", en: "Foundation", descriptor: "论证、概念与古典问题", descriptorEn: "Arguments, concepts and classical problems", topics: ["苏格拉底式追问", "柏拉图：理念与洞穴", "亚里士多德：四因说"], topicsEn: ["Socratic questioning", "Plato: forms and the cave", "Aristotle: the four causes"] },
    { id: "L2", name: "核心", en: "Logic", descriptor: "认识、伦理与辩证法", descriptorEn: "Knowledge, ethics and dialectic", topics: ["康德：先验与物自体", "黑格尔：Aufhebung", "功利主义与义务论"], topicsEn: ["Kant: the transcendental and thing-in-itself", "Hegel: Aufhebung", "Utilitarianism and deontology"] },
    { id: "L3", name: "高阶", en: "Existence", descriptor: "现象学与存在主义", descriptorEn: "Phenomenology and existentialism", topics: ["海德格尔：Dasein", "萨特：存在与虚无", "语言哲学与生活形式"], topicsEn: ["Heidegger: Dasein", "Sartre: being and nothingness", "Philosophy of language and forms of life"] },
  ],
  science: [
    { id: "L1", name: "基础", en: "Foundation", descriptor: "算法、物理与系统", descriptorEn: "Algorithms, physics and systems", topics: ["算法与计算复杂度", "逻辑门与二进制", "经典力学与建模"], topicsEn: ["Algorithms and computational complexity", "Logic gates and binary", "Classical mechanics and modeling"] },
    { id: "L2", name: "核心", en: "Engineering", descriptor: "网络、数据与架构", descriptorEn: "Networks, data and architecture", topics: ["分布式系统与共识", "云架构与弹性", "神经网络与反向传播"], topicsEn: ["Distributed systems and consensus", "Cloud architecture and resilience", "Neural networks and backpropagation"] },
    { id: "L3", name: "高阶", en: "Frontier", descriptor: "前沿理论与技术伦理", descriptorEn: "Frontier theory and technology ethics", topics: ["量子叠加与测量", "大模型与涌现能力", "技术风险与可解释性"], topicsEn: ["Quantum superposition and measurement", "Large models and emergent capability", "Technology risk and explainability"] },
  ],
};

// Keep the visible curriculum and the complete built-in course library in one
// source of truth. Descriptors above define the progression; module titles and
// explanations live in course-library.ts.
(Object.keys(CURRICULUM) as SubjectId[]).forEach((subject) => {
  CURRICULUM[subject].push(...ADVANCED_CURRICULUM[subject]);
  CURRICULUM[subject].forEach((level) => {
    const modules = COURSE_MODULES.filter((module) => module.subject === subject && module.level === level.id);
    level.topics = modules.map((module) => module.title);
    level.topicsEn = modules.map((module) => module.titleEn);
  });
});

const VISUALS = {
  freud: { src: "/gallery/freud.jpg", title: "Sigmund Freud, 1926", caption: "Ferdinand Schmutzer 摄影；精神分析术语的历史语境。", captionEn: "Ferdinand Schmutzer's portrait situates psychoanalytic vocabulary in its historical setting.", sourceUrl: "https://commons.wikimedia.org/wiki/File:Sigmund_Freud_1926_(cropped).jpg", sourceLabel: "Wikimedia Commons · Public Domain" },
  eniac: { src: "/gallery/eniac.jpg", title: "Programming the ENIAC", caption: "早期电子计算机与“程序”概念的物质形态。", captionEn: "An early electronic computer reveals the material form of a program.", sourceUrl: "https://commons.wikimedia.org/wiki/File:Eniac_(cropped).jpg", sourceLabel: "U.S. Army · Public Domain" },
  monet: { src: "/gallery/monet.jpg", title: "Water Lilies, 1906", caption: "莫奈以连续观看松动固有色与物体边界。", captionEn: "Monet's sustained observation loosens local color and the boundary of objects.", sourceUrl: "https://commons.wikimedia.org/wiki/File:Monet%27s_Water_Lilies.jpg", sourceLabel: "Wikimedia Commons · Public Domain" },
  michelin: { src: "/gallery/michelin.jpg", title: "Le Guide Michelin, 1900", caption: "旅行基础设施如何塑造现代餐饮语言与消费文化。", captionEn: "Travel infrastructure helped shape modern dining language and consumer culture.", sourceUrl: "https://commons.wikimedia.org/wiki/File:Guidem_michelin_1900.jpg", sourceLabel: "Wikimedia Commons · Public Domain" },
  athens: { src: "/gallery/athens.jpg", title: "The School of Athens", caption: "拉斐尔用透视结构安排古典知识的谱系。", captionEn: "Raphael uses perspective to organize a genealogy of classical knowledge.", sourceUrl: "https://commons.wikimedia.org/wiki/File:Scuola_di_atene_01.jpg", sourceLabel: "Wikimedia Commons · Public Domain" },
  smith: { src: "/gallery/adam-smith.jpg", title: "Adam Smith", caption: "古典政治经济学的道德哲学背景。", captionEn: "The moral-philosophical setting of classical political economy.", sourceUrl: "https://commons.wikimedia.org/wiki/File:AdamSmith.jpg", sourceLabel: "Wikimedia Commons · Public Domain" },
};

export const TARGET_CARD_SUPPLEMENTS: Record<SubjectId, Partial<Record<TargetLanguageCode, string>>> = {
  literature: {
    ES: "[[ES: Tragedia y catarsis || tragedia : 悲剧 / tragedy : sustantivo femenino；del griego tragōidía ;; catarsis : 净化或疏解 / purification or release : sustantivo femenino；del griego kátharsis]]",
    KO: "[[KO: 비극과 카타르시스 || 비극 : 悲剧 / tragedy : 명사；한자어 悲劇 ;; 카타르시스 : 净化或疏解 / catharsis : 명사；그리스어 kátharsis에서 유래]]",
    JA: "[[JA: 悲劇とカタルシス || 悲劇 : 悲剧 / tragedy : 名詞；漢語 ;; カタルシス : 净化或疏解 / catharsis : 名詞；ギリシア語由来]]",
  },
  economics: {
    ES: "[[ES: Deuda y obligación || deuda : 债务 / debt : sustantivo femenino；del latín debita ;; obligación : 义务或债券 / obligation or bond : sustantivo femenino；sentido jurídico y financiero]]",
    KO: "[[KO: 부채와 의무 || 부채 : 债务 / debt : 명사；한자어 負債 ;; 의무 : 义务 / obligation : 명사；한자어 義務]]",
    JA: "[[JA: 債務と義務 || 債務 : 债务 / debt : 名詞；法律・金融用語 ;; 義務 : 义务 / obligation : 名詞；倫理・法律用語]]",
  },
  psychology: {
    ES: "[[ES: Ello, yo y superyó || ello : 本我 / id : pronombre sustantivado；traducción de Es ;; yo : 自我 / ego : pronombre sustantivado ;; superyó : 超我 / superego : sustantivo compuesto]]",
    KO: "[[KO: 이드, 자아와 초자아 || 이드 : 本我 / id : 명사；라틴어 id에서 유래 ;; 자아 : 自我 / ego : 명사；한자어 自我 ;; 초자아 : 超我 / superego : 명사；한자어 超自我]]",
    JA: "[[JA: エス・自我・超自我 || エス : 本我 / id : 名詞；ドイツ語 Es の音写 ;; 自我 : 自我 / ego : 名詞 ;; 超自我 : 超我 / superego : 名詞；精神分析用語]]",
  },
  business: {
    ES: "[[ES: Posición e interés || posición : 立场 / position : sustantivo femenino ;; interés : 利益或关切 / interest or concern : sustantivo masculino；语境决定含义]]",
    KO: "[[KO: 입장과 이해관계 || 입장 : 立场 / position : 명사；한자어 立場 ;; 이해관계 : 利害关系 / interests : 명사；한자어 利害關係]]",
    JA: "[[JA: 立場と利害 || 立場 : 立场 / position : 名詞 ;; 利害 : 利害关系 / interests : 名詞；交渉では要求と区別する]]",
  },
  daily: {
    ES: "[[ES: Quisiera la cuenta, por favor || quisiera : 我想要 / I would like : imperfecto de subjuntivo；礼貌请求 ;; cuenta : 账单 / bill : sustantivo femenino；餐厅结账常用]]",
    KO: "[[KO: 계산서 주세요 || 계산서 : 账单 / bill : 명사；餐厅付款用语 ;; 주세요 : 请给我 / please give me : 주다 的敬语请求形式]]",
    JA: "[[JA: お会計をお願いします || お会計 : 账单或结账 / bill or checkout : 名詞；美化語接頭辞 お ;; お願いします : 麻烦您 / please : 丁寧な依頼表現]]",
  },
  art: {
    ES: "[[ES: Luz e impresión || luz : 光 / light : sustantivo femenino；del latín lux ;; impresión : 印象 / impression : sustantivo femenino；亦指感知痕迹]]",
    KO: "[[KO: 빛과 인상 || 빛 : 光 / light : 고유어 명사 ;; 인상 : 印象 / impression : 명사；한자어 印象]]",
    JA: "[[JA: 光と印象 || 光 : 光 / light : 名詞；和語 ;; 印象 : 印象 / impression : 名詞；美学・心理学用語]]",
  },
  philosophy: {
    ES: "[[ES: superación dialéctica || superación : 扬弃或超越 / sublation or overcoming : sustantivo femenino；来自 superar ;; dialéctica : 辩证的 / dialectical : adjetivo；同时包含否定与保留]]",
    KO: "[[KO: 변증법적 지양 || 지양 : 扬弃 / sublation : 명사；한자어 止揚 ;; 변증법적 : 辩证的 / dialectical : 관형형；독일어 dialektisch의 번역어]]",
    JA: "[[JA: 弁証法的止揚 || 止揚 : 扬弃 / sublation : 名詞；Aufhebung の訳語 ;; 弁証法的 : 辩证的 / dialectical : 形容動詞的用法]]",
  },
  science: {
    ES: "[[ES: complejidad y algoritmo || complejidad : 复杂度 / complexity : sustantivo femenino ;; algoritmo : 算法 / algorithm : sustantivo masculino；源自 al-Khwārizmī 的拉丁转写]]",
    KO: "[[KO: 복잡도와 알고리즘 || 복잡도 : 复杂度 / complexity : 명사；한자어 複雜度 ;; 알고리즘 : 算法 / algorithm : 명사；영어 algorithm에서 유래]]",
    JA: "[[JA: 計算量とアルゴリズム || 計算量 : 计算复杂度 / computational complexity : 名詞；算法分析术语 ;; アルゴリズム : 算法 / algorithm : 名詞；外来語]]",
  },
};

export const LESSONS: Record<SubjectId, Lesson> = {
  literature: {
    index: "Q1 · L1.03 · POETICS",
    title: "悲剧为何使我们\n在痛苦中获得清明",
    deck: "从亚里士多德的一个希腊词出发，比较英、法、德三种学术传统如何理解悲剧经验。",
    quote: "Tragedy is an imitation of an action that is serious, complete, and of a certain magnitude.",
    quoteSource: "Aristotle · Poetics, Chapter 6",
    conceptDsl: `## 概念界定
亚里士多德把{{悲剧|CN}}理解为对完整行动的摹仿。英语 {{tragedy|EN}}、法语 {{tragédie|FR}} 与德语 {{Tragödie|DE}} 都继承希腊语 tragōidia，但各自的批评传统并不完全相同。

[[EN: Tragedy and catharsis || tragedy : 悲剧 : countable noun；源自 Greek tragōidia ;; catharsis : 净化/疏泄 : noun；医学与伦理语感并存]]
[[FR: Tragédie et catharsis || tragédie : 悲剧 : nom féminin；古典主义强调规则与崇高 ;; catharsis : 净化 : nom féminin；保留希腊词形]]
[[DE: Tragödie und Katharsis || Tragödie : 悲剧 : Femininum；德语观念史常与冲突相连 ;; Katharsis : 净化 : Femininum；哲学与戏剧理论用语]]
[[IT: Tragedia e catarsi || tragedia : 悲剧 : nome femminile；dal greco tragōidia ;; catarsi : 净化/疏解 : nome femminile；termine estetico e psicologico]]

## 历史脉络
{{catharsis|EN}}并不只是“发泄情绪”。它可能指向情感的澄清、调节或伦理教育。中文“净化”带有结果感，而原词更像一场正在发生的观看过程。

## 当代应用
当影视作品让我们接近一个并不赞同的人物时，悲剧机制仍在工作：它训练我们同时保留判断与理解。`,
    caseDsl: `## 案例：反英雄为何仍值得被理解
设想一部剧集让观众长期跟随一个道德上不断失足的人。{{dramatic irony|EN}}使观众知道角色尚不知道的事实；{{ironie dramatique|FR}}更强调舞台传统；{{dramatische Ironie|DE}}则保留分析性的复合词结构。

[[EN: The audience knows more than the hero || dramatic irony : 戏剧反讽 : adjective + noun；信息差构成张力 ;; moral distance : 道德距离 : abstract noun phrase；并非冷漠]]

关键不是“原谅”角色，而是检验叙事如何分配同情、责任与知识。`,
    closeReadingDsl: `## 学术精读
{{Mimesis|EN}} is an imitation not of persons, but of action and life.

句子的重心落在 not of persons, but of action：否定—转折结构把文学的对象从“人物复制”移向“行动组织”。法语 {{imitation de l’action|FR}} 保留抽象名词结构；德语 {{Nachahmung einer Handlung|DE}} 中 Nach-ahmung 带有“随后仿作”的构词痕迹。

[[DE: Nachahmung einer Handlung || Nachahmung : 摹仿 : Femininum；nach + ahmen ;; Handlung : 行动/情节 : Femininum；亦可指交易与行为]]`,
    question: "如果悲剧并不替我们消除痛苦，它究竟为痛苦增加了什么形式？",
    visuals: [VISUALS.athens, VISUALS.monet],
  },
  economics: {
    index: "Q2 · L3.03 · ECONOMIC LANGUAGE",
    title: "Debt、dette 与 Schuld：\n债务为何带着道德阴影",
    deck: "经济概念从不只生活在公式里；一个词的历史，会悄悄改变社会如何判断借贷、责任与救济。",
    quote: "The real price of everything is the toil and trouble of acquiring it.",
    quoteSource: "Adam Smith · The Wealth of Nations",
    conceptDsl: `## 概念界定
经济学中的{{债务|CN}}是未来支付义务。英语 {{debt|EN}} 源自拉丁语 debitum，“所欠之物”；法语 {{dette|FR}} 延续同一词源；德语 {{Schuld|DE}} 同时意味着债务、过错与罪责。

[[EN: Debt and obligation || debt : 债务 : noun；from Latin debitum ;; obligation : 义务/债券 : noun；法律与金融双重语境]]
[[FR: Dette et créance || dette : 债务 : nom féminin；debere 的历史后裔 ;; créance : 债权/信念 : nom féminin；与 croire 同源]]
[[DE: Schuld und Schulden || Schuld : 过错/罪责 : Femininum；通常用单数 ;; Schulden : 债务 : Pluralwort；经济语境常用复数]]
[[IT: Debito e obbligazione || debito : 债务 : nome maschile；dal latino debitum ;; obbligazione : 义务/债券 : nome femminile；法律与金融双重含义]]

## 制度差异
把公共债务描述为家庭“欠债”，常会偷偷引入道德判断；但国家拥有征税、发币与跨期配置资源的制度能力，不能被简单类比为家庭。

## 应用
分析债务政策时，应同时问：谁欠谁、以何种货币、在什么期限、风险由谁承担。`,
    caseDsl: `## 案例：一次债务减免谈判
债权人强调 {{moral hazard|EN}}，债务国强调 {{soutenabilité de la dette|FR}}，德语政策讨论可能使用 {{Schuldentragfähigkeit|DE}}。三个表达分别把焦点放在激励、可持续性与“承载能力”上。

[[DE: Ist die Schuldenlast tragbar? || Schuldenlast : 债务负担 : compound noun；Schulden + Last ;; tragbar : 可承受的 : adjective；字面为“可被携带”]]`,
    closeReadingDsl: `## 学术精读
{{There is no such thing as a free lunch|EN}}.

这一格言不是说所有免费服务都不存在，而是说资源具有{{机会成本|CN}}。法语 {{coût d’opportunité|FR}} 倾向技术表达；德语 {{Opportunitätskosten|DE}} 以复合名词把替代选项压缩为一个分析单位。`,
    question: "当一种经济语言把债务写成罪责时，它会鼓励怎样的政策，又遮蔽什么事实？",
    visuals: [VISUALS.smith, VISUALS.michelin],
  },
  psychology: {
    index: "Q3 · L2.01 · PSYCHOANALYSIS",
    title: "Es、Ich、Über-Ich：\n翻译如何重塑心灵结构",
    deck: "回到弗洛伊德的德语日常词，观察拉丁化英译 Id / Ego / Superego 带来的精确与距离。",
    quote: "Wo Es war, soll Ich werden.",
    quoteSource: "Sigmund Freud · Neue Folge der Vorlesungen",
    conceptDsl: `## 概念界定
弗洛伊德使用非常日常的德语：{{Es|DE}}是“它”，{{Ich|DE}}是“我”，{{Über-Ich|DE}}是“在我之上的我”。英语 {{Id|EN}}、{{Ego|EN}}、{{Superego|EN}} 的拉丁化翻译更像一套专业装置。

[[DE: Es, Ich und Über-Ich || Es : 本我 : neuter pronoun used as noun ;; Ich : 自我 : neuter nominalized pronoun ;; Über-Ich : 超我 : compound noun；über + Ich]]
[[EN: Id, ego and superego || id : 本我 : Latin pronoun “it” ;; ego : 自我 : Latin pronoun “I” ;; superego : 超我 : Latinized compound]]
[[FR: Ça, moi et surmoi || ça : 本我 : pronom démonstratif nominalisé ;; moi : 自我 : pronom tonique ;; surmoi : 超我 : nom masculin；sur + moi]]
[[IT: Es, Io e Super-io || Es : 本我 : pronome tedesco sostantivato ;; Io : 自我 : pronome personale sostantivato ;; Super-io : 超我 : nome composto；super + io]]

## 语义微析
当术语从“它—我—超我”变成 Id—Ego—Superego，理论获得国际可传播性，也可能失去原文中令人不安的日常亲近感。`,
    caseDsl: `## 案例：一封没有发出的愤怒邮件
立即发送的冲动可以用 {{Es|DE}} 描述；对后果的现实评估接近 {{Ich|DE}}；内心“专业人士不该愤怒”的苛刻声音则可能来自 {{Über-Ich|DE}}。

这不是把人切成三个实体，而是用模型观察同一决定中的不同心理要求。`,
    closeReadingDsl: `## 学术精读
{{Wo Es war, soll Ich werden|DE}}.

Wo 引导地点从句；war 是 sein 的过去时；soll 带有任务、要求而非必然；werden 不是“拥有”，而是“成为”。可译为：“本我所在之处，自我应当生成。”

[[DE: Wo Es war, soll Ich werden || wo : 在……之处 : relative adverb ;; soll : 应当 : modal verb, 3rd singular ;; werden : 成为 : infinitive]]`,
    question: "专业术语让我们看得更清楚，还是让经验变得更遥远？",
    visuals: [VISUALS.freud, VISUALS.athens],
  },
  business: {
    index: "Q4 · L2.01 · NEGOTIATION",
    title: "跨文化谈判：\n立场背后还有什么",
    deck: "把 position 与 interest 分开，并比较英、法、德商务语境中礼貌、直接与承诺的不同重量。",
    quote: "Separate the people from the problem.",
    quoteSource: "Fisher, Ury & Patton · Getting to Yes",
    conceptDsl: `## 概念界定
{{立场|CN}}是谈判桌上公开提出的要求，英语 {{position|EN}}；{{利益|CN}}是要求背后的需要，英语 {{interest|EN}}。法语 {{enjeu|FR}} 带有“押注之物”的紧迫感；德语 {{Interesse|DE}} 通常更直白地进入议程。

[[EN: Position versus interest || position : 立场 : noun；explicit demand ;; interest : 利益/关切 : noun；underlying need]]
[[FR: Position et enjeu || position : 立场 : nom féminin ;; enjeu : 关键利害 : nom masculin；ce qui est en jeu]]
[[DE: Position und Interesse || Position : 立场 : Femininum ;; Interesse : 利益/兴趣 : Neutrum；搭配 an + Dativ]]
[[IT: Posizione e interesse || posizione : 立场 : nome femminile ;; interesse : 利益/关切 : nome maschile；常与 per 或 di 搭配]]

## 应用
高质量商务沟通不回避分歧，而是把“不可接受”翻译成可讨论的约束、风险与交换条件。`,
    caseDsl: `## 案例：总部要求提前两周交付
团队不能只回答 yes / no。应先确认 {{decision criterion|EN}}，再提出法语式的 {{marge de manœuvre|FR}}（回旋空间），并用德语 {{verbindlich|DE}} 区分“有约束力”与“仅供讨论”。

[[DE: Ist dieser Termin verbindlich? || Termin : 期限/预约 : Maskulinum ;; verbindlich : 有约束力的 : adjective；来自 verbinden]]`,
    closeReadingDsl: `## 学术精读
{{Could we revisit the assumptions behind this timeline?|EN}}

Could we 不是能力询问，而是礼貌地重启议程；revisit 避免直接说“你错了”；behind this timeline 把冲突从人转移到假设。`,
    question: "一场谈判中，什么信息只有在双方停止捍卫立场后才会出现？",
    visuals: [VISUALS.smith, VISUALS.michelin],
  },
  daily: {
    index: "Q5 · L3.01 · FOOD CULTURE",
    title: "从 terroir 到 Rechnung：\n一顿饭里的文化语法",
    deck: "不只学会点单，也理解菜单、服务与结账背后的法语美食制度和德语边界表达。",
    quote: "Ce livre paraît avec le siècle.",
    quoteSource: "Guide Michelin · 1900 edition",
    conceptDsl: `## 核心场景
法语 {{terroir|FR}} 不只是“产地”，它把土壤、气候、技艺与地方身份压进一个词。英语 {{local produce|EN}} 更偏供应来源；德语 {{Regionalität|DE}} 常进入可持续消费语境。

[[FR: Je voudrais réserver une table || voudrais : 想要 : conditionnel présent；比 je veux 委婉 ;; réserver : 预订 : infinitif；直接宾语 une table]]
[[EN: Could we have the bill, please? || could : 可以吗 : modal for polite request ;; bill : 账单 : British English；US English 常用 check]]
[[DE: Die Rechnung, bitte || Rechnung : 账单 : Femininum；动词 rechnen 的名词 ;; bitte : 请 : particle；简短但不失礼]]
[[IT: Vorrei il conto, per favore || vorrei : 我想要 : condizionale presente；比 voglio 更礼貌 ;; conto : 账单 : nome maschile；餐厅结账常用]]

## 文化提示
礼貌不是句子越长越好，而是选择符合场景的距离：法语重视条件式，英语偏好缓和情态，德语允许清楚而简短的名词短语。`,
    caseDsl: `## 案例：说明食物过敏
不要只说“不喜欢”。英语用 {{I am allergic to nuts|EN}}；法语 {{Je suis allergique aux fruits à coque|FR}}；德语 {{Ich bin gegen Nüsse allergisch|DE}}。

[[FR: Je suis allergique aux fruits à coque || allergique : 过敏的 : adjective；à + article contracté aux ;; fruits à coque : 坚果类 : plural noun phrase]]`,
    closeReadingDsl: `## 情境精读
{{Est-ce que le service est compris?|FR}}

Est-ce que 将陈述句转换为中性疑问；service 指服务费而非“服务动作”；compris 是 comprendre 的过去分词，在这里表示“包含在内”。`,
    question: "真正的语言能力，是说出正确句子，还是判断此刻需要怎样的距离？",
    visuals: [VISUALS.michelin, VISUALS.monet],
  },
  art: {
    index: "Q6 · L2.02 · IMPRESSIONISM",
    title: "印象派：\n当光比物体更真实",
    deck: "从笔触、固有色与瞬间观看出发，比较 Impressionism、impressionnisme 与 Impressionismus 的批评语感。",
    quote: "For me, a landscape does not exist in its own right, since its appearance changes at every moment.",
    quoteSource: "Claude Monet",
    conceptDsl: `## 概念界定
{{印象派|CN}}不是“画得模糊”。英语 {{Impressionism|EN}}、法语 {{impressionnisme|FR}}、德语 {{Impressionismus|DE}} 都源于一次带有讽刺意味的批评命名，却逐渐成为现代观看制度的标志。

[[FR: Impression, soleil levant || impression : 印象 : nom féminin；来自拉丁 imprimere ;; soleil levant : 日出 : participe présent作后置修饰]]
[[EN: broken colour and optical mixture || broken colour : 碎色 : art-historical noun phrase ;; optical mixture : 视觉混色 : colour mixes in perception]]
[[DE: der flüchtige Augenblick || flüchtig : 转瞬即逝的 : adjective；亦有“逃逸”之意 ;; Augenblick : 瞬间 : compound；Auge + Blick]]
[[IT: luce e impressione || luce : 光 : nome femminile；源自拉丁 lux ;; impressione : 印象 : nome femminile；亦指感知留下的痕迹]]

## 观看方法
先不要问“画的是什么”，而要问：最亮的色在哪里？边缘何处消失？冷暖色如何代替传统明暗塑造空间？`,
    caseDsl: `## 案例：同一池塘为何要画二十次
系列绘画把“作品”从单幅结果改写为观察过程。{{seriality|EN}} 强调序列制度；{{série|FR}} 保留工作室实践感；{{Werkreihe|DE}} 把一组作品理解为完整研究。

变化的不是池塘主题，而是时间、天气与观看者身体之间的关系。`,
    closeReadingDsl: `## 图像精读
观察《睡莲》：画面缺少稳定地平线，水面同时像深度与表皮。法语 {{surface|FR}} 与英语 {{surface|EN}} 都可指表面；德语 {{Oberfläche|DE}} 的复合结构字面提示“上方的平面”。

[[DE: Licht auf der Oberfläche || Licht : 光 : Neutrum ;; Oberfläche : 表面 : Femininum；ober + Fläche]]`,
    question: "当物体的边界随光线变化时，我们看见的是世界，还是观看本身？",
    visuals: [VISUALS.monet, VISUALS.athens],
  },
  philosophy: {
    index: "Q7 · L2.02 · DIALECTICS",
    title: "Aufhebung：\n一个词里的取消、保存与提升",
    deck: "黑格尔最难翻译的词之一，如何在同一个动作中容纳否定与继承。",
    quote: "Das Wahre ist das Ganze.",
    quoteSource: "Hegel · Phänomenologie des Geistes",
    conceptDsl: `## 概念界定
德语 {{Aufhebung|DE}} 同时包含取消、保存和抬升。中文常译“扬弃”，英语 {{sublation|EN}} 是为哲学制造的拉丁化术语，法语 {{relève|FR}} 则被德里达赋予“接替—提升”的新张力。

[[DE: Aufhebung des Widerspruchs || Aufhebung : 扬弃 : Femininum；来自 aufheben ;; Widerspruch : 矛盾 : Maskulinum；wider + Spruch]]
[[EN: dialectical sublation || dialectical : 辩证的 : adjective；Greek dialektikē ;; sublation : 扬弃 : technical noun；Latin sublatus]]
[[FR: la relève dialectique || relève : 接替/提升 : nom féminin；relever 的名词 ;; dialectique : 辩证的 : adjectif或nom féminin]]
[[IT: superamento dialettico || superamento : 扬弃/超越 : nome maschile；来自 superare ;; dialettico : 辩证的 : aggettivo；需结合保留与否定理解]]

## 思想动作
辩证法不是“折中”。新阶段并不把矛盾双方各取一半，而是改变它们能够出现的整体结构。`,
    caseDsl: `## 思想实验：规则与自由
一位音乐家先把规则体验为限制，后来通过熟练掌握而获得即兴自由。规则没有被简单抛弃，而是在更高实践中被 {{aufgehoben|DE}}。

这并不证明一切限制都合理；它只展示“克服”如何可能包含“保存”。`,
    closeReadingDsl: `## 学术精读
{{Das Wahre ist das Ganze|DE}}.

Das Wahre 是形容词 wahr 的名词化中性形式；das Ganze 也是名词化表达。“真理是整体”并非说细节不重要，而是说一个判断的意义来自它在展开过程中的位置。

[[DE: Das Wahre ist das Ganze || Wahre : 真者/真理 : nominalized adjective, neuter ;; Ganze : 整体 : nominalized adjective, neuter]]`,
    question: "一种思想被超越以后，什么值得保存，谁来决定？",
    visuals: [VISUALS.athens, VISUALS.freud],
  },
  science: {
    index: "Q8 · L1.01 · ALGORITHMS",
    title: "算法不只是代码：\n它是一种可执行的解释",
    deck: "从词源、有限步骤与复杂度出发，理解 algorithm、algorithme 与 Algorithmus 如何进入现代世界。",
    quote: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    quoteSource: "Alan Turing · Computing Machinery and Intelligence",
    conceptDsl: `## 概念界定
{{算法|CN}}是一组有限、明确、可执行的步骤，用来把输入转换为输出。英语 {{algorithm|EN}}、法语 {{algorithme|FR}}、德语 {{Algorithmus|DE}} 都可追溯至花拉子米姓名的拉丁转写。

[[EN: finite and unambiguous steps || finite : 有限的 : adjective；必须终止 ;; unambiguous : 无歧义的 : adjective；un + ambiguous]]
[[FR: complexité algorithmique || complexité : 复杂度 : nom féminin ;; algorithmique : 算法的 : adjectif；亦可作学科名词]]
[[DE: Laufzeit und Speicherbedarf || Laufzeit : 运行时间 : Femininum；laufen + Zeit ;; Speicherbedarf : 存储需求 : Maskulinum；three-part compound]]
[[IT: complessità e algoritmo || complessità : 复杂度 : nome femminile；重音落在末音节 ;; algoritmo : 算法 : nome maschile；源自 al-Khwārizmī 的拉丁转写]]

## 现代应用
算法从不只关乎效率：当步骤处理信贷、招聘或内容推荐时，输入如何定义、错误如何分配，都会成为制度问题。`,
    caseDsl: `## 案例：两条路线，哪一条“更优”
导航算法必须先定义 {{cost function|EN}}：最短时间、最低费用、最少碳排，还是最少换乘？法语 {{fonction de coût|FR}} 与德语 {{Kostenfunktion|DE}} 都提醒我们，“最优”只在目标被明确之后成立。

[[EN: optimize the objective function || optimize : 优化 : transitive verb ;; objective function : 目标函数 : technical noun phrase]]`,
    closeReadingDsl: `## 代码精读
{{If the condition holds, repeat the procedure|EN}}.

if 从句提供布尔条件；holds 在数学英语中意为“成立”；repeat 要求过程可被重新执行。德语可说 {{wenn die Bedingung erfüllt ist|DE}}，其中 erfüllt ist 是状态被动态。

[[DE: wenn die Bedingung erfüllt ist || Bedingung : 条件 : Femininum ;; erfüllt ist : 得到满足 : Zustandspassiv；sein + Partizip II]]`,
    question: "当算法的目标函数由人设定时，所谓“机器中立”还能成立吗？",
    visuals: [VISUALS.eniac, VISUALS.athens],
  },
};

export type LessonTranslation = Pick<Lesson, "title" | "deck" | "conceptDsl" | "caseDsl" | "closeReadingDsl" | "question">;

export const LESSONS_EN: Record<SubjectId, LessonTranslation> = {
  literature: {
    title: "Why tragedy brings\nclarity through pain",
    deck: "Beginning with Aristotle, compare how six target-language traditions frame tragic experience.",
    conceptDsl: `## Concept
Tragedy is not simply an unhappy event. It organizes action so that fear and pity become intelligible rather than merely overwhelming.

[[FR: Tragédie et catharsis || tragédie : tragedy : nom féminin; from Greek tragōidia ;; catharsis : purification or clarification : nom féminin; used in aesthetics and psychology]]
[[DE: Tragödie und Katharsis || Tragödie : tragedy : Femininum; often linked to conflict in German criticism ;; Katharsis : catharsis : Femininum; a philosophical and dramatic term]]
[[IT: Tragedia e catarsi || tragedia : tragedy : nome femminile; dal greco tragōidia ;; catarsi : purification or release : nome femminile; termine estetico e psicologico]]

## Historical thread
{{catharsis|EN}} can mean emotional clarification, regulation or ethical education. Translation changes which of these possibilities comes to the foreground.

## Modern use
Stories still train us to preserve judgment while understanding people whose choices we reject.`,
    caseDsl: `## Case: the antihero
A series asks us to follow a morally compromised character. {{ironie dramatique|FR}}, {{dramatische Ironie|DE}} and {{ironia drammatica|IT}} all name an information gap, but each term carries a different theatrical history.

The analytical question is not whether the character deserves forgiveness, but how narrative distributes sympathy, responsibility and knowledge.`,
    closeReadingDsl: `## Close reading
Mimesis is an imitation not of persons, but of action and life.

The not … but structure moves the object of literature from copying a person to organizing action. Compare {{imitation de l’action|FR}}, {{Nachahmung einer Handlung|DE}} and {{imitazione dell’azione|IT}}.`,
    question: "If tragedy does not remove pain, what form does it add to pain?",
  },
  economics: {
    title: "Debt, dette, Schuld and debito:\nthe moral shadow of borrowing",
    deck: "Economic concepts do not live only in equations: word histories influence how societies judge credit, obligation and relief.",
    conceptDsl: `## Concept
Debt is an obligation to make a future payment. The vocabulary surrounding that obligation can introduce moral meanings before economic analysis begins.

[[FR: Dette et créance || dette : debt : nom féminin; from Latin debitum ;; créance : claim or credit : nom féminin; historically related to croire]]
[[DE: Schuld und Schulden || Schuld : fault or guilt : Femininum; normally singular ;; Schulden : debts : Pluralwort; the usual financial form]]
[[IT: Debito e obbligazione || debito : debt : nome maschile; dal latino debitum ;; obbligazione : obligation or bond : nome femminile; legal and financial senses]]

## Institutional difference
A state is not simply a large household: taxation, monetary institutions and long time horizons change what debt can do.

## Application
Always ask who owes whom, in which currency, over what period and who carries the risk.`,
    caseDsl: `## Case: negotiating debt relief
A creditor emphasizes {{aléa moral|FR}}, a German policy paper tests {{Schuldentragfähigkeit|DE}}, and an Italian analyst asks about {{sostenibilità del debito|IT}}. Each phrase directs attention to a different policy concern.`,
    closeReadingDsl: `## Close reading
There is no such thing as a free lunch.

The maxim points to opportunity cost rather than denying that a service can be free at the point of use. Compare {{coût d’opportunité|FR}}, {{Opportunitätskosten|DE}} and {{costo opportunità|IT}}.`,
    question: "When debt is described as guilt, which policies become easier to defend—and which facts disappear?",
  },
  psychology: {
    title: "Es, Ich, Über-Ich:\nhow translation reshaped the mind",
    deck: "Return to Freud's ordinary German words and examine the distance created by later technical translations.",
    conceptDsl: `## Concept
Freud's {{Es|DE}} means “it,” {{Ich|DE}} means “I,” and {{Über-Ich|DE}} is the “over-I.” Their everyday quality matters to the theory.

[[FR: Ça, moi et surmoi || ça : id : pronom démonstratif nominalisé ;; moi : ego : pronom tonique ;; surmoi : superego : nom masculin; sur + moi]]
[[DE: Es, Ich und Über-Ich || Es : id : substantiviertes Pronomen, neuter ;; Ich : ego : substantiviertes Pronomen, neuter ;; Über-Ich : superego : compound noun]]
[[IT: Es, Io e Super-io || Es : id : pronome tedesco sostantivato ;; Io : ego : pronome personale sostantivato ;; Super-io : superego : nome composto; super + io]]

## Nuance
Technical vocabulary helps a theory travel internationally, but it may also make intimate experience sound like a remote machine.`,
    caseDsl: `## Case: the unsent angry email
Impulse, realistic assessment and an internal demand for professionalism can be modeled as {{ça|FR}}, {{Ich|DE}} and {{Super-io|IT}}. These are not three little people; they are competing requirements within one decision.`,
    closeReadingDsl: `## Close reading
{{Wo Es war, soll Ich werden|DE}}.

Soll expresses a task rather than certainty; werden means “to become.” French {{Là où était le ça, le moi doit advenir|FR}} and Italian {{Dove era l'Es, deve subentrare l'Io|IT}} make different choices about agency.`,
    question: "Does technical language make experience clearer, or more distant?",
  },
  business: {
    title: "Cross-cultural negotiation:\nwhat lies behind a position",
    deck: "Separate positions from interests, then compare how six target languages handle courtesy and commitment in business.",
    conceptDsl: `## Concept
A position is an explicit demand; an interest is the need, risk or value that makes the demand necessary. Better negotiation translates refusal into discussable constraints.

[[FR: Position et enjeu || position : position : nom féminin ;; enjeu : stake or key concern : nom masculin; ce qui est en jeu]]
[[DE: Position und Interesse || Position : position : Femininum ;; Interesse : interest : Neutrum; commonly followed by an + Dativ]]
[[IT: Posizione e interesse || posizione : position : nome femminile ;; interesse : interest or concern : nome maschile; often used with per or di]]

## Application
Ask what risk, deadline, authority or relationship is hidden behind an apparently fixed answer.`,
    caseDsl: `## Case: headquarters moves a deadline
The team should test the {{marge de manœuvre|FR}}, ask whether the date is {{verbindlich|DE}}, and clarify which Italian commitment is truly {{vincolante|IT}}.`,
    closeReadingDsl: `## Close reading
Could we revisit the assumptions behind this timeline?

The modal softens the request; revisit reopens the agenda without accusing a person; behind this timeline moves conflict from people to assumptions.`,
    question: "What becomes visible only after both parties stop defending their stated positions?",
  },
  daily: {
    title: "From terroir to conto:\nthe cultural grammar of a meal",
    deck: "Learn to order, explain allergies and pay while understanding social distance across six target languages.",
    conceptDsl: `## Core situation
Politeness is not the same as sentence length. It means selecting a form of distance that fits the setting.

[[FR: Je voudrais réserver une table || voudrais : I would like : conditionnel présent; softer than je veux ;; réserver : to reserve : infinitif; direct object une table]]
[[DE: Die Rechnung, bitte || Rechnung : bill : Femininum; noun from rechnen ;; bitte : please : particle; concise without being rude]]
[[IT: Vorrei il conto, per favore || vorrei : I would like : condizionale presente; more courteous than voglio ;; conto : bill : nome maschile; standard restaurant usage]]

## Cultural note
French often uses the conditional, German permits compact clarity, and Italian combines conditional forms with relational warmth.`,
    caseDsl: `## Case: explaining an allergy
Use precise statements: {{Je suis allergique aux fruits à coque|FR}}, {{Ich bin gegen Nüsse allergisch|DE}}, and {{Sono allergico alle noci|IT}}. Do not replace a medical constraint with “I don't like it.”`,
    closeReadingDsl: `## Situational reading
{{Il servizio è incluso?|IT}}

È turns the statement into a question through intonation; servizio refers to the service charge; incluso is the past participle of includere and agrees with servizio.`,
    question: "Is language ability saying a correct sentence, or judging the right distance for this moment?",
  },
  art: {
    title: "Impressionism:\nwhen light becomes more real than objects",
    deck: "Begin with brushwork, local color and momentary vision, then compare art-historical vocabulary across six target languages.",
    conceptDsl: `## Concept
Impressionism is not simply “blurry painting.” It turns changing light, open brushwork and color relationships into a disciplined method of seeing.

[[FR: Impression, soleil levant || impression : impression : nom féminin; from Latin imprimere ;; soleil levant : rising sun : participe présent after the noun]]
[[DE: der flüchtige Augenblick || flüchtig : fleeting : adjective; also suggests escape ;; Augenblick : moment : compound of Auge + Blick]]
[[IT: luce e impressione || luce : light : nome femminile; from Latin lux ;; impressione : impression : nome femminile; a trace left in perception]]

## Method of looking
Ask where the brightest color sits, where edges disappear, and how warm and cool colors construct space without traditional shading.`,
    caseDsl: `## Case: why paint the same pond twenty times?
{{série|FR}}, {{Werkreihe|DE}} and {{serie pittorica|IT}} frame repeated paintings as a research process. What changes is not merely the subject, but the relation among time, weather and the observer's body.`,
    closeReadingDsl: `## Image reading
In Water Lilies, there is no stable horizon. The water is both depth and skin: {{surface|FR}}, {{Oberfläche|DE}}, {{superficie|IT}}. Each word directs attention differently.`,
    question: "When boundaries change with the light, do we see the world—or the act of seeing?",
  },
  philosophy: {
    title: "Aufhebung:\ncancel, preserve and raise in one word",
    deck: "Study one of Hegel's most difficult terms by comparing its afterlives across six target languages.",
    conceptDsl: `## Concept
{{Aufhebung|DE}} can mean cancellation, preservation and elevation. The tension among all three senses is the philosophical work of the term.

[[FR: la relève dialectique || relève : relay, relief or elevation : nom féminin; from relever ;; dialectique : dialectical : adjectif or nom féminin]]
[[DE: Aufhebung des Widerspruchs || Aufhebung : sublation : Femininum; from aufheben ;; Widerspruch : contradiction : Maskulinum; wider + Spruch]]
[[IT: superamento dialettico || superamento : overcoming or sublation : nome maschile; from superare ;; dialettico : dialectical : aggettivo; must retain both negation and preservation]]

## Intellectual movement
Dialectic is not compromise. A new stage changes the structure in which the opposed terms can appear.`,
    caseDsl: `## Thought experiment: rules and freedom
A musician first experiences rules as limits, then gains improvisational freedom through mastery. The rules are not simply discarded; they are {{relevées|FR}}, {{aufgehoben|DE}} or {{superate e conservate|IT}} in a richer practice.`,
    closeReadingDsl: `## Close reading
{{Das Wahre ist das Ganze|DE}}.

Das Wahre and das Ganze are nominalized adjectives. The sentence does not dismiss details; it says a judgment gains meaning from its place in an unfolding whole.`,
    question: "When an idea is overcome, what deserves to be preserved—and who decides?",
  },
  science: {
    title: "An algorithm is not only code:\nit is an executable explanation",
    deck: "Use etymology, finite steps and complexity to understand how algorithms organize technical and institutional decisions.",
    conceptDsl: `## Concept
An algorithm is a finite, unambiguous and executable procedure that transforms inputs into outputs. Its precision depends on how its objective is defined.

[[FR: complexité algorithmique || complexité : complexity : nom féminin ;; algorithmique : algorithmic : adjectif; also a noun for the field]]
[[DE: Laufzeit und Speicherbedarf || Laufzeit : runtime : Femininum; laufen + Zeit ;; Speicherbedarf : memory requirement : Maskulinum; compound noun]]
[[IT: complessità e algoritmo || complessità : complexity : nome femminile; final stress ;; algoritmo : algorithm : nome maschile; from the Latinized name al-Khwārizmī]]

## Modern application
When an algorithm handles credit, hiring or recommendations, definitions of input, objective and error become institutional choices.`,
    caseDsl: `## Case: which route is optimal?
A route planner must define a cost function first. Compare {{fonction de coût|FR}}, {{Kostenfunktion|DE}} and {{funzione di costo|IT}}. “Optimal” has no meaning until the objective is explicit.`,
    closeReadingDsl: `## Code reading
If the condition holds, repeat the procedure.

French says {{si la condition est satisfaite|FR}}, German {{wenn die Bedingung erfüllt ist|DE}}, and Italian {{se la condizione è soddisfatta|IT}}. Each uses a state construction to express that a formal condition is met.`,
    question: "If people define the objective function, in what sense can a machine be neutral?",
  },
};

export const TERM_REPORTS: Record<string, TermReport> = {
  tragedy: { definition: "以重大而完整的行动为核心，通过结构化冲突唤起怜悯与恐惧的戏剧形式。", etymology: "来自 Greek tragōidia，传统解释为 tragos（山羊）与 ōidē（歌）的组合。", grammar: "English countable noun；复数 tragedies。法语 tragédie 为阴性名词；德语 Tragödie 为阴性名词。", nuance: "日常语境可泛指灾难；学术语境则强调形式、行动结构与观看效果。", example: "Tragedy transforms suffering into an intelligible form.", translation: "悲剧把痛苦转化为一种可理解的形式。" },
  schuld: { definition: "德语中兼指债务、责任、过错或罪责的核心观念词。", etymology: "源自古高地德语 sculd，包含“应当履行之物”与“应受责备”两条语义线。", grammar: "Femininum：die Schuld；经济债务常用复数 die Schulden。", nuance: "单数 Schuld 更容易激活伦理责任；复数 Schulden 更稳定地进入金融语境。", example: "Schulden sind nicht immer persönliche Schuld.", translation: "债务并不总是个人的罪责。" },
  es: { definition: "弗洛伊德结构模型中非人格化的冲动、欲望与初级过程所在。", etymology: "普通德语中性代词“它”；弗洛伊德采纳 Georg Groddeck 的用法并加以理论化。", grammar: "作为术语时名词化：das Es，中性，不变格词形通过冠词体现。", nuance: "比拉丁化英语 Id 更日常，也更能传达主体被某个‘它’驱动的陌生感。", example: "Wo Es war, soll Ich werden.", translation: "本我所在之处，自我应当生成。" },
  interest: { definition: "谈判中驱动公开立场的实际需要、风险、关切或价值。", etymology: "来自 Latin interesse，字面为“处在其间、关系到”。", grammar: "可数或不可数名词；商业语境常用复数 interests 表示多方利益。", nuance: "不只表示经济利益，也可表示身份、安全感、时间与关系。", example: "Ask which interests make this position necessary.", translation: "追问是什么利益使这一立场成为必要。" },
  terroir: { definition: "塑造农产品特征的土地、气候、物种、技艺与地方文化综合体。", etymology: "来自法语 terre（土地），但现代语义远超土壤本身。", grammar: "Nom masculin：le terroir；复数 les terroirs。", nuance: "英语常直接借用，正因为 local origin 难以容纳其制度与身份含义。", example: "Ce vin exprime un terroir plutôt qu’un simple lieu.", translation: "这款酒表达的是一种风土，而不只是一个地点。" },
  impressionism: { definition: "以瞬间视觉、开放笔触与色彩关系探索现代观看的艺术运动。", etymology: "由 Monet 的 Impression, soleil levant 及批评家 Louis Leroy 的讽刺命名而来。", grammar: "English mass noun；French impressionnisme, nom masculin；German Impressionismus, Maskulinum。", nuance: "“印象”不等于随意，它依赖持续观察、色彩理论与户外绘画条件。", example: "Impressionism treats light as an event, not an accessory.", translation: "印象派把光当作事件，而不是附属效果。" },
  aufhebung: { definition: "黑格尔辩证法中同时包含取消、保存与提升的思想运动。", etymology: "来自德语动词 aufheben：拿起、保存、取消。多义性正是术语功能的一部分。", grammar: "Femininum：die Aufhebung；复数 Aufhebungen；动词可分：hebt ... auf。", nuance: "英语 sublation 精确但较技术化；中文“扬弃”突出提升与舍弃，保存义需要额外说明。", example: "Die Aufhebung bewahrt, was sie überwindet.", translation: "扬弃保存它所克服之物。" },
  algorithm: { definition: "在有限步骤内把一类输入可靠转换为输出的明确过程。", etymology: "源自数学家 al-Khwārizmī 姓名的中世纪拉丁转写 algorismi。", grammar: "Countable noun；French algorithme 为阳性；German Algorithmus 为阳性，复数 Algorithmen。", nuance: "日常用法常把平台的复杂决策系统统称为“算法”；严格意义需说明输入、步骤、终止与输出。", example: "An algorithm is precise only after its objective is specified.", translation: "只有在目标被说明后，算法的精确才有意义。" },
};
