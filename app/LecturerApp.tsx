"use client";

import {
  FormEvent,
  Fragment,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CURRICULUM,
  LESSONS,
  SUBJECTS,
  TERM_REPORTS,
  type LanguageCode,
  type TermReport,
  type VisualReference,
} from "../lib/academy-data";
import {
  getAudioCapability,
  playSpeech,
  stopSpeech,
  voiceProfileForLanguage,
  type AudioCapability,
  type PlaybackInfo,
} from "../lib/audio-engine";
import { parseLectureDsl, type InlineToken } from "../lib/dsl";
import type { SubjectId, TeachingMode } from "../lib/prompts";

type Source = { title: string; url: string };
type ActiveTerm = { value: string; language: LanguageCode };
type Note = {
  id: string;
  title: string;
  body: string;
  subject: SubjectId;
  updatedAt: number;
};

const QUICK_ACTIONS: Array<{
  id: Exclude<TeachingMode, "question">;
  label: string;
  en: string;
  glyph: string;
}> = [
  { id: "concept", label: "概念定义", en: "CONCEPT", glyph: "◐" },
  { id: "case", label: "案例分析", en: "CASE", glyph: "◇" },
  { id: "close-reading", label: "学术精读", en: "CLOSE READ", glyph: "¶" },
];

const LANGUAGE_META: Record<Exclude<LanguageCode, "CN">, {
  flag: string;
  name: string;
  color: string;
}> = {
  EN: { flag: "🇺🇸", name: "English", color: "#4773a8" },
  FR: { flag: "🇫🇷", name: "Français", color: "#585b9b" },
  DE: { flag: "🇩🇪", name: "Deutsch", color: "#a77728" },
};

const DEFAULT_NOTE: Note = {
  id: "welcome",
  title: "第一则学院笔记",
  body: "CLIL 不是把同一段话翻译三遍，而是让不同语言帮助我看见概念的边界。\n\n今天想继续追问：",
  subject: "literature",
  updatedAt: Date.now(),
};

function genericReport(term: ActiveTerm, subjectName: string): TermReport {
  return {
    definition: `“${term.value}”是「${subjectName}」课程中的关键概念。当前展示内置摘要；连接术语接口后可生成更细致的学术定义与理论背景。`,
    etymology: "该词的完整词源报告尚未写入本地词库。实时术语接口会追溯希腊语、拉丁语或日耳曼语词根，并区分可靠词源与民间附会。",
    grammar: `${term.language} 术语。实时报告可补充词性、阴阳性、变位、格位、固定搭配与常见句法位置。`,
    nuance: "应把日常用法与当前学科中的技术含义分开，并通过近义词比较划定语义边界。",
    example: `${term.value} becomes precise only when its context is made explicit.`,
    translation: `只有在语境被明确以后，“${term.value}”的含义才真正精确。`,
  };
}

function termReportFor(term: ActiveTerm, subjectName: string) {
  const normalized = term.value.toLowerCase().replace(/[.,!?]/g, "");
  return TERM_REPORTS[normalized] || genericReport(term, subjectName);
}

function ensureTrilingualCards(primary: string, fallback: string) {
  const missing = (["EN", "FR", "DE"] as const)
    .filter((language) => !primary.includes(`[[${language}:`))
    .map((language) => fallback
      .split("\n")
      .find((line) => line.trim().startsWith(`[[${language}:`)))
    .filter((line): line is string => Boolean(line));

  return missing.length
    ? `${primary}\n\n## 核心术语回顾\n${missing.join("\n")}`
    : primary;
}

function ModalShell({
  children,
  label,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal-shell ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </section>
    </div>
  );
}

