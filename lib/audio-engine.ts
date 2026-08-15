import type { LanguageCode } from "./academy-data";
import { getOfflineVoiceState, offlineVoicePackFor, synthesizeOfflineSpeech } from "./offline-voice-engine";

export type SpeechProviderId = "gemini" | "qwen" | "fish" | "openai";
export type SpeechConnection = {
  provider: SpeechProviderId;
  apiKey: string;
  model?: string;
  region?: "international" | "china";
  voiceId?: string;
};
export type SpeechSessionState = {
  activeProvider: SpeechProviderId | null;
  connections: Partial<Record<SpeechProviderId, SpeechConnection>>;
};
export type VoiceProfile = {
  role: string;
  cloudVoice: string;
  geminiVoice: string;
  qwenVoice: string;
  openaiVoice: string;
  locale: string;
};
export type AudioCapability = {
  mode: SpeechProviderId | "external" | "device";
  cloudReady: boolean;
  label: string;
};
export type PlaybackInfo = {
  engine: "neural" | "offline" | "device" | "stopped";
  voice: string;
  label: string;
  sampleRate?: number;
};

const PROVIDER_LABELS: Record<SpeechProviderId, string> = {
  gemini: "Gemini 原生语音",
  qwen: "Qwen3 多语语音",
  fish: "Fish Audio S2 Pro",
  openai: "OpenAI 原生语音",
};
const VOICE_PROFILES: Record<LanguageCode, VoiceProfile> = {
  CN: { role: "中文讲师", cloudVoice: "Marin", geminiVoice: "Kore", qwenVoice: "Serena", openaiVoice: "marin", locale: "zh-CN" },
  EN: { role: "English Lecturer", cloudVoice: "Cedar", geminiVoice: "Puck", qwenVoice: "Jennifer", openaiVoice: "cedar", locale: "en-US" },
  FR: { role: "Professeure", cloudVoice: "Coral", geminiVoice: "Charon", qwenVoice: "Emilien", openaiVoice: "coral", locale: "fr-FR" },
  DE: { role: "Dozent", cloudVoice: "Sage", geminiVoice: "Fenrir", qwenVoice: "Lenn", openaiVoice: "sage", locale: "de-DE" },
  IT: { role: "Docente", cloudVoice: "Coral", geminiVoice: "Aoede", qwenVoice: "Serena", openaiVoice: "coral", locale: "it-IT" },
  ES: { role: "Profesora", cloudVoice: "Coral", geminiVoice: "Aoede", qwenVoice: "Serena", openaiVoice: "coral", locale: "es-ES" },
  KO: { role: "한국어 강사", cloudVoice: "Marin", geminiVoice: "Kore", qwenVoice: "Serena", openaiVoice: "marin", locale: "ko-KR" },
  JA: { role: "日本語講師", cloudVoice: "Cedar", geminiVoice: "Aoede", qwenVoice: "Serena", openaiVoice: "cedar", locale: "ja-JP" },
};
const SPEECH_SESSION_KEY = "deep-language-expert-speech-connections-session-v2";
const LEGACY_SPEECH_SESSION_KEYS = [
  "deep-voice-expert-speech-connections-session-v2",
  "omnimedia-speech-connections-session-v2",
];
const LEGACY_GEMINI_SESSION_KEY = "omnimedia-gemini-api-key-session-v1";
const PREFERRED_DEVICE_VOICES: Record<LanguageCode, string[]> = {
  CN: ["Tingting", "Ting-Ting", "Meijia", "Sin-ji", "Xiaoxiao"],
  EN: ["Ava", "Samantha", "Serena", "Daniel", "Karen", "Moira"],
  FR: ["Audrey", "Amélie", "Aurelie", "Thomas", "Marie"],
  DE: ["Anna", "Petra", "Markus", "Yannick"],
  IT: ["Alice", "Elsa", "Federica", "Luca", "Paola"],
  ES: ["Mónica", "Monica", "Jorge", "Paulina", "Marisol", "Helena"],
  KO: ["Yuna", "Narae", "Sora", "Suhyun"],
  JA: ["Kyoko", "Otoya", "Hattori", "Haruka", "Nanami"],
};
const NOVELTY_VOICE = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Pipe Organ|Trinoids|Whisper|Zarvox/i;

