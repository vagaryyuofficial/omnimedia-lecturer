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
  ALL_LANGUAGE_CODES,
  CURRICULUM,
  LESSONS,
  LESSONS_EN,
  SUBJECTS,
  TARGET_CARD_SUPPLEMENTS,
  TARGET_LANGUAGE_CODES,
  TERM_REPORTS,
  type LanguageCode,
  type TermReport,
  type VisualReference,
} from "../lib/academy-data";
import {
  clearSessionSpeechConnection,
  getAudioCapability,
  getSessionSpeechState,
  playSpeech,
  setActiveSpeechProvider,
  setSessionSpeechConnection,
  speechProviderLabel,
  stopSpeech,
  voiceNameForConnection,
  voiceProfileForLanguage,
  type AudioCapability,
  type PlaybackInfo,
  type SpeechProviderId,
  type SpeechSessionState,
} from "../lib/audio-engine";
import { parseLectureDsl, type InlineToken } from "../lib/dsl";
import {
  clearOfflineVoicePacks,
  downloadOfflineVoicePack,
  getOfflineVoiceState,
  OFFLINE_VOICE_PACKS,
  offlineVoicePackFor,
  setOfflineVoiceEnabled,
  type OfflineVoiceState,
} from "../lib/offline-voice-engine";
import type { SubjectId, TeachingMode } from "../lib/prompts";

type Source = { title: string; url: string };
type UiLocale = "zh" | "en";
type TextSize = "standard" | "large" | "extra";
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
  { id: "concept", label: "概念定义", en: "Concept", glyph: "◐" },
  { id: "case", label: "案例分析", en: "Case study", glyph: "◇" },
  { id: "close-reading", label: "学术精读", en: "Close reading", glyph: "¶" },
];

const LANGUAGE_META: Record<Exclude<LanguageCode, "CN">, {
  flag: string;
  name: string;
  color: string;
}> = {
  EN: { flag: "🇺🇸", name: "English", color: "#4773a8" },
  FR: { flag: "🇫🇷", name: "Français", color: "#585b9b" },
  DE: { flag: "🇩🇪", name: "Deutsch", color: "#a77728" },
  IT: { flag: "🇮🇹", name: "Italiano", color: "#4f8066" },
  ES: { flag: "🇪🇸", name: "Español", color: "#b45d52" },
  KO: { flag: "🇰🇷", name: "한국어", color: "#4f6f9b" },
  JA: { flag: "🇯🇵", name: "日本語", color: "#9d4f59" },
};