export default function LecturerApp() {
  const [subjectId, setSubjectId] = useState<SubjectId>("literature");
  const [mode, setMode] = useState<TeachingMode>("concept");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedDsl, setGeneratedDsl] = useState<string | null>(null);
  const [liveSources, setLiveSources] = useState<Source[]>([]);
  const [liveVisuals, setLiveVisuals] = useState<VisualReference[]>([]);
  const [focusTopic, setFocusTopic] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioCapability, setAudioCapability] = useState<AudioCapability>({
    mode: "device",
    cloudReady: false,
    label: "设备增强声线",
  });
  const [lastPlayback, setLastPlayback] = useState<PlaybackInfo | null>(null);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [curriculumLevel, setCurriculumLevel] = useState(0);
  const [activeTerm, setActiveTerm] = useState<ActiveTerm | null>(null);
  const [termReport, setTermReport] = useState<TermReport | null>(null);
  const [termLoading, setTermLoading] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([DEFAULT_NOTE]);
  const [activeNoteId, setActiveNoteId] = useState(DEFAULT_NOTE.id);
  const [noteSearch, setNoteSearch] = useState("");
  const [notesHydrated, setNotesHydrated] = useState(false);

  const subject = SUBJECTS.find((item) => item.id === subjectId) || SUBJECTS[0];
  const lesson = LESSONS[subjectId];
  const currentCurriculum = CURRICULUM[subjectId];
  const activeNote = notes.find((note) => note.id === activeNoteId) || notes[0];

  const modeDsl = mode === "case"
    ? lesson.caseDsl
    : mode === "close-reading"
      ? lesson.closeReadingDsl
      : lesson.conceptDsl;
  const localDsl = ensureTrilingualCards(modeDsl, lesson.conceptDsl);
  const visibleDsl = generatedDsl || localDsl;
  const blocks = useMemo(() => parseLectureDsl(visibleDsl), [visibleDsl]);
  const visuals = liveVisuals.length ? liveVisuals : lesson.visuals;

  const filteredNotes = useMemo(
    () => notes
      .filter((note) => `${note.title}\n${note.body}`.toLowerCase().includes(noteSearch.toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt),
    [noteSearch, notes],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const raw = window.localStorage.getItem("omnimedia-academy-notes-v1");
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Note[];
          if (saved.length) {
            setNotes(saved);
            setActiveNoteId(saved[0].id);
          }
        } catch {
          // Keep the safe local seed if storage is malformed.
        }
      }
      setNotesHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!notesHydrated) return;
    window.localStorage.setItem("omnimedia-academy-notes-v1", JSON.stringify(notes));
  }, [notes, notesHydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    void getAudioCapability().then((capability) => {
      if (active) setAudioCapability(capability);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCurriculumOpen(false);
      setNotebookOpen(false);
      setActiveTerm(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => () => stopSpeech(), []);

  function selectSubject(next: SubjectId) {
    stopSpeech();
    setPlayingKey(null);
    setSubjectId(next);
    setMode("concept");
    setGeneratedDsl(null);
    setLiveSources([]);
    setLiveVisuals([]);
    setFocusTopic(null);
    setCurriculumLevel(0);
  }

  async function requestLesson(nextMode: TeachingMode, requestedTopic?: string) {
    setMode(nextMode);
    setLoading(true);
    setGeneratedDsl(null);
    setLiveSources([]);
    setLiveVisuals([]);
    setFocusTopic(nextMode === "concept" && requestedTopic ? requestedTopic : null);

    try {
      const response = await fetch("/api/lecture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectId, mode: nextMode, query: requestedTopic }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as {
        text: string;
        sources?: Source[];
        visuals?: VisualReference[];
      };
      setGeneratedDsl(data.text);
      setLiveSources(data.sources || []);
      setLiveVisuals(data.visuals || []);
      setToast("已完成检索核验与 CLIL 术语编排");
    } catch {
      setToast("当前使用学院内置课程 · 未连接外部讲师服务");
    } finally {
      setLoading(false);
    }
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setQuery("");
    void requestLesson("question", value);
  }

  async function speak(text: string, language: LanguageCode) {
    const key = `${language}:${text}`;
    setPlayingKey((current) => current === key ? null : key);
    try {
      const result = await playSpeech({
        text,
        language,
        onEnd: () => setPlayingKey((current) => current === key ? null : current),
      });
      if (result.engine === "stopped") {
        setPlayingKey(null);
        return;
      }
      setLastPlayback(result);
      setToast(result.engine === "neural"
        ? `${result.label} · ${result.voice} · ${result.sampleRate || 24_000} Hz`
        : `${result.label} · 当前实际声线：${result.voice}`);
    } catch {
      setPlayingKey(null);
      setToast("当前设备暂不支持语音播放");
    }
  }

  async function inspectTerm(term: ActiveTerm) {
    setActiveTerm(term);
    setTermReport(termReportFor(term, subject.name));
    setTermLoading(true);
    try {
      const response = await fetch("/api/term", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.value, language: term.language, subject: subjectId }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setTermReport(await response.json() as TermReport);
    } catch {
      // The built-in report remains immediately useful offline.
    } finally {
      setTermLoading(false);
    }
  }

  function renderInline(tokens: InlineToken[]) {
    return tokens.map((token, index) => {
      if (token.type === "text") return <Fragment key={index}>{token.value}</Fragment>;
      const key = `${token.language}:${token.value}`;
      return (
        <span className={`term-pill lang-${token.language.toLowerCase()}`} key={`${key}-${index}`}>
          <button type="button" onClick={() => void inspectTerm(token)}>{token.value}<small>{token.language}</small></button>
          <button
            type="button"
            className={playingKey === key ? "playing" : ""}
            aria-label={`朗读 ${token.value}`}
            onClick={() => void speak(token.value, token.language)}
          >{playingKey === key ? "Ⅱ" : "♪"}</button>
        </span>
      );
    });
  }

  function chooseTopic(topic: string) {
    setCurriculumOpen(false);
    void requestLesson("concept", topic);
  }

  function createNote() {
    const note: Note = {
      id: `${Date.now()}`,
      title: "未命名笔记",
      body: "",
      subject: subjectId,
      updatedAt: Date.now(),
    };
    setNotes((current) => [note, ...current]);
    setActiveNoteId(note.id);
  }

  function updateActiveNote(patch: Partial<Pick<Note, "title" | "body">>) {
    setNotes((current) => current.map((note) => note.id === activeNoteId
      ? { ...note, ...patch, updatedAt: Date.now(), subject: subjectId }
      : note));
  }

  function deleteActiveNote() {
    if (!activeNote) return;
    const remaining = notes.filter((note) => note.id !== activeNote.id);
    const next = remaining.length ? remaining : [{ ...DEFAULT_NOTE, id: `${Date.now()}`, updatedAt: Date.now() }];
    setNotes(next);
    setActiveNoteId(next[0].id);
  }

  return (
    <main className="academy-app" style={{ "--accent": subject.accent } as React.CSSProperties}>
      <aside className="academy-sidebar" aria-label="八大学科学术战役">
        <div className="academy-brand">
          <span className="academy-mark">OL</span>
          <span><strong>全媒体领域学院</strong><small>OMNIMEDIA LECTURER</small></span>
        </div>

        <p className="campaign-label">ACADEMIC CAMPAIGNS <span>08</span></p>
        <nav className="campaign-list">
          {SUBJECTS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === subjectId ? "active" : ""}
              onClick={() => selectSubject(item.id)}
              aria-current={item.id === subjectId ? "page" : undefined}
            >
              <span className="campaign-code">{item.campaign}</span>
              <span className="campaign-icon">{item.symbol}</span>
              <span className="campaign-name"><strong>{item.name}</strong><small>{item.track}</small></span>
              <i />
            </button>
          ))}
        </nav>

        <section className="clil-card">
          <span className="clil-orbit"><i /><i /><i /></span>
          <div><small>LEARNING METHOD</small><strong>CLIL · 内容与语言整合</strong><p>知识为体，语言为用</p></div>
        </section>
        <button className="notebook-launch" type="button" onClick={() => setNotebookOpen(true)}>
          <span>▤</span><span><strong>多语备忘录</strong><small>{notes.length} NOTES · LOCAL</small></span><i>↗</i>
        </button>
      </aside>

      <section className="academy-desk">
        <header className="academy-topbar">
          <div className="mobile-academy-brand"><span>OL</span><strong>领域学院</strong></div>
          <div className="course-path"><small>{subject.campaign}</small><span>{subject.name}</span><i>/</i><strong>{focusTopic || lesson.index.split(" · ").slice(-1)[0]}</strong></div>
          <div className="quick-actions" aria-label="快捷学术指令">
            {QUICK_ACTIONS.map((action) => (
              <button
                type="button"
                key={action.id}
                className={mode === action.id ? "active" : ""}
                onClick={() => void requestLesson(action.id)}
                disabled={loading}
              >
                <span>{action.glyph}</span><b>{action.label}</b><small>{action.en}</small>
              </button>
            ))}
          </div>
          <div className="topbar-tools">
            <button type="button" onClick={() => setCurriculumOpen(true)}><span>⌘</span>课程大纲</button>
            <button type="button" className="round-tool" onClick={() => setNotebookOpen(true)} aria-label="打开备忘录">▤</button>
          </div>
        </header>

        <div className="academy-scroll">
          <div className="academy-stage">
            <article className="lecture-paper" aria-busy={loading}>
              <div className="paper-spine" />
              <header className="lecture-hero">
                <div className="lecture-index"><span>{subject.symbol}</span>{focusTopic ? `${subject.campaign} · CURRICULUM FOCUS` : lesson.index}</div>
                <h1>{(focusTopic || lesson.title).split("\n").map((line, index) => <Fragment key={`${line}-${index}`}>{index > 0 && <br />}{line}</Fragment>)}</h1>
                <p>{focusTopic ? `从课程树进入“${focusTopic}”，以下内置讲义展示该学科的 CLIL 分析协议；连接讲师服务后会生成针对该小节的完整内容。` : lesson.deck}</p>
              </header>

              {!focusTopic && (
                <blockquote className="academy-quote">
                  <p>{lesson.quote}</p><cite>{lesson.quoteSource}</cite>
                </blockquote>
              )}

              <div className="dsl-content">
                {blocks.map((block, index) => {
                  if (block.type === "heading") return <h2 key={index}><span>{String(index + 1).padStart(2, "0")}</span>{block.value}</h2>;
                  if (block.type === "paragraph") return <p key={index}>{renderInline(block.tokens)}</p>;
                  const meta = LANGUAGE_META[block.language];
                  const sentenceKey = `${block.language}:${block.sentence}`;
                  return (
                    <section className={`language-card card-${block.language.toLowerCase()}`} key={index} style={{ "--lang-color": meta.color } as React.CSSProperties}>
                      <header>
                        <span className="language-flag">{meta.flag}</span>
                        <span><small>{block.language}</small><strong>{meta.name}</strong></span>
                        <button type="button" onClick={() => void speak(block.sentence, block.language)} className={playingKey === sentenceKey ? "playing" : ""}>
                          {playingKey === sentenceKey ? "Ⅱ" : "▶"}<span>整句朗读</span>
                        </button>
                      </header>
                      <p className="language-sentence">{block.sentence}</p>
                      <div className="word-breakdown">
                        {block.entries.map((entry) => {
                          const wordKey = `${block.language}:${entry.term}`;
                          return (
                            <div key={entry.term}>
                              <button className="word-main" type="button" onClick={() => void inspectTerm({ value: entry.term, language: block.language })}>
                                <strong>{entry.term}</strong><span>{entry.meaning}</span>
                              </button>
                              <p>{entry.grammar}</p>
                              <button type="button" className={playingKey === wordKey ? "playing" : ""} onClick={() => void speak(entry.term, block.language)} aria-label={`朗读 ${entry.term}`}>♪</button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              <section className="carry-question">
                <span>✳</span><div><small>QUESTION TO CARRY · 今日留题</small><p>{lesson.question}</p></div>
              </section>

              <section className="visual-gallery">
                <header><div><small>VISUAL GROUNDING</small><h2>视觉参考画廊</h2></div><span>{liveVisuals.length ? "LIVE SOURCES" : "CURATED · PUBLIC DOMAIN"}</span></header>
                <div>
                  {visuals.map((visual) => (
                    <a href={visual.sourceUrl} target="_blank" rel="noreferrer" key={visual.sourceUrl}>
                      <span className="visual-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={visual.src} alt={visual.title} />
                      </span>
                      <span className="visual-copy"><strong>{visual.title}</strong><small>{visual.caption}</small><i>{visual.sourceLabel} ↗</i></span>
                    </a>
                  ))}
                </div>
              </section>

              {loading && <div className="academy-loading"><span /><p>正在组织概念、语言与来源…</p></div>}
            </article>

            <aside className="learning-rail">
              <section className="progress-card">
                <header><span>战役进度</span><small>{subject.campaign} · 38%</small></header>
                <div className="progress-track"><i /></div>
                <p><strong>{subject.name}</strong><small>{subject.track}</small></p>
                <button type="button" onClick={() => setCurriculumOpen(true)}>查看三级课程树 <span>→</span></button>
              </section>

              <section className="voice-strategy">
                <header><span>真实多语声线</span><small>{audioCapability.cloudReady ? "NEURAL TTS" : "DEVICE TTS"}</small></header>
                {(["CN", "EN", "FR", "DE"] as LanguageCode[]).map((language) => {
                  const profile = voiceProfileForLanguage(language);
                  const sample = language === "CN" ? "知识为体，语言为用。" : language === "EN" ? "Knowledge gives language its purpose." : language === "FR" ? "La langue éclaire le savoir." : "Sprache macht Wissen beweglich.";
                  const sampleKey = `${language}:${sample}`;
                  return (
                    <button type="button" className={playingKey === sampleKey ? "playing" : ""} key={language} onClick={() => void speak(sample, language)}>
                      <span>{language}</span>
                      <span className="voice-copy"><strong>{profile.role}</strong><small>{audioCapability.cloudReady ? profile.cloudVoice : "自动选择设备最佳声线"}</small></span>
                      <i className="mini-wave"><b /><b /><b /></i>
                    </button>
                  );
                })}
                <p className={audioCapability.cloudReady ? "cloud-ready" : "device-only"}><i />{lastPlayback ? `${lastPlayback.label} · ${lastPlayback.voice}` : audioCapability.cloudReady ? `${audioCapability.label} · 24 kHz PCM` : "分句朗读 · 跨语切换 · 真实声线检测"}</p>
                {audioCapability.mode === "openai" && <p className="voice-disclosure">AI 生成语音 · 非真人录音</p>}
              </section>

              <section className="protocol-card">
                <header><span>教学协议</span><small>CLIL DSL · V1</small></header>
                <dl>
                  <div><dt>{"{{…|LANG}}"}</dt><dd>可发音行内术语</dd></div>
                  <div><dt>{"[[LANG: …]]"}</dt><dd>三语拆解卡片</dd></div>
                  <div><dt>CN → EN/FR/DE</dt><dd>母语理解，跨语校准</dd></div>
                </dl>
              </section>

              <section className="source-panel">
                <header><span>学术依据</span><small>{liveSources.length ? "GROUNDED" : "CURATED"}</small></header>
                {(liveSources.length ? liveSources : visuals.map((visual) => ({ title: visual.title, url: visual.sourceUrl }))).slice(0, 4).map((source, index) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span>0{index + 1}</span><strong>{source.title}</strong><i>↗</i></a>
                ))}
                <p><i />{liveSources.length ? "检索来源已连接" : "内置公共领域资料"}</p>
              </section>
            </aside>
          </div>
        </div>

        <form className="academy-ask" onSubmit={submitQuestion}>
          <span className="ask-mark">✦</span>
          <div><label htmlFor="academy-question">向领域教授追问</label><input id="academy-question" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`关于${subject.name}，继续追问一个概念、原文或案例…`} autoComplete="off" /></div>
          <span className="ask-hints"><kbd>CLIL</kbd><kbd>EN</kbd><kbd>FR</kbd><kbd>DE</kbd></span>
          <button type="submit" disabled={!query.trim() || loading} aria-label="发送问题">↑</button>
        </form>
      </section>

      {curriculumOpen && (
        <ModalShell label="课程大纲" onClose={() => setCurriculumOpen(false)} wide>
          <header className="modal-header curriculum-header">
            <div><small>{subject.campaign} · ACADEMIC CAMPAIGN</small><h2>{subject.name}课程大纲</h2><p>{subject.track} · 三阶段进阶路径</p></div>
            <button type="button" onClick={() => setCurriculumOpen(false)} aria-label="关闭">×</button>
          </header>
          <div className="curriculum-body">
            <aside>
              {currentCurriculum.map((level, index) => (
                <button type="button" className={index === curriculumLevel ? "active" : ""} key={level.id} onClick={() => setCurriculumLevel(index)}>
                  <span>{level.id}</span><strong>{level.name}</strong><small>{level.en}</small><i>{index < currentCurriculum.length - 1 ? "↓" : "◆"}</i>
                </button>
              ))}
            </aside>
            <section className="curriculum-topics">
              <header><div><small>{currentCurriculum[curriculumLevel].id} · {currentCurriculum[curriculumLevel].en}</small><h3>{currentCurriculum[curriculumLevel].descriptor}</h3></div><span>点击小节开始授课</span></header>
              <div>
                {currentCurriculum[curriculumLevel].topics.map((topic, index) => (
                  <button type="button" key={topic} onClick={() => chooseTopic(topic)}>
                    <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{topic}</strong><small>概念讲解 · 三语术语 · 视觉资料</small></div><i>↗</i>
                  </button>
                ))}
              </div>
              <footer><span>CLIL</span><p>选择课程后，讲师将以中文建立概念，再用 EN / FR / DE 校准术语边界。</p></footer>
            </section>
          </div>
        </ModalShell>
      )}

      {activeTerm && termReport && (
        <ModalShell label={`${activeTerm.value} 语言学深度报告`} onClose={() => setActiveTerm(null)}>
          <header className="modal-header term-modal-header">
            <div><small>{activeTerm.language} · TERM INSPECTION</small><h2>{activeTerm.value}</h2><p>{subject.name}语境 · {voiceProfileForLanguage(activeTerm.language).role}</p></div>
            <button type="button" onClick={() => setActiveTerm(null)} aria-label="关闭">×</button>
          </header>
          <div className="term-report-grid">
            {([
              ["学术定义", "DEFINITION", termReport.definition, "CN"],
              ["词源与构词", "ETYMOLOGY", termReport.etymology, "CN"],
              ["语法属性", "GRAMMAR", termReport.grammar, "CN"],
              ["语义微析", "NUANCE", termReport.nuance, "CN"],
            ] as Array<[string, string, string, LanguageCode]>).map(([title, en, value, language]) => (
              <section key={en}><header><span>{title}<small>{en}</small></span><button type="button" onClick={() => void speak(value, language)}>♪</button></header><p>{value}</p></section>
            ))}
            <section className="term-example"><header><span>经典例句<small>ACADEMIC EXAMPLE</small></span><button type="button" onClick={() => void speak(termReport.example, activeTerm.language)}>▶</button></header><blockquote><p>{termReport.example}</p><cite>{termReport.translation}</cite></blockquote></section>
          </div>
          <footer className="term-modal-footer"><span className={termLoading ? "loading" : ""} /><p>{termLoading ? "正在尝试获取实时语言学报告…" : "内置报告可离线使用；外部术语接口为可选项。"}</p></footer>
        </ModalShell>
      )}

      {notebookOpen && (
        <ModalShell label="多语备忘录" onClose={() => setNotebookOpen(false)} wide>
          <header className="modal-header notebook-header">
            <div><small>LOCAL NOTEBOOK</small><h2>多语备忘录</h2><p>仅保存在当前设备 · 自动保存</p></div>
            <button type="button" onClick={() => setNotebookOpen(false)} aria-label="关闭">×</button>
          </header>
          <div className="notebook-body">
            <aside className="notes-list">
              <div className="notes-tools"><label><span>⌕</span><input value={noteSearch} onChange={(event) => setNoteSearch(event.target.value)} placeholder="搜索笔记" /></label><button type="button" onClick={createNote}>＋</button></div>
              <div className="notes-scroll">
                {filteredNotes.map((note) => (
                  <button type="button" className={note.id === activeNoteId ? "active" : ""} key={note.id} onClick={() => setActiveNoteId(note.id)}>
                    <strong>{note.title || "未命名笔记"}</strong><p>{note.body || "开始记录…"}</p><span>{SUBJECTS.find((item) => item.id === note.subject)?.name} · {new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span>
                  </button>
                ))}
              </div>
            </aside>
            <section className="note-editor">
              {activeNote && <>
                <header><span>{SUBJECTS.find((item) => item.id === activeNote.subject)?.campaign} · {SUBJECTS.find((item) => item.id === activeNote.subject)?.name}</span><button type="button" onClick={deleteActiveNote}>删除</button></header>
                <input value={activeNote.title} onChange={(event) => updateActiveNote({ title: event.target.value })} aria-label="笔记标题" />
                <textarea value={activeNote.body} onChange={(event) => updateActiveNote({ body: event.target.value })} aria-label="笔记正文" placeholder="记录概念、词源、例句与仍未解决的问题…" />
                <footer><span>CN · EN · FR · DE</span><small>{activeNote.body.length} 字符 · 已保存在本地</small></footer>
              </>}
            </section>
          </div>
        </ModalShell>
      )}

      {toast && <div className="academy-toast" role="status"><span />{toast}</div>}
    </main>
  );
}
