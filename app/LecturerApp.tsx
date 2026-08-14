"use client";

import {
  FormEvent,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SubjectId, TeachingMode } from "../lib/prompts";

type Source = { title: string; url: string };
type Term = { cn: string; en: string; fr: string; de: string; note: string };
type Section = { number: string; title: string; body: string };
type Subject = {
  id: SubjectId;
  symbol: string;
  name: string;
  nameEn: string;
  voice: string;
  voiceLabel: string;
  direction: string;
  accent: string;
};
type Lesson = {
  index: string;
  title: string;
  deck: string;
  quote: string;
  quoteSource: string;
  sections: Section[];
  term: Term;
  sources: Source[];
  prompt: string;
  questions: Array<{ label: string; question: string; answer: string }>;
  assignment: {
    task: string;
    format: string;
    criteria: string[];
    stretch: string;
  };
};

const SUBJECTS: Subject[] = [
  {
    id: "literature",
    symbol: "文",
    name: "比较文学",
    nameEn: "Literature",
    voice: "Fenrir",
    voiceLabel: "深沉叙事",
    direction: "以深沉、从容、富有文学叙事感的中文朗读",
    accent: "#9a5d47",
  },
  {
    id: "economics",
    symbol: "经",
    name: "全球经济",
    nameEn: "Economics",
    voice: "Kore",
    voiceLabel: "冷静稳健",
    direction: "以冷静、专业、稳健而不失亲和的中文朗读",
    accent: "#3f6f62",
  },
  {
    id: "science",
    symbol: "科",
    name: "自然哲学与科学",
    nameEn: "Science",
    voice: "Puck",
    voiceLabel: "清晰灵动",
    direction: "以清晰、灵动、富有探索感的中文朗读",
    accent: "#49708a",
  },
  {
    id: "art",
    symbol: "艺",
    name: "艺术史",
    nameEn: "Art History",
    voice: "Charon",
    voiceLabel: "磁性克制",
    direction: "以磁性、克制、富有材质感的中文朗读",
    accent: "#725e87",
  },
];