class LruCache<T> {
  private values = new Map<string, T>();
  constructor(private readonly limit = 24) {}
  get(key: string) {
    const value = this.values.get(key);
    if (!value) return undefined;
    this.values.delete(key);
    this.values.set(key, value);
    return value;
  }
  set(key: string, value: T) {
    this.values.delete(key);
    this.values.set(key, value);
    if (this.values.size > this.limit) {
      const oldest = this.values.keys().next().value as string | undefined;
      if (oldest) this.values.delete(oldest);
    }
  }
}

type CachedAudio = { buffer: AudioBuffer; engine: string; voice: string; sampleRate: number };
type SpeechChunk = { text: string; language: LanguageCode };
let context: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentKey: string | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentPauseTimer: number | null = null;
let knownCapability: AudioCapability | null = null;
const cache = new LruCache<CachedAudio>(24);

function getContext() {
  context ||= new AudioContext();
  return context;
}

function stopCurrent() {
  if (currentSource) {
    currentSource.onended = null;
    try { currentSource.stop(); } catch { /* It may already have ended. */ }
    currentSource = null;
  }
  if (currentPauseTimer !== null) {
    window.clearTimeout(currentPauseTimer);
    currentPauseTimer = null;
  }
  if (currentUtterance && "speechSynthesis" in window) {
    currentUtterance.onend = null;
    currentUtterance.onerror = null;
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
  currentKey = null;
}

function decodePcm16(bytes: ArrayBuffer, audioContext: AudioContext, sampleRate = 24_000) {
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const view = new DataView(bytes);
  const audioBuffer = audioContext.createBuffer(1, sampleCount, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = view.getInt16(index * 2, true) / 32_768;
  }
  return audioBuffer;
}

function emptySpeechState(): SpeechSessionState {
  return { activeProvider: null, connections: {} };
}

export function getSessionSpeechState(): SpeechSessionState {
  if (typeof window === "undefined") return emptySpeechState();
  try {
    const raw = window.sessionStorage.getItem(SPEECH_SESSION_KEY)
      || LEGACY_SPEECH_SESSION_KEYS.map((key) => window.sessionStorage.getItem(key)).find(Boolean);
    if (raw) {
      const parsed = JSON.parse(raw) as SpeechSessionState;
      window.sessionStorage.setItem(SPEECH_SESSION_KEY, raw);
      LEGACY_SPEECH_SESSION_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
      return { activeProvider: parsed.activeProvider || null, connections: parsed.connections || {} };
    }
    const legacyKey = window.sessionStorage.getItem(LEGACY_GEMINI_SESSION_KEY)?.trim();
    if (legacyKey) {
      const migrated: SpeechSessionState = {
        activeProvider: "gemini",
        connections: { gemini: { provider: "gemini", apiKey: legacyKey, model: "gemini-3.1-flash-tts-preview" } },
      };
      window.sessionStorage.setItem(SPEECH_SESSION_KEY, JSON.stringify(migrated));
      window.sessionStorage.removeItem(LEGACY_GEMINI_SESSION_KEY);
      return migrated;
    }
  } catch {
    // Session storage can be unavailable in strict private browsing.
  }
  return emptySpeechState();
}

function writeSpeechState(state: SpeechSessionState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SPEECH_SESSION_KEY, JSON.stringify(state));
  knownCapability = state.activeProvider
    ? { mode: state.activeProvider, cloudReady: true, label: PROVIDER_LABELS[state.activeProvider] }
    : null;
}

export function setSessionSpeechConnection(connection: SpeechConnection) {
  const apiKey = connection.apiKey.trim();
  if (!apiKey) throw new Error("请输入 API Key。");
  const state = getSessionSpeechState();
  writeSpeechState({
    activeProvider: connection.provider,
    connections: { ...state.connections, [connection.provider]: { ...connection, apiKey } },
  });
}

