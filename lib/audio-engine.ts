import type { LanguageCode } from "./academy-data";

const VOICE_BY_LANGUAGE: Record<LanguageCode, string> = {
  CN: "Kore",
  EN: "Puck",
  FR: "Charon",
  DE: "Fenrir",
};

const LOCALE_BY_LANGUAGE: Record<LanguageCode, string> = {
  CN: "zh-CN",
  EN: "en-US",
  FR: "fr-FR",
  DE: "de-DE",
};

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

type PlayResult = "remote" | "device" | "stopped";

let context: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentKey: string | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
const cache = new LruCache<AudioBuffer>(24);

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
  if (currentUtterance && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
  currentKey = null;
}

function decodePcm16(bytes: ArrayBuffer, audioContext: AudioContext) {
  const samples = new Int16Array(bytes);
  const audioBuffer = audioContext.createBuffer(1, samples.length, 24_000);
  const channel = audioBuffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    channel[index] = samples[index] / 32_768;
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
    body: JSON.stringify({
      text,
      language,
      voice: VOICE_BY_LANGUAGE[language],
      direction: "原生、清晰、低延迟的学术朗读",
    }),
  });
  if (!response.ok) throw new Error("speech provider unavailable");

  const bytes = await response.arrayBuffer();
  const audioContext = getContext();
  const contentType = response.headers.get("content-type") || "";
  const rawPcm = response.headers.get("x-audio-encoding") === "signed-int16-little-endian";
  const audioBuffer = rawPcm || contentType.includes("pcm") || contentType.includes("octet-stream")
    ? decodePcm16(bytes, audioContext)
    : await audioContext.decodeAudioData(bytes.slice(0));
  cache.set(key, audioBuffer);
  return audioBuffer;
}

function speakOnDevice(
  text: string,
  language: LanguageCode,
  key: string,
  onEnd?: () => void,
) {
  if (!("speechSynthesis" in window)) throw new Error("speech unsupported");
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LOCALE_BY_LANGUAGE[language];
  utterance.rate = language === "CN" ? 0.94 : 0.9;
  const preferred = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()));
  if (preferred) utterance.voice = preferred;
  utterance.onend = () => {
    if (currentKey === key) currentKey = null;
    currentUtterance = null;
    onEnd?.();
  };
  utterance.onerror = utterance.onend;
  currentUtterance = utterance;
  currentKey = key;
  window.speechSynthesis.speak(utterance);
}

export async function playSpeech(options: {
  text: string;
  language: LanguageCode;
  onEnd?: () => void;
}): Promise<PlayResult> {
  const text = options.text.trim();
  const key = `${options.language}:${text}`;
  if (!text) return "stopped";
  if (currentKey === key) {
    stopCurrent();
    options.onEnd?.();
    return "stopped";
  }

  stopCurrent();
  currentKey = key;
  try {
    const audioBuffer = await loadAudio(text, options.language);
    if (currentKey !== key) return "stopped";
    const audioContext = getContext();
    await audioContext.resume();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => {
      if (currentKey === key) currentKey = null;
      currentSource = null;
      options.onEnd?.();
    };
    currentSource = source;
    source.start();
    return "remote";
  } catch {
    if (currentKey !== key) return "stopped";
    speakOnDevice(text, options.language, key, options.onEnd);
    return "device";
  }
}

export function stopSpeech() {
  stopCurrent();
}

export function voiceForLanguage(language: LanguageCode) {
  return VOICE_BY_LANGUAGE[language];
}