const LESSONS: Record<SubjectId, Lesson> = {
  literature: {
    index: "VOL. 08 · 欲望与行动",
    title: "浮士德式追问：\n在行动中成为自己",
    deck: "从一个无法被直译的德语词出发，理解现代人为何在欲望、知识与行动之间徘徊。",
    quote: "Im Anfang war die Tat.",
    quoteSource: "Goethe, Faust I · “太初有行动”",
    sections: [
      {
        number: "01",
        title: "概念：Streben 不只是“努力”",
        body: "在《浮士德》里，Streben 是一种不肯停止的追求。它既可译为“奋斗”，也带有向某物伸展的方向感。中文的“求索”多了一层诗性；英语 striving 强调持续用力；法语 aspiration 则更接近愿望与提升。",
      },
      {
        number: "02",
        title: "历史：从 Logos 到 Tat",
        body: "浮士德翻译《约翰福音》时，把“太初有道”逐步改写为“太初有行动”。这不是简单的译词替换，而是把世界的起点从语言和理性，移向实践与创造。",
      },
      {
        number: "03",
        title: "当代：为何“不停地做”仍然值得怀疑",
        body: "今天的效率文化会轻易把 Tat 误读为无休止的产出。但歌德的问题更难：行动能否被反思修正？一个人的追求，是否也为他人留下了世界？",
      },
    ],
    term: {
      cn: "求索 / 奋斗",
      en: "Striving",
      fr: "Aspiration",
      de: "Streben",
      note: "德语词根 streb- 含有“用力朝向”的动态感，比中文“理想”更强调过程。",
    },
    sources: [
      { title: "Goethe · Faust (Project Gutenberg)", url: "https://www.gutenberg.org/ebooks/14591" },
      { title: "Goethe · Encyclopaedia Britannica", url: "https://www.britannica.com/biography/Johann-Wolfgang-von-Goethe" },
    ],
    prompt: "当一切行动都可以被量化时，我们还能如何区分“忙碌”与“求索”？",
    questions: [
      { label: "选择题", question: "Streben 在《浮士德》中最接近哪一种语感？\nA. 完成后的满足\nB. 持续朝向某物的追求\nC. 被动服从\nD. 短暂兴奋", answer: "B。关键在过程性与方向感。" },
      { label: "译读题", question: "为什么把 Tat 译成“行动”，比译成“事情”更接近这一段的思想张力？", answer: "“行动”保留了主体的实践性，“事情”则容易只指结果或事件。" },
      { label: "思考题", question: "浮士德的“不满足”是人的尊严，还是现代性的病症？", answer: "两种读法都成立；好回答需以文本细节划定各自的边界。" },
    ],
    assignment: {
      task: "从你的日常生活中选择一个反复发生的行动，用“求索”与“忙碌”两个框架各解释一次。",
      format: "600–800 字微型随笔，至少精读《浮士德》中的一句话。",
      criteria: ["概念界定清楚", "文本证据具体", "能呈现而非抑平矛盾"],
      stretch: "比较 striving、aspiration 和 Streben，说明你最终为何选用某个译词。",
    },
  },
  economics: {
    index: "VOL. 12 · 价格与预期",
    title: "通胀不是\n一张涨价清单",
    deck: "从价格水平、货币感受与集体预期出发，重新理解一个最熟悉也最容易被误解的经济词。",
    quote: "Inflation is always and everywhere a monetary phenomenon.",
    quoteSource: "Milton Friedman · 一种重要而非唯一的解释框架",
    sections: [
      { number: "01", title: "概念：总体价格水平的持续上升", body: "某一种商品涨价不等于通胀。经济学关心的是一篮子商品与服务的总体价格变化，以及这种变化是否持续、是否广泛。" },
      { number: "02", title: "历史：从货币数量到供应冲击", body: "货币主义强调货币与总需求，凯恩斯主义重视产出缺口，当代分析还需同时观察供应链、能源价格、工资与预期。" },
      { number: "03", title: "当代：数据与体感为何不同", body: "统计权重描述平均家庭，真实人生却有不同的房租、能源和食品支出结构。因此，理解通胀需同时尊重统计和个体经验。" },
    ],
    term: { cn: "通货膨胀", en: "Inflation", fr: "Inflation", de: "Inflation / Teuerung", note: "Inflation 源自拉丁语 inflare，意为“吹胀”；德语 Teuerung 则更直接地让人感到“变贵”。" },
    sources: [
      { title: "IMF · Inflation explained", url: "https://www.imf.org/en/Publications/fandd/issues/Series/Back-to-Basics/Inflation" },
      { title: "ECB · What is inflation?", url: "https://www.ecb.europa.eu/ecb-and-you/explainers/tell-me-more/html/what_is_inflation.en.html" },
    ],
    prompt: "当官方通胀下降时，为什么人们仍可能觉得“东西越来越贵”？",
    questions: [
      { label: "选择题", question: "下列哪一项最接近通胀？\nA. 苹果单独涨价\nB. 广泛且持续的总体价格上升\nC. 股市上涨\nD. 某个品牌涨价", answer: "B。关键是广泛性、持续性与总体价格水平。" },
      { label: "语感题", question: "德语 Teuerung 与 Inflation 在日常理解上有何差别？", answer: "Teuerung 更直观地指向生活中的“变贵”，Inflation 则更像宏观分析术语。" },
      { label: "思考题", question: "如何在尊重个人物价体感的同时，不放弃总体统计？", answer: "好答案会区分分布与平均值，并说明家庭消费结构的异质性。" },
    ],
    assignment: { task: "设计一个属于你自己或某个具体家庭的“体感通胀篮子”。", format: "选 8–12 项月度支出，赋予权重，并写 400 字分析。", criteria: ["权重有理由", "区分价格与数量", "不把个体结果冒充总体指标"], stretch: "将结果与当地消费价格指数的分项权重比较。" },
  },
  science: {
    index: "VOL. 05 · 运动与解释",
    title: "从 physis 到 physics：\n惯性如何改变世界",
    deck: "一个看似安静的概念，如何帮助人类放弃“运动需要持续推动”的直觉。",
    quote: "Corpus omne perseverare in statu suo...",
    quoteSource: "Newton, Principia · 物体保持其状态的倾向",
    sections: [
      { number: "01", title: "概念：惯性不是“懒惰”", body: "惯性是物体保持静止或匀速直线运动状态的性质。它不是一种额外的力，而是对“运动状态为何改变”的基准说明。" },
      { number: "02", title: "历史：从自然位置到惯性运动", body: "亚里士多德物理学倾向把运动与持续作用联系起来；伽利略的理想化思想实验和牛顿的形式化，使匀速运动不再需要一个持续的“推动者”。" },
      { number: "03", title: "当代：科学如何用理想化对抗直觉", body: "日常世界里处处有摩擦，所以运动似乎总会停下。惯性定律的力量在于，它先构造一个去除干扰的理想情形，再让我们看见摩擦本身。" },
    ],
    term: { cn: "惯性", en: "Inertia", fr: "Inertie", de: "Trägheit", note: "源自拉丁语 iners（无技艺、不活动）；德语 Trägheit 仍保留了日常语言中“迟缓”的隐喻。" },
    sources: [
      { title: "Newton's Principia · Cambridge Digital Library", url: "https://cudl.lib.cam.ac.uk/view/PR-ADV-B-00039-00001/" },
      { title: "Newton's laws · Encyclopaedia Britannica", url: "https://www.britannica.com/science/Newtons-laws-of-motion" },
    ],
    prompt: "科学为什么必须暂时“忽略”摩擦，才能更准确地说明真实世界？",
    questions: [
      { label: "选择题", question: "惯性是什么？\nA. 使物体前进的力\nB. 物体保持运动状态的性质\nC. 摩擦力的反作用\nD. 只存在于静止物体", answer: "B。惯性不是力，也同时适用于静止和匀速直线运动。" },
      { label: "词源题", question: "Inertia 的拉丁词源为何会让人对物理概念产生误解？", answer: "它带有“不活动”的日常含义，但物理上也包括保持匀速运动。" },
      { label: "思考题", question: "理想化是对现实的背离，还是理解现实的必要步骤？", answer: "关键在于理想化是否公开其条件，并能把被忽略的因素重新纳入检验。" },
    ],
    assignment: { task: "用一个日常场景设计“去除摩擦”的思想实验，并标出它与现实的差异。", format: "一张图或 500–700 字说明，包含初始条件、变量和预测。", criteria: ["定义没有把惯性当作力", "理想化条件明确", "预测可被反驳"], stretch: "说明如何通过实验估计装置中未能消除的摩擦。" },
  },
  art: {
    index: "VOL. 09 · 光与观看",
    title: "明暗对照：\n光如何成为思想",
    deck: "从文艺复兴的造型到巴洛克的戏剧，学会辨认画面中的光不只照亮事物，也分配意义。",
    quote: "Painting is concerned with all the ten attributes of sight.",
    quoteSource: "Leonardo da Vinci · 绘画关乎观看的秩序",
    sections: [
      { number: "01", title: "概念：chiaroscuro 是造型方法", body: "Chiaroscuro 由意大利语 chiaro（明）与 scuro（暗）构成。它通过明度差让平面形象获得体积，也能将观者的注意力编排成一条视觉路径。" },
      { number: "02", title: "历史：从柔和过渡到戏剧性黑暗", body: "文艺复兴画家用明暗塑造解剖学上可信的身体；至卡拉瓦乔式的强光中，黑暗不再只是背景，而成为切断时间、推迟真相的叙事力量。" },
      { number: "03", title: "当代：从画布到银幕与界面", body: "黑色电影、摄影与数字界面仍在使用明暗层级组织视线。当我们问“最亮的地方是什么”，实际也在问“谁拥有被看见的权利”。" },
    ],
    term: { cn: "明暗对照法", en: "Chiaroscuro", fr: "Clair-obscur", de: "Hell-Dunkel", note: "四种语言都保留了“明/暗”二元结构；英语直接借入意大利词，保留了工坊技法的历史感。" },
    sources: [
      { title: "The Met · Chiaroscuro", url: "https://www.metmuseum.org/toah/hd/chio/hd_chio.htm" },
      { title: "National Gallery · Caravaggio", url: "https://www.nationalgallery.org.uk/artists/michelangelo-merisi-da-caravaggio" },
    ],
    prompt: "如果一幅画的黑暗部分比被照亮的主体更多，那些黑暗是“空白”吗？",
    questions: [
      { label: "选择题", question: "Chiaroscuro 最核心的功能是？\nA. 只把画面变暗\nB. 用明度差塑造体积并组织视线\nC. 使用更多颜料\nD. 消除轮廓", answer: "B。它既是造型技法，也可成为叙事结构。" },
      { label: "语言题", question: "英语为何没有完全意译 chiaroscuro？", answer: "借词保留了这一技法在意大利文艺复兴工坊中的历史来源。" },
      { label: "思考题", question: "光在卡拉瓦乔的画中是物理现象，还是伦理判断？", answer: "可以同时是两者；需通过光源位置、人物姿态与叙事时刻提供证据。" },
    ],
    assignment: { task: "选择一张画作、电影截帧或摄影作品，绘制一张只保留三级明度的结构草图。", format: "一张草图 + 500 字观察，注明作品来源。", criteria: ["观察先于评价", "能说明视线路径", "术语使用准确"], stretch: "设想把最亮与最暗区域互换后，作品的权力关系如何改变。" },
  },
};