export function clearSessionSpeechConnection(provider: SpeechProviderId) {
  const state = getSessionSpeechState();
  const connections = { ...state.connections };
  delete connections[provider];
  const remaining = Object.keys(connections)[0] as SpeechProviderId | undefined;
  writeSpeechState({
    activeProvider: state.activeProvider === provider ? remaining || null : state.activeProvider,
    connections,
  });
  stopCurrent();
}

export function setActiveSpeechProvider(provider: SpeechProviderId) {
  const state = getSessionSpeechState();
  if (!state.connections[provider]) throw new Error("请先连接这个语音服务。");
  writeSpeechState({ ...state, activeProvider: provider });
  stopCurrent();
}

export function speechProviderLabel(provider: SpeechProviderId) {
  return PROVIDER_LABELS[provider];
}

export function voiceNameForConnection(language: LanguageCode, connection?: SpeechConnection) {
  const profile = VOICE_PROFILES[language];
  if (!connection) return "自动选择设备最佳声线";
  if (connection.provider === "gemini") return profile.geminiVoice;
  if (connection.provider === "qwen") return profile.qwenVoice;
  if (connection.provider === "openai") return profile.openaiVoice;
  return connection.voiceId?.trim() || "S2 Pro 默认声线";
}

async function loadAudio(text: string, language: LanguageCode, connection?: SpeechConnection) {
  const providerKey = connection
    ? `${connection.provider}:${connection.model || "default"}:${connection.region || "default"}:${connection.voiceId || "default"}`
    : "service";
  const key = `${providerKey}:${language}:${text}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(connection ? {
        "X-TTS-Provider": connection.provider,
        "X-TTS-API-Key": connection.apiKey,
        ...(connection.model ? { "X-TTS-Model": connection.model } : {}),
        ...(connection.region ? { "X-TTS-Region": connection.region } : {}),
        ...(connection.voiceId ? { "X-TTS-Voice-ID": connection.voiceId } : {}),
      } : {}),
    },
    body: JSON.stringify({ text, language }),
  });
  if (!response.ok) {
    let message = "语音服务暂时不可用。";
    try {
      const error = await response.json() as { message?: string };
      if (error.message) message = error.message;
    } catch { /* Keep the safe message. */ }
    throw new Error(message);
  }
  const bytes = await response.arrayBuffer();
  const audioContext = getContext();
  const contentType = response.headers.get("content-type") || "";
  const sampleRate = Number(response.headers.get("x-audio-sample-rate")) || 24_000;
  const rawPcm = response.headers.get("x-audio-encoding") === "signed-int16-little-endian" || contentType.includes("pcm");
  const buffer = rawPcm
    ? decodePcm16(bytes, audioContext, sampleRate)
    : await audioContext.decodeAudioData(bytes.slice(0));
  const result = {
    buffer,
    engine: response.headers.get("x-tts-engine") || "neural",
    voice: response.headers.get("x-tts-voice") || voiceNameForConnection(language, connection),
    sampleRate: Number(response.headers.get("x-audio-sample-rate")) || buffer.sampleRate,
  };
  cache.set(key, result);
  return result;
}

function inferLatinLanguage(value: string): LanguageCode {
  if (/\b(?:Schuld|Schulden|Es|Ich|Über-Ich|Aufhebung|Dasein|Nichts|Schuldentragfähigkeit|verbindlich|Algorithmus|Tragödie|Nachahmung|Handlung)\b/i.test(value)) return "DE";
  if (/\b(?:terroir|dette|créance|enjeu|surmoi|tragédie|néant|soutenabilité|impressionnisme)\b/i.test(value)) return "FR";
  if (/\b(?:debito|obbligazione|conto|vorrei|catarsi|tragedia|algoritmo|complessità|superamento|dialettico|luce|impressione)\b/i.test(value)) return "IT";
  if (/\b(?:deuda|obligación|cuenta|quisiera|catarsis|tragedia|algoritmo|complejidad|superación|dialéctica|luz|impresión|sostenibilidad)\b/i.test(value)) return "ES";
  if (/[äöüß]/i.test(value)) return "DE";
  if (/[àâçéèêëîïôûùüÿœæ]/i.test(value)) return "FR";
  return "EN";
}

function splitLongChunk(value: string, maxLength = 180) {
  if (value.length <= maxLength) return [value];
  const pieces: string[] = [];
  let remaining = value.trim();
  while (remaining.length > maxLength) {
    const candidate = remaining.slice(0, maxLength);
    const boundary = Math.max(candidate.lastIndexOf("，"), candidate.lastIndexOf(","), candidate.lastIndexOf(" "));
    const cut = boundary > maxLength * 0.55 ? boundary + 1 : maxLength;
    pieces.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) pieces.push(remaining);
  return pieces;
}

function speechChunks(text: string, baseLanguage: LanguageCode): SpeechChunk[] {
  const normalized = text.replace(/\s+/g, " ").replace(/([。！？!?；;：:])(?=\S)/g, "$1 ").trim();
  const sentences = normalized.match(/[^。！？!?；;：:]+[。！？!?；;：:]?/g) || [normalized];
  const chunks: SpeechChunk[] = [];
  for (const sentence of sentences) {
    for (const piece of splitLongChunk(sentence.trim())) {
      if (baseLanguage !== "CN") {
        if (piece) chunks.push({ text: piece, language: baseLanguage });
        continue;
      }
      const parts = piece.split(/([A-Za-zÀ-ÖØ-öø-ÿŒœÆæÄÖÜäöüß][A-Za-zÀ-ÖØ-öø-ÿŒœÆæÄÖÜäöüß'’\- ]{1,80}|[\uac00-\ud7af][\uac00-\ud7af\s]{1,80}|[\u3040-\u30ff\u31f0-\u31ff][\u3040-\u30ff\u31f0-\u31ff\u3400-\u9fff々〆ヵヶー・\s]{1,80})/g);
      for (const part of parts) {
        const value = part.trim();
        if (!value) continue;
        const language = /^[A-Za-zÀ-ÖØ-öø-ÿŒœÆæÄÖÜäöüß]/.test(value)
          ? inferLatinLanguage(value)
          : /[\uac00-\ud7af]/.test(value)
            ? "KO"
            : /[\u3040-\u30ff\u31f0-\u31ff]/.test(value)
              ? "JA"
              : "CN";
        chunks.push({ text: value, language });
      }
    }
  }
  return chunks;
}

async function loadDeviceVoices() {
  if (!("speechSynthesis" in window)) return [];
  const immediate = window.speechSynthesis.getVoices();
  if (immediate.length) return immediate;
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    window.setTimeout(finish, 900);
  });
}

function scoreVoice(voice: SpeechSynthesisVoice, language: LanguageCode) {
  const profile = VOICE_PROFILES[language];
  const voiceLang = voice.lang.toLowerCase();
  const locale = profile.locale.toLowerCase();
  const searchable = `${voice.name} ${voice.voiceURI}`;
  let score = 0;
  if (voiceLang === locale) score += 120;
  else if (voiceLang.startsWith(locale.slice(0, 2))) score += 75;
  else return -1_000;
  if (/premium|enhanced|natural|neural/i.test(searchable)) score += 45;
  if (voice.localService) score += 10;
  if (voice.default) score += 4;
  const preferredIndex = PREFERRED_DEVICE_VOICES[language].findIndex((name) => voice.name.toLowerCase().includes(name.toLowerCase()));
  if (preferredIndex >= 0) score += 35 - preferredIndex * 3;
  if (NOVELTY_VOICE.test(voice.name)) score -= 200;
  return score;
}

function selectDeviceVoice(voices: SpeechSynthesisVoice[], language: LanguageCode) {
  return [...voices]
    .map((voice) => ({ voice, score: scoreVoice(voice, language) }))
    .filter((entry) => entry.score > -1_000)
    .sort((left, right) => right.score - left.score)[0]?.voice;
}

function utteranceSettings(language: LanguageCode) {
  if (language === "CN") return { rate: 0.92, pitch: 1 };
  if (language === "FR") return { rate: 0.9, pitch: 1.02 };
  if (language === "DE") return { rate: 0.88, pitch: 0.96 };
  if (language === "IT") return { rate: 0.9, pitch: 1.01 };
  if (language === "ES") return { rate: 0.9, pitch: 1.01 };
  if (language === "KO") return { rate: 0.9, pitch: 1 };
  if (language === "JA") return { rate: 0.9, pitch: 1 };
  return { rate: 0.91, pitch: 0.99 };
}

async function speakOnDevice(text: string, language: LanguageCode, key: string, onEnd?: () => void): Promise<PlaybackInfo> {
  if (!("speechSynthesis" in window)) throw new Error("speech unsupported");
  const voices = await loadDeviceVoices();
  if (currentKey !== key) return { engine: "stopped", voice: "", label: "已停止" };
  const chunks = speechChunks(text, language);
  const primaryVoice = selectDeviceVoice(voices, language);
  let index = 0;
  const finish = () => {
    if (currentKey !== key) return;
    currentKey = null;
    currentUtterance = null;
    currentPauseTimer = null;
    onEnd?.();
  };
  const speakNext = () => {
    if (currentKey !== key) return;
    const chunk = chunks[index++];
    if (!chunk) return finish();
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    const profile = VOICE_PROFILES[chunk.language];
    const settings = utteranceSettings(chunk.language);
    utterance.lang = profile.locale;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = 1;
    const selected = selectDeviceVoice(voices, chunk.language);
    if (selected) utterance.voice = selected;
    const advance = () => {
      if (currentKey !== key) return;
      currentUtterance = null;
      currentPauseTimer = window.setTimeout(speakNext, 65);
    };
    utterance.onend = advance;
    utterance.onerror = advance;
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  };
  speakNext();
  return { engine: "device", voice: primaryVoice?.name || `系统默认 ${VOICE_PROFILES[language].locale}`, label: "设备增强声线" };
}

async function loadOfflineAudio(text: string, language: LanguageCode, allowDisabled = false) {
  const key = `offline:${language}:${text}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const chunks = speechChunks(text, language);
  const rendered: Array<{ audio: Float32Array; sampleRate: number }> = [];
  for (const chunk of chunks) {
    rendered.push(await synthesizeOfflineSpeech(chunk.text, chunk.language, allowDisabled));
  }
  const sampleRate = rendered[0]?.sampleRate || 16_000;
  const pauseSamples = Math.round(sampleRate * 0.055);
  const sampleCount = rendered.reduce((total, part, index) => total + part.audio.length + (index ? pauseSamples : 0), 0);
  const audioContext = getContext();
  const buffer = audioContext.createBuffer(1, sampleCount, sampleRate);
  const channel = buffer.getChannelData(0);
  let offset = 0;
  rendered.forEach((part, index) => {
    if (index) offset += pauseSamples;
    channel.set(part.audio, offset);
    offset += part.audio.length;
  });
  const result = {
    buffer,
    engine: "offline",
    voice: offlineVoicePackFor(language)?.name || VOICE_PROFILES[language].role,
    sampleRate,
  };
  cache.set(key, result);
  return result;
}

