import type { LanguageCode } from "./academy-data";

export type VoiceProfile = {
  role: string;
  cloudVoice: string;
  locale: string;
};

export type AudioCapability = {
  mode: "openai" | "external" | "device";
  cloudReady: boolean;
  label: string;
};

export type PlaybackInfo = {
  engine: "neural" | "device" | "stopped";
  voice: string;
  label: string;
  sampleRate?: number;
};

const VOICE_PROFILES: Record<LanguageCode, VoiceProfile> = {
  CN: { role: "中文讲师", cloudVoice: "Marin", locale: "zh-CN" },
  EN: { role: "English Lecturer", cloudVoice: "Cedar", locale: "en-US" },
  FR: { role: "Professeure", cloudVoice: "Coral", locale: "fr-FR" },
  DE: { role: "Dozent", cloudVoice: "Sage", locale: "de-DE" },
};

const PREFERRED_DEVICE_VOICES: Record<LanguageCode, string[]> = {
  CN: ["Tingting", "Ting-Ting", "Meijia", "Sin-ji", "Xiaoxiao"],
  EN: ["Ava", "Samantha", "Serena", "Daniel", "Karen", "Moira"],
  FR: ["Audrey", "Amélie", "Aurelie", "Thomas", "Marie"],
  DE: ["Anna", "Petra", "Markus", "Yannick"],
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

type CachedAudio = {
  buffer: AudioBuffer;
  engine: string;
  voice: string;
  sampleRate: number;
};

type SpeechChunk = {
  text: string;
  language: LanguageCode;
};

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
    try {
      currentSource.stop();
    } catch {
      // The source may already have ended.
    }
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

function decodePcm16(bytes: ArrayBuffer, audioContext: AudioContext) {
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const view = new DataView(bytes);
  const audioBuffer = audioContext.createBuffer(1, sampleCount, 24_000);
  const channel = audioBuffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = view.getInt16(index * 2, true) / 32_768;
  }
  return audioBuffer;
}

async function loadAudio(text: string, language: LanguageCode) {
  const key = `${language}:${text}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!response.ok) throw new Error("speech provider unavailable");

  const bytes = await response.arrayBuffer();
  const audioContext = getContext();
  const contentType = response.headers.get("content-type") || "";
  const rawPcm = response.headers.get("x-audio-encoding") === "signed-int16-little-endian";
  const buffer = rawPcm || contentType.includes("pcm") || contentType.includes("octet-stream")
    ? decodePcm16(bytes, audioContext)
    : await audioContext.decodeAudioData(bytes.slice(0));
  const result = {
    buffer,
    engine: response.headers.get("x-tts-engine") || "neural",
    voice: response.headers.get("x-tts-voice") || VOICE_PROFILES[language].cloudVoice,
    sampleRate: Number(response.headers.get("x-audio-sample-rate")) || buffer.sampleRate,
  };
  cache.set(key, result);
  return result;
}

function inferLatinLanguage(value: string): LanguageCode {
  if (/\b(?:Schuld|Schulden|Es|Ich|Über-Ich|Aufhebung|Dasein|Nichts|Schuldentragfähigkeit|verbindlich|Algorithmus|Tragödie|Nachahmung|Handlung)\b/i.test(value)) return "DE";
  if (/\b(?:terroir|dette|créance|enjeu|surmoi|tragédie|néant|soutenabilité|impressionnisme)\b/i.test(value)) return "FR";
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
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/([。！？!?；;：:])(?=\S)/g, "$1 ")
    .trim();
  const sentences = normalized.match(/[^。！？!?；;：:]+[。！？!?；;：:]?/g) || [normalized];
  const chunks: SpeechChunk[] = [];

  for (const sentence of sentences) {
    for (const piece of splitLongChunk(sentence.trim())) {
      if (baseLanguage !== "CN") {
        if (piece) chunks.push({ text: piece, language: baseLanguage });
        continue;
      }

      const parts = piece.split(/([A-Za-zÀ-ÖØ-öø-ÿŒœÆæÄÖÜäöüß][A-Za-zÀ-ÖØ-öø-ÿŒœÆæÄÖÜäöüß'’\- ]{1,80})/g);
      for (const part of parts) {
        const value = part.trim();
        if (!value) continue;
        const isLatin = /^[A-Za-zÀ-ÖØ-öø-ÿŒœÆæÄÖÜäöüß]/.test(value);
        chunks.push({ text: value, language: isLatin ? inferLatinLanguage(value) : "CN" });
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
  const preferredIndex = PREFERRED_DEVICE_VOICES[language]
    .findIndex((name) => voice.name.toLowerCase().includes(name.toLowerCase()));
  if (preferredIndex >= 0) score += 35 - preferredIndex * 3;
  if (NOVELTY_VOICE.test(voice.name)) score -= 200;
  return score;
}

function selectDeviceVoice(voices: SpeechSynthesisVoice[], language: LanguageCode) {
  const ranked = [...voices]
    .map((voice) => ({ voice, score: scoreVoice(voice, language) }))
    .filter((entry) => entry.score > -1_000)
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.voice;
}

function utteranceSettings(language: LanguageCode) {
  if (language === "CN") return { rate: 0.92, pitch: 1 };
  if (language === "FR") return { rate: 0.9, pitch: 1.02 };
  if (language === "DE") return { rate: 0.88, pitch: 0.96 };
  return { rate: 0.91, pitch: 0.99 };
}

async function speakOnDevice(
  text: string,
  language: LanguageCode,
  key: string,
  onEnd?: () => void,
): Promise<PlaybackInfo> {
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
    const chunk = chunks[index];
    index += 1;
    if (!chunk) {
      finish();
      return;
    }

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
  return {
    engine: "device",
    voice: primaryVoice?.name || `系统默认 ${VOICE_PROFILES[language].locale}`,
    label: "设备增强声线",
  };
}

export async function playSpeech(options: {
  text: string;
  language: LanguageCode;
  onEnd?: () => void;
}): Promise<PlaybackInfo> {
  const spokenText = options.text.trim();
  const key = `${options.language}:${spokenText}`;
  if (!spokenText) return { engine: "stopped", voice: "", label: "已停止" };
  if (currentKey === key) {
    stopCurrent();
    options.onEnd?.();
    return { engine: "stopped", voice: "", label: "已停止" };
  }

  stopCurrent();
  currentKey = key;
  if (knownCapability?.mode === "device") {
    return speakOnDevice(spokenText, options.language, key, options.onEnd);
  }
  const audioContext = getContext();
  const resume = audioContext.resume().catch(() => undefined);
  try {
    const audio = await loadAudio(spokenText, options.language);
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
    return {
      engine: "neural",
      voice: audio.voice,
      label: audio.engine === "openai" ? "AI 神经原声" : "外部神经原声",
      sampleRate: audio.sampleRate,
    };
  } catch {
    if (currentKey !== key) return { engine: "stopped", voice: "", label: "已停止" };
    return speakOnDevice(spokenText, options.language, key, options.onEnd);
  }
}

export function stopSpeech() {
  stopCurrent();
}

export function voiceProfileForLanguage(language: LanguageCode) {
  return VOICE_PROFILES[language];
}

export async function getAudioCapability(): Promise<AudioCapability> {
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