const MODE_LABELS: Array<{ id: Exclude<TeachingMode, "question">; label: string; glyph: string }> = [
  { id: "lecture", label: "今日课程", glyph: "◐" },
  { id: "quiz", label: "随堂测验", glyph: "✓" },
  { id: "assignment", label: "布置作业", glyph: "↗" },
];

function GeneratedText({ text }: { text: string }) {
  return (
    <div className="generated-text">
      {text.split("\n").map((raw, index) => {
        const line = raw.trim();
        if (!line) return <span className="generated-space" key={index} />;
        if (line.startsWith("### ")) return <h3 key={index}>{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={index}>{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h2 key={index}>{line.slice(2)}</h2>;
        if (/^[-*] /.test(line)) return <div className="generated-list" key={index}>{line.slice(2)}</div>;
        return <p key={index}>{line.replaceAll("**", "")}</p>;
      })}
    </div>
  );
}

export default function LecturerApp() {
  const [subjectId, setSubjectId] = useState<SubjectId>("literature");
  const [mode, setMode] = useState<TeachingMode>("lecture");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [liveSources, setLiveSources] = useState<Source[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const subject = useMemo(
    () => SUBJECTS.find((item) => item.id === subjectId) || SUBJECTS[0],
    [subjectId],
  );
  const lesson = LESSONS[subjectId];
  const sources = generated && liveSources.length ? liveSources : lesson.sources;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3_200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
  }, []);

  function changeSubject(next: SubjectId) {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setSpeaking(false);
    setSubjectId(next);
    setMode("lecture");
    setGenerated(null);
    setLiveSources([]);
    setAnswersOpen(false);
  }

  async function requestLesson(nextMode: TeachingMode, customQuery?: string) {
    setMode(nextMode);
    setAnswersOpen(false);
    setLoading(true);
    setGenerated(null);
    setLiveSources([]);

    try {
      const response = await fetch("/api/lecture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectId, mode: nextMode, query: customQuery }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { text: string; sources?: Source[] };
      setGenerated(data.text);
      setLiveSources(data.sources || []);
      setToast("已结合 Google Search 更新讲义");
    } catch {
      if (nextMode === "question" && customQuery) {
        setGenerated(
          `## 问题已留在书桌上\n\n“${customQuery}”\n\n当前公开演示未连接实时讲师服务，因此我不会用伪造的知识回答。连接任意兼容的本地或托管服务后，同一个问题会使用「${subject.name}」上下文、四语术语与可验证来源生成讲解。`,
        );
      }
      setToast("当前为内置课程 · 可选连接任意讲师服务");
    } finally {
      setLoading(false);
    }
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery) return;
    void requestLesson("question", nextQuery);
    setQuery("");
  }

  function readableText() {
    if (generated) return generated.replaceAll(/[#*_>`]/g, " ");
    if (mode === "quiz") return lesson.questions.map((item) => `${item.label}。${item.question}`).join("。");
    if (mode === "assignment") return `${lesson.assignment.task}。${lesson.assignment.format}。${lesson.assignment.criteria.join("。")}。${lesson.assignment.stretch}`;
    return `${lesson.title}。${lesson.deck}。${lesson.sections.map((item) => `${item.title}。${item.body}`).join("。")}。今日留题：${lesson.prompt}`;
  }

  async function toggleSpeech() {
    if (speaking) {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: readableText(), voice: subject.voice, direction: subject.direction }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
      setToast(`${subject.voice} 原声朗读已开始`);
    } catch {
      if (!("speechSynthesis" in window)) {
        setSpeaking(false);
        setToast("当前浏览器不支持朗读");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(readableText());
      utterance.lang = "zh-CN";
      utterance.rate = 0.94;
      utterance.pitch = subjectId === "science" ? 1.05 : 0.96;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setToast("原声未配置 · 已使用设备语音");
    }
  }

  return (
    <main className="app" style={{ "--accent": subject.accent } as React.CSSProperties}>
      <aside className="sidebar" aria-label="学科导航">
        <div className="brand" aria-label="Omnimedia Lecturer">
          <span className="brand-mark">OL</span>
          <span className="brand-type"><strong>全媒体讲师</strong><small>OMNIMEDIA LECTURER</small></span>
        </div>

        <nav className="subject-nav">
          <p className="nav-label">学科书房 <span>04</span></p>
          {SUBJECTS.map((item) => (
            <button
              className={`subject-link ${item.id === subjectId ? "active" : ""}`}
              key={item.id}
              onClick={() => changeSubject(item.id)}
              type="button"
              aria-current={item.id === subjectId ? "page" : undefined}
            >
              <span className="subject-symbol">{item.symbol}</span>
              <span><strong>{item.name}</strong><small>{item.nameEn}</small></span>
              <i aria-hidden="true" />
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="note-orbit" aria-hidden="true"><i /><i /><i /></span>
          <div><strong>罗塞塔方法</strong><small>CN · EN · FR · DE</small></div>
        </div>
        <a className="open-source" href="https://github.com/" target="_blank" rel="noreferrer">
          <span aria-hidden="true">◇</span> 开源项目 <span aria-hidden="true">↗</span>
        </a>
      </aside>

      <section className="desk">
        <header className="topbar">
          <div className="mobile-brand"><span>OL</span><strong>全媒体讲师</strong></div>
          <div className="breadcrumb"><span>书房</span><i>/</i><strong>{subject.name}</strong></div>
          <div className="mode-switcher" aria-label="教学模式">
            {MODE_LABELS.map((item) => (
              <button
                key={item.id}
                className={mode === item.id ? "active" : ""}
                type="button"
                onClick={() => void requestLesson(item.id)}
                disabled={loading}
              >
                <span aria-hidden="true">{item.glyph}</span>{item.label}
              </button>
            ))}
          </div>
          <button className="session-button" type="button" onClick={() => setToast("当前为本地、无账号演示会话")} aria-label="会话状态">
            <span className="status-dot" />
            <span><strong>STUDY 08</strong><small>本地会话</small></span>
          </button>
        </header>

        <div className="desk-scroll">
          <div className="lesson-layout">
            <article className={`paper ${loading ? "loading" : ""}`} aria-busy={loading}>
              <div className="paper-rule" />
              <header className="lesson-head">
                <div className="eyebrow"><span>{subject.symbol}</span>{lesson.index}</div>
                {generated ? (
                  <GeneratedText text={generated} />
                ) : mode === "quiz" ? (
                  <>
                    <p className="section-kicker">QUICK REVIEW · 10 MIN</p>
                    <h1>随堂测验</h1>
                    <p className="lesson-deck">用三个问题，检验概念、语感与论证边界。</p>
                  </>
                ) : mode === "assignment" ? (
                  <>
                    <p className="section-kicker">DEEP PRACTICE · 30–45 MIN</p>
                    <h1>今日作业</h1>
                    <p className="lesson-deck">把今天的概念从书页带回你的经验。</p>
                  </>
                ) : (
                  <>
                    <h1>{lesson.title.split("\n").map((line, index) => <Fragment key={line}>{index > 0 && <br />}{line}</Fragment>)}</h1>
                    <p className="lesson-deck">{lesson.deck}</p>
                  </>
                )}
              </header>

              {!generated && mode === "lecture" && (
                <>
                  <blockquote><p>{lesson.quote}</p><cite>{lesson.quoteSource}</cite></blockquote>
                  <div className="lecture-sections">
                    {lesson.sections.map((section) => (
                      <section className="lecture-section" key={section.number}>
                        <span>{section.number}</span>
                        <div><h2>{section.title}</h2><p>{section.body}</p></div>
                      </section>
                    ))}
                  </div>
                  <section className="reflection">
                    <span aria-hidden="true">✳</span>
                    <div><small>今日留题 · QUESTION TO CARRY</small><p>{lesson.prompt}</p></div>
                  </section>
                </>
              )}

              {!generated && mode === "quiz" && (
                <div className="quiz-list">
                  {lesson.questions.map((item, index) => (
                    <section className="quiz-card" key={item.question}>
                      <div><span>0{index + 1}</span><small>{item.label}</small></div>
                      <p>{item.question}</p>
                      {answersOpen && <aside>{item.answer}</aside>}
                    </section>
                  ))}
                  <button className="answer-button" type="button" onClick={() => setAnswersOpen((value) => !value)}>
                    {answersOpen ? "收起答案" : "查看答案与解析"}<span aria-hidden="true">→</span>
                  </button>
                </div>
              )}

              {!generated && mode === "assignment" && (
                <div className="assignment-card">
                  <p className="assignment-task">{lesson.assignment.task}</p>
                  <dl>
                    <div><dt>产出规格</dt><dd>{lesson.assignment.format}</dd></div>
                    <div><dt>评价标准</dt><dd>{lesson.assignment.criteria.map((item, index) => <span key={item}>{index + 1}. {item}</span>)}</dd></div>
                    <div><dt>进阶挑战</dt><dd>{lesson.assignment.stretch}</dd></div>
                  </dl>
                </div>
              )}

              {loading && <div className="loading-veil"><span /><p>讲师正在检索、比较与组织语言…</p></div>}
            </article>

            <aside className="context-rail">
              <section className="voice-card">
                <div className="rail-title"><span>声线</span><small>VOICE</small></div>
                <button className={`play-button ${speaking ? "playing" : ""}`} type="button" onClick={() => void toggleSpeech()}>
                  <span className="play-icon" aria-hidden="true">{speaking ? "Ⅱ" : "▶"}</span>
                  <span><strong>{speaking ? "正在朗读" : "聆听本讲"}</strong><small>{subject.voice} · {subject.voiceLabel}</small></span>
                  <i className="wave" aria-hidden="true"><b /><b /><b /><b /><b /></i>
                </button>
              </section>

              <section className="term-card">
                <div className="rail-title"><span>罗塞塔词卡</span><small>ROSETTA NOTE</small></div>
                <div className="languages">
                  <p><small>CN</small><strong>{lesson.term.cn}</strong></p>
                  <p><small>EN</small><strong>{lesson.term.en}</strong></p>
                  <p><small>FR</small><strong>{lesson.term.fr}</strong></p>
                  <p><small>DE</small><strong>{lesson.term.de}</strong></p>
                </div>
                <p className="term-note"><span aria-hidden="true">⌘</span>{lesson.term.note}</p>
              </section>

              <section className="source-card">
                <div className="rail-title"><span>依据与延伸</span><small>{liveSources.length ? "GROUNDED" : "SOURCES"}</small></div>
                <div className="source-list">
                  {sources.map((source, index) => (
                    <a href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{source.title}</strong>
                      <i aria-hidden="true">↗</i>
                    </a>
                  ))}
                </div>
                <p className="grounding-status"><i />{liveSources.length ? "本讲已经 Google Search 核验" : "演示资料 · 官方来源直达"}</p>
              </section>

              <section className="studio-card" aria-label="数字书房氛围">
                <div className="studio-sun" />
                <div className="studio-window"><i /><i /></div>
                <div className="studio-desk"><span /><span /><span /></div>
                <p><strong>MAC STUDY</strong><small>安静不是空白，而是思考正在发生。</small></p>
              </section>
            </aside>
          </div>
        </div>

        <form className="ask-bar" onSubmit={submitQuestion}>
          <label htmlFor="question">继续追问</label>
          <div>
            <span aria-hidden="true">⌘K</span>
            <input id="question" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`向${subject.name}讲师提问…`} autoComplete="off" />
            <button type="submit" disabled={!query.trim() || loading} aria-label="发送问题">↑</button>
          </div>
          <small>四语对照 · 检索核验 · 语音可读</small>
        </form>
      </section>

      {toast && <div className="toast" role="status"><span />{toast}</div>}
    </main>
  );
}