export async function playOfflineSpeech(options: { text: string; language: LanguageCode; onEnd?: () => void }): Promise<PlaybackInfo> {
  const spokenText = options.text.trim();
  const state = getOfflineVoiceState();
  if (!spokenText) return { engine: "stopped", voice: "", label: "已停止" };
  if (!state.installed[options.language]) throw new Error("请先下载对应语言的离线语音包。");

  const key = `offline-preview:${options.language}:${spokenText}`;
  if (currentKey === key) {
    stopCurrent();
    options.onEnd?.();
    return { engine: "stopped", voice: "", label: "已停止" };
  }

  stopCurrent();
  currentKey = key;
  const audioContext = getContext();
  const audio = await loadOfflineAudio(spokenText, options.language, true);
  if (currentKey !== key) return { engine: "stopped", voice: "", label: "已停止" };
  await audioContext.resume().catch(() => undefined);
  const source = audioContext.createBufferSource();
  source.buffer = audio.buffer;
  source.connect(audioContext.destination);
  source.onended = () => {
    if (currentKey === key) currentKey = null;
    currentSource = null;
    options.onEnd?.();
  };
  currentSource = source;
  source.start();
  return { engine: "offline", voice: audio.voice, label: "本地 ONNX 语音包", sampleRate: audio.sampleRate };
}