const SPEECH_PROVIDERS: Array<{
  id: SpeechProviderId;
  name: string;
  maker: string;
  badge: string;
  badgeEn: string;
  description: string;
  descriptionEn: string;
  note: string;
  noteEn: string;
  keyUrl: string;
  keyAction: string;
  keyActionEn: string;
  models: Array<{ value: string; label: string }>;
}> = [
  {
    id: "gemini",
    name: "Gemini Speech",
    maker: "Google AI",
    badge: "可试用",
    badgeEn: "Trial available",
    description: "最接近 AI Studio 的表达型朗读，支持指令控制语气与八语朗读。",
    descriptionEn: "Expressive speech close to the AI Studio experience, with instruction-led delivery and multilingual voices.",
    note: "免费额度与可用地区由 Google 决定。",
    noteEn: "Google determines free quotas and regional availability.",
    keyUrl: "https://aistudio.google.com/api-keys",
    keyAction: "前往 AI Studio 创建 Key",
    keyActionEn: "Create a key in AI Studio",
    models: [
      { value: "gemini-3.1-flash-tts-preview", label: "Gemini 3.1 Flash TTS Preview" },
      { value: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash Preview TTS" },
      { value: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro Preview TTS" },
    ],
  },
  {
    id: "qwen",
    name: "Qwen3 TTS",
    maker: "Alibaba Cloud",
    badge: "多语优先",
    badgeEn: "Multilingual",
    description: "支持中、英、法、德、意、西、韩、日多语朗读，适合术语、整句与课程正文。",
    descriptionEn: "Stable multilingual speech for terms, complete sentences and lesson narration.",
    note: "百炼 Key 分中国站与国际站，必须选择 Key 所属地区。",
    noteEn: "Model Studio keys are region-specific; select the region where your key was created.",
    keyUrl: "https://modelstudio.console.alibabacloud.com/",
    keyAction: "前往 Model Studio 获取 Key",
    keyActionEn: "Get a key from Model Studio",
    models: [
      { value: "qwen3-tts-flash", label: "Qwen3 TTS Flash" },
      { value: "qwen3-tts-instruct-flash", label: "Qwen3 TTS Instruct Flash" },
    ],
  },
  {
    id: "fish",
    name: "Fish Audio",
    maker: "Fish Audio",
    badge: "拟人表达",
    badgeEn: "Expressive",
    description: "S2 Pro 强调自然韵律与角色化表达，可选填公开或自有音色的 Reference ID。",
    descriptionEn: "S2 Pro emphasizes natural prosody and characterful delivery, with an optional voice reference ID.",
    note: "托管 API 由 Fish Audio 计费；未填 Voice ID 时使用服务默认声线。",
    noteEn: "Fish Audio bills its hosted API; leaving Voice ID empty uses the service default.",
    keyUrl: "https://fish.audio/app/api-keys/",
    keyAction: "前往 Fish Audio 获取 Key",
    keyActionEn: "Get a Fish Audio key",
    models: [{ value: "s2-pro", label: "Fish Audio S2 Pro" }],
  },
  {
    id: "openai",
    name: "OpenAI Speech",
    maker: "OpenAI API",
    badge: "高质量",
    badgeEn: "High quality",
    description: "支持自然指令式朗读与传统高清 TTS，可作为稳定的商业语音选项。",
    descriptionEn: "Supports natural instruction-led speech and conventional HD TTS as a stable commercial option.",
    note: "需要 OpenAI API 账户与可用余额，不属于免费服务。",
    noteEn: "Requires an OpenAI API account with available credit; this is not a free service.",
    keyUrl: "https://platform.openai.com/api-keys",
    keyAction: "前往 OpenAI 创建 Key",
    keyActionEn: "Create an OpenAI key",
    models: [
      { value: "gpt-4o-mini-tts", label: "GPT-4o mini TTS" },
      { value: "tts-1-hd", label: "TTS-1 HD" },
      { value: "tts-1", label: "TTS-1" },
    ],
  },
];

const DEFAULT_SPEECH_MODELS = Object.fromEntries(
  SPEECH_PROVIDERS.map((provider) => [provider.id, provider.models[0].value]),
) as Record<SpeechProviderId, string>;

const DEFAULT_NOTE: Note = {
  id: "welcome",
  title: "第一则深度笔记 · First deep note",
  body: "CLIL 不是机械翻译，而是让不同语言帮助我看见概念的边界。\nCLIL is not mechanical translation; different languages reveal the boundaries of a concept.\n\n今天想继续追问 / My next question:",
  subject: "literature",
  updatedAt: Date.now(),
};

const NOTES_STORAGE_KEY = "deep-language-expert-notes-v1";
const LEGACY_NOTES_STORAGE_KEYS = ["deep-voice-expert-notes-v1", "omnimedia-academy-notes-v1"];
const INTERFACE_LANGUAGE_KEY = "deep-language-interface-language";
const LEGACY_INTERFACE_LANGUAGE_KEY = "deep-voice-interface-language";
const TEXT_SIZE_KEY = "deep-language-text-size";
const OFFLINE_VOICE_STATE_EVENT = "deep-language-offline-state";

const TEXT_SIZE_OPTIONS: Array<{ id: TextSize; label: string; labelEn: string; mark: string }> = [
  { id: "standard", label: "标准文字", labelEn: "Standard text", mark: "A" },
  { id: "large", label: "大号文字", labelEn: "Large text", mark: "A+" },
  { id: "extra", label: "特大文字", labelEn: "Extra-large text", mark: "A++" },
];

const WIKIPEDIA_HOSTS: Record<LanguageCode, string> = {
  CN: "zh.wikipedia.org",
  EN: "en.wikipedia.org",
  FR: "fr.wikipedia.org",
  DE: "de.wikipedia.org",
  IT: "it.wikipedia.org",
  ES: "es.wikipedia.org",
  KO: "ko.wikipedia.org",
  JA: "ja.wikipedia.org",
};

const VOICE_SAMPLES: Record<LanguageCode, string> = {
  CN: "知识为体，语言为用。",
  EN: "Knowledge gives language its purpose.",
  FR: "La langue éclaire le savoir.",
  DE: "Sprache macht Wissen beweglich.",
  IT: "La lingua rende vivo il sapere.",
  ES: "La lengua da vida al conocimiento.",
  KO: "언어는 지식을 살아 움직이게 합니다.",
  JA: "言葉は知識を生きたものにします。",
};

function wikipediaHref(term: string, language: LanguageCode) {
  return `https://${WIKIPEDIA_HOSTS[language]}/wiki/Special:Search?search=${encodeURIComponent(term.trim())}`;
}

function genericReport(term: ActiveTerm, subjectName: string, locale: UiLocale): TermReport {
  if (locale === "en") {
    return {
      definition: `“${term.value}” is a key concept in the ${subjectName} course. This is the built-in summary; a connected terminology service can provide a deeper academic definition and theoretical context.`,
      etymology: "A complete local etymology is not yet available. A live report can trace Greek, Latin or Germanic roots while separating reliable history from folk etymology.",
      grammar: `${term.language} term. A live report can add part of speech, gender, inflection, case, collocations and common syntactic positions.`,
      nuance: "Separate everyday usage from the technical meaning in this subject, then compare near-synonyms to define its semantic boundary.",
      example: `${term.value} becomes precise only when its context is made explicit.`,
      translation: `只有在语境被明确以后，“${term.value}”的含义才真正精确。`,
    };
  }
  return {
    definition: `“${term.value}”是「${subjectName}」课程中的关键概念。当前展示内置摘要；连接术语接口后可生成更细致的学术定义与理论背景。`,
    etymology: "该词的完整词源报告尚未写入本地词库。实时术语接口会追溯希腊语、拉丁语或日耳曼语词根，并区分可靠词源与民间附会。",
    grammar: `${term.language} 术语。实时报告可补充词性、阴阳性、变位、格位、固定搭配与常见句法位置。`,
    nuance: "应把日常用法与当前学科中的技术含义分开，并通过近义词比较划定语义边界。",
    example: `${term.value} becomes precise only when its context is made explicit.`,
    translation: `只有在语境被明确以后，“${term.value}”的含义才真正精确。`,
  };
}

function termReportFor(term: ActiveTerm, subjectName: string, locale: UiLocale) {
  const normalized = term.value.toLowerCase().replace(/[.,!?]/g, "");
  if (locale === "en") return genericReport(term, subjectName, locale);
  return TERM_REPORTS[normalized] || genericReport(term, subjectName, locale);
}

function ensureTargetCards(primary: string, fallback: string, locale: UiLocale, subjectId: SubjectId) {
  const missing = TARGET_LANGUAGE_CODES
    .filter((language) => !primary.includes(`[[${language}:`))
    .map((language) => (
      fallback.split("\n").find((line) => line.trim().startsWith(`[[${language}:`))
      || TARGET_CARD_SUPPLEMENTS[subjectId][language]
    ))
    .filter((line): line is string => Boolean(line));

  return missing.length
    ? `${primary}\n\n## ${locale === "en" ? "Target-language review" : "目标语言术语回顾"}\n${missing.join("\n")}`
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
  const [locale, setLocale] = useState<UiLocale>("zh");
  const [textSize, setTextSize] = useState<TextSize>("standard");
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
  const [speechSettingsOpen, setSpeechSettingsOpen] = useState(false);
  const [offlineVoiceOpen, setOfflineVoiceOpen] = useState(false);
  const [offlineVoiceState, setOfflineVoiceState] = useState<OfflineVoiceState>({ enabled: false, installed: {} });
  const [offlineDownloading, setOfflineDownloading] = useState<LanguageCode | null>(null);
  const [offlineProgress, setOfflineProgress] = useState<Partial<Record<LanguageCode, number>>>({});
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [speechSession, setSpeechSession] = useState<SpeechSessionState>({ activeProvider: null, connections: {} });
  const [selectedSpeechProvider, setSelectedSpeechProvider] = useState<SpeechProviderId>("gemini");
  const [speechKeyInput, setSpeechKeyInput] = useState("");
  const [speechModel, setSpeechModel] = useState(DEFAULT_SPEECH_MODELS.gemini);
  const [speechRegion, setSpeechRegion] = useState<"international" | "china">("international");
  const [speechVoiceId, setSpeechVoiceId] = useState("");
  const [speechConnecting, setSpeechConnecting] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
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
  const lessonEn = LESSONS_EN[subjectId];
  const subjectName = locale === "en" ? subject.nameEn : subject.name;
  const ui = (zh: string, en: string) => locale === "en" ? en : zh;
  const currentCurriculum = CURRICULUM[subjectId];
  const activeNote = notes.find((note) => note.id === activeNoteId) || notes[0];
  const activeSpeechConnection = speechSession.activeProvider
    ? speechSession.connections[speechSession.activeProvider]
    : undefined;
  const selectedSpeechMeta = SPEECH_PROVIDERS.find((provider) => provider.id === selectedSpeechProvider) || SPEECH_PROVIDERS[0];
  const selectedSpeechConnection = speechSession.connections[selectedSpeechProvider];
  const offlineInstalledCount = Object.values(offlineVoiceState.installed).filter(Boolean).length;

  const localizedLesson = locale === "en" ? lessonEn : lesson;
  const modeDsl = mode === "case"
    ? localizedLesson.caseDsl
    : mode === "close-reading"
      ? localizedLesson.closeReadingDsl
      : localizedLesson.conceptDsl;
  const localDsl = ensureTargetCards(modeDsl, localizedLesson.conceptDsl, locale, subjectId);
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
    const saved = window.localStorage.getItem(INTERFACE_LANGUAGE_KEY)
      || window.localStorage.getItem(LEGACY_INTERFACE_LANGUAGE_KEY);
    const next: UiLocale = saved === "zh" || saved === "en"
      ? saved
      : navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
    window.localStorage.setItem(INTERFACE_LANGUAGE_KEY, next);
    window.localStorage.removeItem(LEGACY_INTERFACE_LANGUAGE_KEY);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    const frame = window.requestAnimationFrame(() => setLocale(next));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(TEXT_SIZE_KEY);
    const next: TextSize = saved === "large" || saved === "extra" ? saved : "standard";
    window.localStorage.setItem(TEXT_SIZE_KEY, next);
    const frame = window.requestAnimationFrame(() => setTextSize(next));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const raw = window.localStorage.getItem(NOTES_STORAGE_KEY)
        || LEGACY_NOTES_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Note[];
          if (saved.length) {
            setNotes(saved);
            setActiveNoteId(saved[0].id);
            window.localStorage.setItem(NOTES_STORAGE_KEY, raw);
            LEGACY_NOTES_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
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
    const syncOfflineState = () => setOfflineVoiceState(getOfflineVoiceState());
    syncOfflineState();
    window.addEventListener(OFFLINE_VOICE_STATE_EVENT, syncOfflineState);
    return () => window.removeEventListener(OFFLINE_VOICE_STATE_EVENT, syncOfflineState);
  }, []);

  useEffect(() => {
    if (!notesHydrated) return;
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }, [notes, notesHydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!speechSettingsOpen) {
        setSpeechKeyInput("");
        setSpeechError(null);
        return;
      }
      const connection = getSessionSpeechState().connections[selectedSpeechProvider];
      setSpeechKeyInput(connection?.apiKey || "");
      setSpeechModel(connection?.model || DEFAULT_SPEECH_MODELS[selectedSpeechProvider]);
      setSpeechRegion(connection?.region || "international");
      setSpeechVoiceId(connection?.voiceId || "");
      setSpeechError(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedSpeechProvider, speechSettingsOpen]);

  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      setSpeechSession(getSessionSpeechState());
      void getAudioCapability().then((capability) => {
        if (active) setAudioCapability(capability);
      });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCurriculumOpen(false);
      setNotebookOpen(false);
      setSpeechSettingsOpen(false);
      setOfflineVoiceOpen(false);
      setActiveTerm(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => () => stopSpeech(), []);

  function changeLocale(next: UiLocale) {
    setLocale(next);
    window.localStorage.setItem(INTERFACE_LANGUAGE_KEY, next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    setGeneratedDsl(null);
    setFocusTopic(null);
    setToast(next === "zh" ? "界面已切换为中文" : "Interface switched to English");
  }

  function changeTextSize(next: TextSize) {
    setTextSize(next);
    window.localStorage.setItem(TEXT_SIZE_KEY, next);
    const label = TEXT_SIZE_OPTIONS.find((option) => option.id === next);
    setToast(locale === "zh" ? `文字大小：${label?.label}` : `Text size: ${label?.labelEn}`);
  }

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
        body: JSON.stringify({ subject: subjectId, mode: nextMode, query: requestedTopic, interfaceLanguage: locale }),
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
      setToast(ui("已完成检索核验与 CLIL 术语编排", "Research verified and CLIL terminology structured"));
    } catch {
      setToast(ui("当前使用内置知识课程 · 未连接外部讲师服务", "Using the built-in course · no external lecturer connected"));
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
      const label = locale === "en"
        ? result.engine === "offline" ? "Local ONNX voice pack" : result.engine === "device" ? "Device voice" : "Neural speech"
        : result.label;
      setToast(result.engine === "neural"
        ? `${label} · ${result.voice} · ${result.sampleRate || 24_000} Hz`
        : `${label} · ${ui("当前实际声线", "Active voice")}: ${result.voice}`);
    } catch (error) {
      setPlayingKey(null);
      setToast(locale === "en" ? "Speech playback is unavailable. Check the selected voice service or device voices." : error instanceof Error ? error.message : "当前设备暂不支持语音播放");
    }
  }

  async function connectSpeechProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = speechKeyInput.trim();
    if (!value) return;
    const previousState = getSessionSpeechState();
    const previousConnection = previousState.connections[selectedSpeechProvider];
    setSpeechConnecting(true);
    setSpeechError(null);
    try {
      setSessionSpeechConnection({
        provider: selectedSpeechProvider,
        apiKey: value,
        model: speechModel,
        ...(selectedSpeechProvider === "qwen" ? { region: speechRegion } : {}),
        ...(selectedSpeechProvider === "fish" && speechVoiceId.trim() ? { voiceId: speechVoiceId.trim() } : {}),
      });
      setSpeechSession(getSessionSpeechState());
      setAudioCapability(await getAudioCapability());
      const result = await playSpeech(locale === "en"
        ? { text: "Build knowledge through language.", language: "EN" }
        : { text: "知识为体，语言为用。", language: "CN" });
      setLastPlayback(result);
      setToast(ui(`${speechProviderLabel(selectedSpeechProvider)} 已连接 · ${result.voice} · ${result.sampleRate || 24_000} Hz`, `${selectedSpeechMeta.name} connected · ${result.voice} · ${result.sampleRate || 24_000} Hz`));
    } catch (error) {
      if (previousConnection) setSessionSpeechConnection(previousConnection);
      else clearSessionSpeechConnection(selectedSpeechProvider);
      if (previousState.activeProvider && previousState.connections[previousState.activeProvider]) {
        setActiveSpeechProvider(previousState.activeProvider);
      }
      setSpeechSession(getSessionSpeechState());
      setAudioCapability(await getAudioCapability());
      setSpeechError(locale === "en" ? `Could not connect ${selectedSpeechMeta.name}. Check the key, region, permissions and balance.` : error instanceof Error ? error.message : `无法连接 ${selectedSpeechMeta.name}，请检查 Key。`);
    } finally {
      setSpeechConnecting(false);
    }
  }

  async function disconnectSpeechProvider() {
    clearSessionSpeechConnection(selectedSpeechProvider);
    setSpeechSession(getSessionSpeechState());
    setSpeechKeyInput("");
    setSpeechError(null);
    setLastPlayback(null);
    setAudioCapability(await getAudioCapability());
    setToast(ui(`已清除本次会话中的 ${selectedSpeechMeta.name} Key`, `${selectedSpeechMeta.name} key cleared from this session`));
  }

  async function activateSpeechProvider(provider: SpeechProviderId) {
    setActiveSpeechProvider(provider);
    setSpeechSession(getSessionSpeechState());
    setAudioCapability(await getAudioCapability());
    setToast(ui(`已切换到 ${speechProviderLabel(provider)}`, `Switched to ${SPEECH_PROVIDERS.find((item) => item.id === provider)?.name || provider}`));
  }

  async function installOfflinePack(language: LanguageCode) {
    const pack = offlineVoicePackFor(language);
    if (!pack) {
      setOfflineError(ui("该语言暂未提供可下载的离线语音包。", "No downloadable offline pack is available for this language yet."));
      return;
    }
    setOfflineDownloading(language);
    setOfflineError(null);
    setOfflineProgress((current) => ({ ...current, [language]: 0 }));
    try {
      const state = await downloadOfflineVoicePack(language, (progress) => {
        setOfflineProgress((current) => ({ ...current, [language]: Math.max(1, Math.round(progress)) }));
      });
      setOfflineVoiceState(state);
      setOfflineProgress((current) => ({ ...current, [language]: 100 }));
      setLastPlayback(null);
      setToast(ui(`${pack.name} 已下载并启用`, `${pack.name} downloaded and enabled`));
    } catch (error) {
      setOfflineError(locale === "en" ? "The voice pack could not be downloaded. Check your connection and available storage." : error instanceof Error ? error.message : "离线语音包下载失败，请检查网络与可用存储空间。");
    } finally {
      setOfflineDownloading(null);
    }
  }

  function toggleOfflineVoices() {
    if (!offlineInstalledCount) {
      setOfflineError(ui("请先下载至少一个语言包。", "Download at least one voice pack first."));
      return;
    }
    const state = setOfflineVoiceEnabled(!offlineVoiceState.enabled);
    setOfflineVoiceState(state);
    setLastPlayback(null);
    setToast(state.enabled ? ui("离线语音包已启用；云端连接仍然优先", "Offline voice packs enabled; cloud connections still take priority") : ui("离线语音包已停用", "Offline voice packs disabled"));
  }

  async function clearOfflineVoices() {
    const state = await clearOfflineVoicePacks();
    setOfflineVoiceState(state);
    setOfflineProgress({});
    setOfflineError(null);
    setLastPlayback(null);
    setToast(ui("全部离线语音包与浏览器模型缓存已清除", "All offline voice packs and browser model caches were cleared"));
  }

  async function inspectTerm(term: ActiveTerm) {
    setActiveTerm(term);
    setTermReport(termReportFor(term, subjectName, locale));
    setTermLoading(true);
    try {
      const response = await fetch("/api/term", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.value, language: term.language, subject: subjectId, interfaceLanguage: locale }),
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
          <a
            href={wikipediaHref(token.value, token.language)}
            target="_blank"
            rel="noreferrer"
            title={ui(`在 ${token.language} 维基百科检索 ${token.value}`, `Search ${token.language} Wikipedia for ${token.value}`)}
            aria-label={ui(`在维基百科检索 ${token.value}`, `Search Wikipedia for ${token.value}`)}
          >W</a>
          <button
            type="button"
            className={playingKey === key ? "playing" : ""}
            aria-label={ui(`朗读 ${token.value}`, `Pronounce ${token.value}`)}
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
      title: ui("未命名笔记", "Untitled note"),
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
    <main className="academy-app" data-text-size={textSize} style={{ "--accent": subject.accent } as React.CSSProperties}>
      <aside className="academy-sidebar" aria-label={ui("八大学科知识领域", "Eight knowledge domains")}>
        <div className="academy-brand">
          <span className="academy-mark">深语</span>
          <span><strong>深度语言专家</strong><small>DEEP LANGUAGE EXPERT</small></span>
        </div>

        <p className="campaign-label">{ui("知识领域 · KNOWLEDGE DOMAINS", "KNOWLEDGE DOMAINS · 知识领域")} <span>08</span></p>
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
              <span className="campaign-name"><strong>{locale === "en" ? item.nameEn : item.name}</strong><small>{item.track}</small></span>
              <i />
            </button>
          ))}
        </nav>

        <section className="clil-card">
          <span className="clil-orbit"><i /><i /><i /></span>
          <div><small>{ui("学习方法 · LEARNING METHOD", "LEARNING METHOD · 学习方法")}</small><strong>{ui("CLIL · 内容与语言整合", "CLIL · Content and Language Integrated Learning")}</strong><p>{ui("中/英为基 · 六种目标语为用", "Chinese/English foundations · six target languages in use")}</p></div>
        </section>
        <button className="notebook-launch" type="button" onClick={() => setNotebookOpen(true)}>
          <span>▤</span><span><strong>{ui("多语备忘录", "Multilingual notebook")}</strong><small>{notes.length} NOTES · LOCAL</small></span><i>↗</i>
        </button>
      </aside>

      <section className="academy-desk">
        <header className="academy-topbar">
          <div className="mobile-academy-brand"><span>深语</span><strong>{ui("语言专家", "Language Expert")}</strong></div>
          <div className="course-path"><small>{subject.campaign}</small><span>{subjectName}</span><i>/</i><strong>{focusTopic || lesson.index.split(" · ").slice(-1)[0]}</strong></div>
          <div className="quick-actions" aria-label={ui("快捷学术指令", "Academic quick actions")}>
            {QUICK_ACTIONS.map((action) => (
              <button
                type="button"
                key={action.id}
                className={mode === action.id ? "active" : ""}
                onClick={() => void requestLesson(action.id)}
                disabled={loading}
              >
                <span>{action.glyph}</span><b>{locale === "en" ? action.en : action.label}</b><small>{locale === "en" ? action.label : action.en.toUpperCase()}</small>
              </button>
            ))}
          </div>
          <div className="topbar-tools">
            <div className="text-size-switch" role="group" aria-label={ui("文字大小", "Text size")}>
              {TEXT_SIZE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={textSize === option.id ? "active" : ""}
                  onClick={() => changeTextSize(option.id)}
                  aria-pressed={textSize === option.id}
                  aria-label={locale === "zh" ? option.label : option.labelEn}
                  title={locale === "zh" ? option.label : option.labelEn}
                >
                  {option.mark}
                </button>
              ))}
            </div>
            <div className="locale-switch" role="group" aria-label={ui("界面语言", "Interface language")}>
              <button type="button" className={locale === "zh" ? "active" : ""} onClick={() => changeLocale("zh")}>中</button>
              <button type="button" className={locale === "en" ? "active" : ""} onClick={() => changeLocale("en")}>EN</button>
            </div>
            <button type="button" onClick={() => setCurriculumOpen(true)}><span>⌘</span>{ui("课程大纲", "Curriculum")}</button>
            <button type="button" className="round-tool" onClick={() => setNotebookOpen(true)} aria-label={ui("打开备忘录", "Open notebook")}>▤</button>
          </div>
        </header>

        <div className="academy-scroll">
          <div className="academy-stage">
            <article className="lecture-paper" aria-busy={loading}>
              <div className="paper-spine" />
              <header className="lecture-hero">
                <div className="lecture-index"><span>{subject.symbol}</span>{focusTopic ? `${subject.campaign} · CURRICULUM FOCUS` : lesson.index}</div>
                <h1>{(focusTopic || localizedLesson.title).split("\n").map((line, index) => <Fragment key={`${line}-${index}`}>{index > 0 && <br />}{line}</Fragment>)}</h1>
                <p>{focusTopic ? ui(`从课程树进入“${focusTopic}”，以下内置讲义展示该学科的 CLIL 分析协议；连接讲师服务后会生成针对该小节的完整内容。`, `Selected from the curriculum: “${focusTopic}”. This built-in lecture demonstrates the CLIL protocol; a connected lecturer can generate a complete lesson for this topic.`) : localizedLesson.deck}</p>
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
                          {playingKey === sentenceKey ? "Ⅱ" : "▶"}<span>{ui("整句朗读", "Play sentence")}</span>
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
                              <a href={wikipediaHref(entry.term, block.language)} target="_blank" rel="noreferrer" title={ui("在维基百科检索", "Search Wikipedia")} aria-label={ui(`在维基百科检索 ${entry.term}`, `Search Wikipedia for ${entry.term}`)}>W</a>
                              <button type="button" className={playingKey === wordKey ? "playing" : ""} onClick={() => void speak(entry.term, block.language)} aria-label={ui(`朗读 ${entry.term}`, `Pronounce ${entry.term}`)}>♪</button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              <section className="carry-question">
                <span>✳</span><div><small>{ui("今日留题 · QUESTION TO CARRY", "QUESTION TO CARRY · 今日留题")}</small><p>{localizedLesson.question}</p></div>
              </section>

              <section className="visual-gallery">
                <header><div><small>{ui("视觉依据 · VISUAL GROUNDING", "VISUAL GROUNDING · 视觉依据")}</small><h2>{ui("视觉参考画廊", "Visual reference gallery")}</h2></div><span>{liveVisuals.length ? "LIVE SOURCES" : "CURATED · PUBLIC DOMAIN"}</span></header>
                <div>
                  {visuals.map((visual) => (
                    <a href={visual.sourceUrl} target="_blank" rel="noreferrer" key={visual.sourceUrl}>
                      <span className="visual-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={visual.src} alt={visual.title} />
                      </span>
                      <span className="visual-copy"><strong>{visual.title}</strong><small>{locale === "en" ? visual.captionEn || visual.caption : visual.caption}</small><i>{visual.sourceLabel} ↗</i></span>
                    </a>
                  ))}
                </div>
              </section>

              {loading && <div className="academy-loading"><span /><p>{ui("正在组织概念、语言与来源…", "Organizing concepts, languages and sources…")}</p></div>}
            </article>

            <aside className="learning-rail">
              <section className="progress-card">
                <header><span>{ui("学习进度", "Learning progress")}</span><small>{subject.campaign} · 38%</small></header>
                <div className="progress-track"><i /></div>
                <p><strong>{subjectName}</strong><small>{subject.track}</small></p>
                <button type="button" onClick={() => setCurriculumOpen(true)}>{ui("查看三级课程树", "View three-level curriculum")} <span>→</span></button>
              </section>

              <section className="voice-strategy">
                <header>
                  <span>{ui("真实多语声线", "Multilingual voices")}</span>
                  <span className="voice-header-actions">
                    <small>{speechSession.activeProvider ? `${speechSession.activeProvider.toUpperCase()} TTS` : offlineVoiceState.enabled && offlineInstalledCount ? "OFFLINE ONNX" : audioCapability.cloudReady ? "NEURAL TTS" : "DEVICE TTS"}</small>
                    <button type="button" onClick={() => { setOfflineError(null); setOfflineVoiceOpen(true); }}>{ui("离线包", "Offline")}</button>
                    <button type="button" onClick={() => { setSpeechError(null); setSpeechSettingsOpen(true); }}>{Object.keys(speechSession.connections).length ? ui("云端", "Cloud") : ui("连接", "Connect")}</button>
                  </span>
                </header>
                {ALL_LANGUAGE_CODES.map((language) => {
                  const profile = voiceProfileForLanguage(language);
                  const sample = VOICE_SAMPLES[language];
                  const sampleKey = `${language}:${sample}`;
                  return (
                    <button type="button" className={playingKey === sampleKey ? "playing" : ""} key={language} onClick={() => void speak(sample, language)}>
                      <span>{language}</span>
                      <span className="voice-copy"><strong>{profile.role}</strong><small>{activeSpeechConnection ? voiceNameForConnection(language, activeSpeechConnection) : offlineVoiceState.enabled && offlineVoiceState.installed[language] ? offlineVoicePackFor(language)?.name : audioCapability.cloudReady ? profile.cloudVoice : ui("自动选择设备最佳声线", "Best available device voice")}</small></span>
                      <i className="mini-wave"><b /><b /><b /></i>
                    </button>
                  );
                })}
                <p className={audioCapability.cloudReady || offlineVoiceState.enabled && offlineInstalledCount ? "cloud-ready" : "device-only"}><i />{lastPlayback ? `${lastPlayback.label} · ${lastPlayback.voice}` : offlineVoiceState.enabled && offlineInstalledCount ? ui(`${offlineInstalledCount} 个本地语音包 · 无需联网合成`, `${offlineInstalledCount} local voice packs · offline synthesis`) : audioCapability.cloudReady ? `${audioCapability.label} · 24 kHz PCM` : ui("分句朗读 · 跨语切换 · 真实声线检测", "Sentence-aware · language switching · real voice detection")}</p>
                {audioCapability.cloudReady && <p className="voice-disclosure">{ui("AI 生成语音 · 非真人录音 · 使用者自备服务 Key", "AI-generated speech · not a human recording · user-supplied key")}</p>}
              </section>

              <section className="protocol-card">
                <header><span>{ui("教学协议", "Learning protocol")}</span><small>CLIL DSL · V2</small></header>
                <dl>
                  <div><dt>{"{{…|LANG}}"}</dt><dd>{ui("可发音行内术语", "Pronounceable inline terms")}</dd></div>
                  <div><dt>{"[[LANG: …]]"}</dt><dd>{ui("六种目标语拆解", "Six target-language cards")}</dd></div>
                  <div><dt>CN / EN → FR / DE / IT / ES / KO / JA</dt><dd>{ui("母语理解，跨语校准", "Native-language depth, cross-language calibration")}</dd></div>
                </dl>
              </section>

              <section className="source-panel">
                <header><span>{ui("学术依据", "Academic sources")}</span><small>{liveSources.length ? "GROUNDED" : "CURATED"}</small></header>
                {(liveSources.length ? liveSources : visuals.map((visual) => ({ title: visual.title, url: visual.sourceUrl }))).slice(0, 4).map((source, index) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span>0{index + 1}</span><strong>{source.title}</strong><i>↗</i></a>
                ))}
                <p><i />{liveSources.length ? ui("检索来源已连接", "Live sources connected") : ui("内置公共领域资料", "Built-in public-domain material")}</p>
              </section>
            </aside>
          </div>
        </div>

        <form className="academy-ask" onSubmit={submitQuestion}>
          <span className="ask-mark">?</span>
          <div><label htmlFor="academy-question">{ui("向深度语言专家追问", "Ask Deep Language Expert")}</label><input id="academy-question" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ui(`关于${subject.name}，继续追问一个词语、概念、原文或案例…`, `Ask about a term, concept, source or case in ${subject.nameEn}…`)} autoComplete="off" /></div>
          <span className="ask-hints"><kbd>CLIL</kbd><kbd>FR</kbd><kbd>DE</kbd><kbd>IT</kbd><kbd>ES</kbd><kbd>KO</kbd><kbd>JA</kbd></span>
          <button type="submit" disabled={!query.trim() || loading} aria-label={ui("发送问题", "Send question")}>↑</button>
        </form>
      </section>

      {curriculumOpen && (
        <ModalShell label={ui("课程大纲", "Curriculum")} onClose={() => setCurriculumOpen(false)} wide>
          <header className="modal-header curriculum-header">
            <div><small>{subject.campaign} · ACADEMIC CAMPAIGN</small><h2>{ui(`${subject.name}课程大纲`, `${subject.nameEn} curriculum`)}</h2><p>{subject.track} · {ui("三阶段进阶路径", "Three-stage learning path")}</p></div>
            <button type="button" onClick={() => setCurriculumOpen(false)} aria-label={ui("关闭", "Close")}>×</button>
          </header>
          <div className="curriculum-body">
            <aside>
              {currentCurriculum.map((level, index) => (
                <button type="button" className={index === curriculumLevel ? "active" : ""} key={level.id} onClick={() => setCurriculumLevel(index)}>
                  <span>{level.id}</span><strong>{locale === "en" ? level.en : level.name}</strong><small>{locale === "en" ? level.name : level.en}</small><i>{index < currentCurriculum.length - 1 ? "↓" : "◆"}</i>
                </button>
              ))}
            </aside>
            <section className="curriculum-topics">
              <header><div><small>{currentCurriculum[curriculumLevel].id} · {currentCurriculum[curriculumLevel].en}</small><h3>{locale === "en" ? currentCurriculum[curriculumLevel].descriptorEn : currentCurriculum[curriculumLevel].descriptor}</h3></div><span>{ui("点击小节开始授课", "Select a topic to begin")}</span></header>
              <div>
                {(locale === "en" ? currentCurriculum[curriculumLevel].topicsEn : currentCurriculum[curriculumLevel].topics).map((topic, index) => (
                  <button type="button" key={topic} onClick={() => chooseTopic(topic)}>
                    <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{topic}</strong><small>{ui("中英讲解 · 六种目标语术语 · 视觉资料", "CN/EN explanation · six target languages · visuals")}</small></div><i>↗</i>
                  </button>
                ))}
              </div>
              <footer><span>CLIL</span><p>{ui("讲师以中文与英文建立概念，再用法语、德语、意大利语、西班牙语、韩语和日语校准术语边界。", "The lecturer builds concepts in Chinese and English, then calibrates their boundaries through French, German, Italian, Spanish, Korean and Japanese.")}</p></footer>
            </section>
          </div>
        </ModalShell>
      )}

      {speechSettingsOpen && (
        <ModalShell label={ui("云端语音中心", "Cloud speech center")} onClose={() => setSpeechSettingsOpen(false)} wide>
          <header className="modal-header speech-modal-header">
            <div><small>VOICE PROVIDERS · SESSION ONLY</small><h2>{ui("云端语音中心", "Cloud speech center")}</h2><p>{ui("云端服务是可选增强；离线语音包不需要账户或 API Key。", "Cloud services are optional; offline voice packs require no account or API key.")}</p></div>
            <button type="button" onClick={() => setSpeechSettingsOpen(false)} aria-label={ui("关闭", "Close")}>×</button>
          </header>
          <div className="speech-hub">
            <aside className="speech-provider-list">
              <header><span>{ui("语音供应商", "Speech providers")}</span><small>{Object.keys(speechSession.connections).length} CONNECTED</small></header>
              {SPEECH_PROVIDERS.map((provider) => {
                const connected = Boolean(speechSession.connections[provider.id]);
                const active = speechSession.activeProvider === provider.id;
                return (
                  <button
                    type="button"
                    className={`${selectedSpeechProvider === provider.id ? "selected" : ""} ${active ? "active" : ""}`}
                    key={provider.id}
                    onClick={() => setSelectedSpeechProvider(provider.id)}
                  >
                    <span className={`provider-mark provider-${provider.id}`}>{provider.name.slice(0, 1)}</span>
                    <span><strong>{provider.name}</strong><small>{provider.maker}</small></span>
                    <i>{active ? ui("使用中", "Active") : connected ? ui("已连接", "Connected") : locale === "en" ? provider.badgeEn : provider.badge}</i>
                  </button>
                );
              })}
              <section className="model-only-note">
                <span>LLM ≠ TTS</span>
                <strong>DeepSeek / Kimi</strong>
                <p>{ui("可用于生成课程内容，但官方 API 暂无直接语音输出；因此不伪装成语音引擎。", "They can generate lesson text, but their official APIs do not provide direct TTS output, so they are not presented as speech engines.")}</p>
              </section>
              <section className="model-only-note open-voice-note">
                <span>LOCAL ONNX</span>
                <strong>{ui("浏览器离线语音包", "Browser offline voice packs")}</strong>
                <p>{ui("中、英、法、德、意、西、韩语音包可下载到浏览器缓存；日语使用设备或云端声线。", "Chinese, English, French, German, Italian, Spanish and Korean packs can be cached locally; Japanese uses device or cloud voices.")}</p>
              </section>
            </aside>

            <section className="speech-provider-panel">
              <header className="speech-provider-intro">
                <div><small>{selectedSpeechMeta.maker}</small><h3>{selectedSpeechMeta.name}</h3><p>{locale === "en" ? selectedSpeechMeta.descriptionEn : selectedSpeechMeta.description}</p></div>
                <span>{selectedSpeechConnection ? speechSession.activeProvider === selectedSpeechProvider ? ui("正在使用", "Active") : ui("已连接", "Connected") : locale === "en" ? selectedSpeechMeta.badgeEn : selectedSpeechMeta.badge}</span>
              </header>

              <section className={`speech-connection-state ${selectedSpeechConnection ? "connected" : ""}`}>
                <span>{selectedSpeechConnection ? "✓" : "◇"}</span>
                <div><strong>{selectedSpeechConnection ? ui("本次会话已保存连接", "Connection saved for this session") : ui("等待连接你的账户", "Connect your own account")}</strong><p>{selectedSpeechConnection ? `${ui("模型", "Model")}：${selectedSpeechConnection.model || DEFAULT_SPEECH_MODELS[selectedSpeechProvider]}` : ui("密钥不会写入仓库、笔记或永久浏览器存储。", "The key is never written to the repository, notes or permanent browser storage.")}</p></div>
                {selectedSpeechConnection && speechSession.activeProvider !== selectedSpeechProvider && <button type="button" onClick={() => void activateSpeechProvider(selectedSpeechProvider)}>{ui("设为当前", "Set active")}</button>}
              </section>

              <form className="speech-provider-form" onSubmit={(event) => void connectSpeechProvider(event)}>
                <div className="speech-field-row">
                  <label><span>{ui("语音模型", "Speech model")}</span><select value={speechModel} onChange={(event) => setSpeechModel(event.target.value)}>{selectedSpeechMeta.models.map((model) => <option value={model.value} key={model.value}>{model.label}</option>)}</select></label>
                  {selectedSpeechProvider === "qwen" && (
                    <label><span>{ui("Key 所属地区", "Key region")}</span><select value={speechRegion} onChange={(event) => setSpeechRegion(event.target.value as "international" | "china")}><option value="international">International · Singapore</option><option value="china">中国站 / China · Beijing</option></select></label>
                  )}
                </div>
                {selectedSpeechProvider === "fish" && (
                  <label className="speech-optional-field"><span>Voice Reference ID <i>{ui("可选", "Optional")}</i></span><input value={speechVoiceId} onChange={(event) => setSpeechVoiceId(event.target.value)} placeholder={ui("留空使用默认声线，或填写自有 / 公开音色 ID", "Leave empty for the default voice, or enter an owned/public voice ID")} autoComplete="off" spellCheck={false} /></label>
                )}
                <label className="speech-key-label" htmlFor="speech-api-key">{selectedSpeechMeta.name} API Key</label>
                <div className="speech-key-field">
                  <span>⌁</span>
                  <input
                    id="speech-api-key"
                    type="password"
                    value={speechKeyInput}
                    onChange={(event) => { setSpeechKeyInput(event.target.value); setSpeechError(null); }}
                    placeholder={ui(`粘贴 ${selectedSpeechMeta.name} 的 API Key`, `Paste your ${selectedSpeechMeta.name} API key`)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {speechError && <p className="speech-error" role="alert">{speechError}</p>}
                <p className="speech-privacy">{ui("密钥仅保存在当前标签页的 Session Storage 中，并通过 HTTPS 发送到本应用服务端后转发给所选供应商。关闭标签页或清除连接即删除。", "The key stays only in this tab's Session Storage and is sent over HTTPS through this app to the selected provider. Closing the tab or clearing the connection deletes it.")}</p>
                <p className="speech-provider-note">{locale === "en" ? selectedSpeechMeta.noteEn : selectedSpeechMeta.note}</p>
                <div className="speech-actions">
                  <a href={selectedSpeechMeta.keyUrl} target="_blank" rel="noreferrer">{locale === "en" ? selectedSpeechMeta.keyActionEn : selectedSpeechMeta.keyAction} ↗</a>
                  <span>
                    {selectedSpeechConnection && <button className="speech-disconnect" type="button" onClick={() => void disconnectSpeechProvider()}>{ui("清除连接", "Clear connection")}</button>}
                    <button className="speech-connect" type="submit" disabled={speechKeyInput.trim().length < 8 || speechConnecting}>{speechConnecting ? ui("正在验证并试听…", "Validating and previewing…") : selectedSpeechConnection ? ui("更新并试听", "Update and preview") : ui("连接并试听", "Connect and preview")}</button>
                  </span>
                </div>
              </form>

              <footer className="speech-hub-footer"><span>PRIVACY</span><p>{ui("请勿朗读敏感、机密或个人信息。请求内容与用量政策由对应服务商决定，本应用不会代购额度。", "Do not submit sensitive, confidential or personal information. Each provider controls its request and usage policies; this app does not resell credit.")}</p></footer>
            </section>
          </div>
        </ModalShell>
      )}

      {offlineVoiceOpen && (
        <ModalShell label={ui("离线语音包", "Offline voice packs")} onClose={() => setOfflineVoiceOpen(false)} wide>
          <header className="modal-header offline-voice-header">
            <div><small>DOWNLOADABLE · LOCAL ONNX</small><h2>{ui("离线语音包", "Offline voice packs")}</h2><p>{ui("首次下载需要网络；完成后，模型在浏览器本地运行，无需账户、API Key 或云端请求。", "The first download requires a network connection. Afterward the model runs locally, without an account, API key or cloud request.")}</p></div>
            <button type="button" onClick={() => setOfflineVoiceOpen(false)} aria-label={ui("关闭", "Close")}>×</button>
          </header>
          <div className="offline-voice-manager">
            <section className="offline-summary">
              <div><span className={offlineVoiceState.enabled && offlineInstalledCount ? "ready" : ""}>◉</span><p><strong>{offlineInstalledCount ? ui(`${offlineInstalledCount} 个语音包已就绪`, `${offlineInstalledCount} voice packs ready`) : ui("尚未下载语音包", "No voice packs downloaded")}</strong><small>{offlineVoiceState.enabled && offlineInstalledCount ? ui("本地 ONNX 合成已启用；已连接的云端服务优先。", "Local ONNX synthesis is active; a connected cloud service still takes priority.") : ui("可按语言分别下载，未安装语言继续使用设备声线。", "Download languages separately; missing languages continue to use device voices.")}</small></p></div>
              <span>
                <button type="button" onClick={toggleOfflineVoices} disabled={!offlineInstalledCount}>{offlineVoiceState.enabled ? ui("停用离线合成", "Disable offline") : ui("启用离线合成", "Enable offline")}</button>
                {offlineInstalledCount > 0 && <button className="clear-offline" type="button" onClick={() => void clearOfflineVoices()}>{ui("清空全部", "Clear all")}</button>}
              </span>
            </section>
            <div className="offline-pack-grid">
              {OFFLINE_VOICE_PACKS.map((pack) => {
                const installed = Boolean(offlineVoiceState.installed[pack.language]);
                const downloading = offlineDownloading === pack.language;
                const progress = offlineProgress[pack.language] || 0;
                return (
                  <article className={installed ? "installed" : ""} key={pack.language}>
                    <header><span>{pack.language}</span><div><strong>{pack.name}</strong><small>{pack.locale} · {pack.size}</small></div><i>{installed ? ui("已下载", "Downloaded") : ui("可选包", "Optional")}</i></header>
                    <p>{locale === "en" ? pack.descriptionEn : pack.description}</p>
                    <dl><div><dt>{ui("模型", "Model")}</dt><dd>{pack.model}</dd></div><div><dt>{ui("许可", "License")}</dt><dd><a href={pack.licenseUrl} target="_blank" rel="noreferrer">{pack.license} ↗</a></dd></div></dl>
                    {downloading && <div className="offline-download-progress"><span style={{ width: `${Math.max(3, progress)}%` }} /><small>{progress > 0 ? `${progress}%` : ui("准备下载…", "Preparing…")}</small></div>}
                    <footer><a href={pack.sourceUrl} target="_blank" rel="noreferrer">{ui("模型卡与来源", "Model card and source")} ↗</a><button type="button" disabled={installed || offlineDownloading !== null} onClick={() => void installOfflinePack(pack.language)}>{installed ? ui("已缓存在本机", "Cached locally") : downloading ? ui("正在下载…", "Downloading…") : ui("下载语音包", "Download pack")}</button></footer>
                  </article>
                );
              })}
            </div>
            {offlineError && <p className="offline-error" role="alert">{offlineError}</p>}
            <footer className="offline-license-note"><span>LICENSE</span><p>{ui("中文包采用 Apache-2.0；MMS 英、法、德、意、西、韩模型采用 CC-BY-NC-4.0，仅适用于非商业用途。日语暂用设备或云端声线。软件代码采用 MIT，模型权利与代码许可彼此独立。", "The Chinese pack is Apache-2.0. MMS English, French, German, Italian, Spanish and Korean models are CC-BY-NC-4.0 and non-commercial only. Japanese currently uses device or cloud voices. The software is MIT; model and code licenses remain separate.")}</p></footer>
          </div>
        </ModalShell>
      )}

      {activeTerm && termReport && (
        <ModalShell label={ui(`${activeTerm.value} 语言学深度报告`, `${activeTerm.value} linguistic report`)} onClose={() => setActiveTerm(null)}>
          <header className="modal-header term-modal-header">
            <div><small>{activeTerm.language} · TERM INSPECTION</small><h2>{activeTerm.value}</h2><p>{ui(`${subject.name}语境`, `${subject.nameEn} context`)} · {voiceProfileForLanguage(activeTerm.language).role}</p></div>
            <button type="button" onClick={() => setActiveTerm(null)} aria-label={ui("关闭", "Close")}>×</button>
          </header>
          <div className="term-report-grid">
            {([
              [ui("学术定义", "Definition"), "DEFINITION", termReport.definition, locale === "en" ? "EN" : "CN"],
              [ui("词源与构词", "Etymology"), "ETYMOLOGY", termReport.etymology, locale === "en" ? "EN" : "CN"],
              [ui("语法属性", "Grammar"), "GRAMMAR", termReport.grammar, locale === "en" ? "EN" : "CN"],
              [ui("语义微析", "Nuance"), "NUANCE", termReport.nuance, locale === "en" ? "EN" : "CN"],
            ] as Array<[string, string, string, LanguageCode]>).map(([title, en, value, language]) => (
              <section key={en}><header><span>{title}<small>{en}</small></span><button type="button" onClick={() => void speak(value, language)}>♪</button></header><p>{value}</p></section>
            ))}
            <section className="term-example"><header><span>{ui("经典例句", "Academic example")}<small>ACADEMIC EXAMPLE</small></span><button type="button" onClick={() => void speak(termReport.example, activeTerm.language)}>▶</button></header><blockquote><p>{termReport.example}</p><cite>{termReport.translation}</cite></blockquote></section>
          </div>
          <nav className="wikipedia-links" aria-label={ui("维基百科深度链接", "Wikipedia deep links")}>
            <span>{ui("在维基百科继续探索", "Continue on Wikipedia")}</span>
            {ALL_LANGUAGE_CODES.map((language) => <a href={wikipediaHref(activeTerm.value, language)} target="_blank" rel="noreferrer" key={language}>{language} Wikipedia ↗</a>)}
          </nav>
          <footer className="term-modal-footer"><span className={termLoading ? "loading" : ""} /><p>{termLoading ? ui("正在尝试获取实时语言学报告…", "Fetching a live linguistic report…") : ui("内置报告可离线使用；术语已连接八语维基百科检索。", "The built-in report works offline; the term links to eight Wikipedia editions.")}</p></footer>
        </ModalShell>
      )}

      {notebookOpen && (
        <ModalShell label={ui("多语备忘录", "Multilingual notebook")} onClose={() => setNotebookOpen(false)} wide>
          <header className="modal-header notebook-header">
            <div><small>LOCAL NOTEBOOK</small><h2>{ui("多语备忘录", "Multilingual notebook")}</h2><p>{ui("仅保存在当前设备 · 自动保存", "Stored only on this device · autosaved")}</p></div>
            <button type="button" onClick={() => setNotebookOpen(false)} aria-label={ui("关闭", "Close")}>×</button>
          </header>
          <div className="notebook-body">
            <aside className="notes-list">
              <div className="notes-tools"><label><span>⌕</span><input value={noteSearch} onChange={(event) => setNoteSearch(event.target.value)} placeholder={ui("搜索笔记", "Search notes")} /></label><button type="button" onClick={createNote}>＋</button></div>
              <div className="notes-scroll">
                {filteredNotes.map((note) => (
                  <button type="button" className={note.id === activeNoteId ? "active" : ""} key={note.id} onClick={() => setActiveNoteId(note.id)}>
                    <strong>{note.title || ui("未命名笔记", "Untitled note")}</strong><p>{note.body || ui("开始记录…", "Start writing…")}</p><span>{locale === "en" ? SUBJECTS.find((item) => item.id === note.subject)?.nameEn : SUBJECTS.find((item) => item.id === note.subject)?.name} · {new Date(note.updatedAt).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN")}</span>
                  </button>
                ))}
              </div>
            </aside>
            <section className="note-editor">
              {activeNote && <>
                <header><span>{SUBJECTS.find((item) => item.id === activeNote.subject)?.campaign} · {locale === "en" ? SUBJECTS.find((item) => item.id === activeNote.subject)?.nameEn : SUBJECTS.find((item) => item.id === activeNote.subject)?.name}</span><button type="button" onClick={deleteActiveNote}>{ui("删除", "Delete")}</button></header>
                <input value={activeNote.title} onChange={(event) => updateActiveNote({ title: event.target.value })} aria-label={ui("笔记标题", "Note title")} />
                <textarea value={activeNote.body} onChange={(event) => updateActiveNote({ body: event.target.value })} aria-label={ui("笔记正文", "Note body")} placeholder={ui("记录概念、词源、例句与仍未解决的问题…", "Record concepts, etymologies, examples and open questions…")} />
                <footer><span>CN · EN → FR · DE · IT</span><small>{ui(`${activeNote.body.length} 字符 · 已保存在本地`, `${activeNote.body.length} characters · saved locally`)}</small></footer>
              </>}
            </section>
          </div>
        </ModalShell>
      )}

      {toast && <div className="academy-toast" role="status"><span />{toast}</div>}
    </main>
  );
}