export async function playSpeech(options: { text: string; language: LanguageCode; onEnd?: () => void }): Promise<PlaybackInfo> {
  const spokenText = options.text.trim();
  if (options.language === "CN") throw new Error("中文语音已停用；中文保留为解释与界面语言。");
  const session = getSessionSpeechState();
  const connection = session.activeProvider ? session.connections[session.activeProvider] : undefined;
  const offlineState = getOfflineVoiceState();
  const offlineReady = !connection
    && offlineState.enabled
    && Boolean(offlineState.installed[options.language]);
  const key = `${connection?.provider || (offlineReady ? "offline" : "device")}:${options.language}:${spokenText}`;
  if (!spokenText) return { engine: "stopped", voice: "", label: "已停止" };
  if (currentKey === key) {
    stopCurrent();
    options.onEnd?.();
    return { engine: "stopped", voice: "", label: "已停止" };
  }
  stopCurrent();
  currentKey = key;
  if (offlineReady) {
    try {
      const audioContext = getContext();
      const audio = await loadOfflineAudio(spokenText, options.language);
      if (currentKey !== key) return { engine: "stopped", voice: "", label: "已停止" };
      await audioContext.resume().catch(() => undefined);
      const source = audioContext.createBufferSource();
      source.buffer = audio.buffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        if (currentKey === key) currentKey = null;
        currentSource = null;
        options.onEnd?.();
      };
      currentSource = source;
      source.start();
      return { engine: "offline", voice: audio.voice, label: "本地 ONNX 语音包", sampleRate: audio.sampleRate };
    } catch {
      if (currentKey !== key) return { engine: "stopped", voice: "", label: "已停止" };
      return speakOnDevice(spokenText, options.language, key, options.onEnd);
    }
  }
  if (!connection && knownCapability?.mode === "device") return speakOnDevice(spokenText, options.language, key, options.onEnd);
  const audioContext = getContext();
  const resume = audioContext.resume().catch(() => undefined);
  try {
    const audio = await loadAudio(spokenText, options.language, connection);
    if (currentKey !== key) return { engine: "stopped", voice: "", label: "已停止" };
    await resume;
    const source = audioContext.createBufferSource();
    source.buffer = audio.buffer;
    source.connect(audioContext.destination);
    source.onended = () => {
      if (currentKey === key) currentKey = null;
      currentSource = null;
      options.onEnd?.();
    };
    currentSource = source;
    source.start();
    return { engine: "neural", voice: audio.voice, label: connection ? PROVIDER_LABELS[connection.provider] : "AI 神经原声", sampleRate: audio.sampleRate };
  } catch (error) {
    if (currentKey !== key) return { engine: "stopped", voice: "", label: "已停止" };
    if (connection) {
      stopCurrent();
      throw error;
    }
    return speakOnDevice(spokenText, options.language, key, options.onEnd);
  }
}

export function stopSpeech() { stopCurrent(); }
export function voiceProfileForLanguage(language: LanguageCode) { return VOICE_PROFILES[language]; }

export async function getAudioCapability(): Promise<AudioCapability> {
  const session = getSessionSpeechState();
  if (session.activeProvider && session.connections[session.activeProvider]) {
    knownCapability = { mode: session.activeProvider, cloudReady: true, label: PROVIDER_LABELS[session.activeProvider] };
    return knownCapability;
  }
  try {
    const response = await fetch("/api/tts", { cache: "no-store" });
    if (!response.ok) throw new Error("status unavailable");
    knownCapability = await response.json() as AudioCapability;
    return knownCapability;
  } catch {
    knownCapability = { mode: "device", cloudReady: false, label: "设备增强声线" };
    return knownCapability;
  }
}
