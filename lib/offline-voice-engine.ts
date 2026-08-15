import type { LanguageCode } from "./academy-data";

export type OfflineVoicePack = {
  language: LanguageCode;
  name: string;
  locale: string;
  model: string;
  size: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  description: string;
  descriptionEn: string;
};

export type OfflineVoiceState = {
  enabled: boolean;
  installed: Partial<Record<LanguageCode, boolean>>;
};

type WorkerResponse = {
  id: string;
  type: "progress" | "ready" | "audio" | "error";
  language: LanguageCode;
  progress?: number;
  loaded?: number;
  total?: number;
  audio?: Float32Array;
  sampleRate?: number;
  message?: string;
};

type PendingRequest = {
  resolve: (value: { audio?: Float32Array; sampleRate?: number }) => void;
  reject: (reason: Error) => void;
  onProgress?: (progress: number, loaded: number, total: number) => void;
};

export const OFFLINE_VOICE_PACKS: OfflineVoicePack[] = [
  {
    language: "EN",
    name: "English · MMS VITS",
    locale: "en-US",
    model: "Xenova/mms-tts-eng",
    size: "约 38 MB",
    license: "CC-BY-NC-4.0",
    licenseUrl: "https://huggingface.co/facebook/mms-tts-eng#license",
    sourceUrl: "https://huggingface.co/Xenova/mms-tts-eng",
    description: "Meta MMS 英语模型的浏览器量化版，适合词条、例句和中等长度段落。",
    descriptionEn: "A browser-quantized Meta MMS English model for entries, examples and medium-length passages.",
  },
  {
    language: "FR",
    name: "Français · MMS VITS",
    locale: "fr-FR",
    model: "Xenova/mms-tts-fra",
    size: "约 38 MB",
    license: "CC-BY-NC-4.0",
    licenseUrl: "https://huggingface.co/facebook/mms-tts-fra",
    sourceUrl: "https://huggingface.co/Xenova/mms-tts-fra",
    description: "法语专用量化模型，离线保留重音、连诵与句末语调。",
    descriptionEn: "A quantized French model designed to retain stress, liaison and sentence-final intonation offline.",
  },
  {
    language: "DE",
    name: "Deutsch · MMS VITS",
    locale: "de-DE",
    model: "Xenova/mms-tts-deu",
    size: "约 38 MB",
    license: "CC-BY-NC-4.0",
    licenseUrl: "https://huggingface.co/facebook/mms-tts-deu",
    sourceUrl: "https://huggingface.co/Xenova/mms-tts-deu",
    description: "德语专用量化模型，适合复合词、哲学术语和学术例句。",
    descriptionEn: "A quantized German model for compounds, philosophical terms and academic examples.",
  },
  {
    language: "IT",
    name: "Italiano · MMS VITS",
    locale: "it-IT",
    model: "Xenova/mms-tts-ita",
    size: "约 38 MB",
    license: "CC-BY-NC-4.0",
    licenseUrl: "https://huggingface.co/facebook/mms-tts-ita",
    sourceUrl: "https://huggingface.co/Xenova/mms-tts-ita",
    description: "意大利语专用量化模型，适合词条、生活表达和学术例句。",
    descriptionEn: "A quantized Italian model for entries, daily expressions and academic examples.",
  },
  {
    language: "ES",
    name: "Español · MMS VITS",
    locale: "es-ES",
    model: "Xenova/mms-tts-spa",
    size: "约 38 MB",
    license: "CC-BY-NC-4.0",
    licenseUrl: "https://huggingface.co/facebook/mms-tts-spa",
    sourceUrl: "https://huggingface.co/Xenova/mms-tts-spa",
    description: "西班牙语专用量化模型，适合词条、生活表达和学术例句。",
    descriptionEn: "A quantized Spanish model for entries, daily expressions and academic examples.",
  },
  {
    language: "KO",
    name: "한국어 · MMS VITS",
    locale: "ko-KR",
    model: "Xenova/mms-tts-kor",
    size: "约 38 MB",
    license: "CC-BY-NC-4.0",
    licenseUrl: "https://huggingface.co/facebook/mms-tts-kor",
    sourceUrl: "https://huggingface.co/Xenova/mms-tts-kor",
    description: "韩语专用量化模型，适合词条、敬语表达和学术例句。",
    descriptionEn: "A quantized Korean model for entries, honorific expressions and academic examples.",
  },
];

const STORAGE_KEY = "deep-language-offline-packs-v1";
const LEGACY_STORAGE_KEY = "deep-voice-offline-packs-v1";
const OFFLINE_VOICE_STATE_EVENT = "deep-language-offline-state";
const CACHE_KEY = "transformers-cache";
const pending = new Map<string, PendingRequest>();
let worker: Worker | null = null;
let workerPromise: Promise<Worker> | null = null;

function defaultState(): OfflineVoiceState {
  return { enabled: false, installed: {} };
}

export function getOfflineVoiceState(): OfflineVoiceState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
      || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as OfflineVoiceState;
    const installed = Object.fromEntries(
      OFFLINE_VOICE_PACKS
        .filter((pack) => parsed.installed?.[pack.language])
        .map((pack) => [pack.language, true]),
    ) as OfflineVoiceState["installed"];
    const sanitized = { enabled: Boolean(parsed.enabled) && Object.keys(installed).length > 0, installed };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (parsed.installed?.CN && "caches" in window) {
      void window.caches.open(CACHE_KEY).then(async (cache) => {
        const requests = await cache.keys();
        await Promise.all(requests
          .filter((request) => /BricksDisplay|vits-cmn/i.test(request.url))
          .map((request) => cache.delete(request)));
      }).catch(() => undefined);
    }
    return sanitized;
  } catch {
    return defaultState();
  }
}

function writeState(state: OfflineVoiceState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(OFFLINE_VOICE_STATE_EVENT, { detail: state }));
  return state;
}

export function setOfflineVoiceEnabled(enabled: boolean) {
  const state = getOfflineVoiceState();
  return writeState({ ...state, enabled });
}

async function getWorker() {
  if (worker) return worker;
  workerPromise ||= Promise.resolve().then(() => {
    const activeWorker = new Worker("/offline-tts.worker.js", {
      name: "deep-language-offline-tts",
      type: "module",
    });
    activeWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const request = pending.get(response.id);
      if (!request) return;
      if (response.type === "progress") {
        request.onProgress?.(response.progress || 0, response.loaded || 0, response.total || 0);
        return;
      }
      pending.delete(response.id);
      if (response.type === "error") {
        request.reject(new Error(response.message || "离线语音包初始化失败。"));
        return;
      }
      request.resolve({ audio: response.audio, sampleRate: response.sampleRate });
    };
    activeWorker.onerror = (event) => {
      const error = new Error(event.message || "离线语音工作线程发生错误。");
      pending.forEach((request) => request.reject(error));
      pending.clear();
      activeWorker.terminate();
      worker = null;
      workerPromise = null;
    };
    worker = activeWorker;
    return activeWorker;
  }).catch((error) => {
    workerPromise = null;
    throw error;
  });
  return workerPromise;
}

async function sendRequest(
  type: "prepare" | "synthesize",
  language: LanguageCode,
  text?: string,
  onProgress?: PendingRequest["onProgress"],
) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const activeWorker = await getWorker();
  return new Promise<{ audio?: Float32Array; sampleRate?: number }>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    activeWorker.postMessage({ id, type, language, text });
  });
}

export async function downloadOfflineVoicePack(
  language: LanguageCode,
  onProgress?: PendingRequest["onProgress"],
) {
  if (!("Worker" in window) || !("caches" in window)) {
    throw new Error("当前浏览器不支持本地模型缓存，请使用最新版 Chrome、Edge、Safari 或 Firefox。");
  }
  if (!offlineVoicePackFor(language)) throw new Error("该语言暂未提供可下载的离线语音包。");
  await sendRequest("prepare", language, undefined, onProgress);
  const state = getOfflineVoiceState();
  return writeState({
    enabled: true,
    installed: { ...state.installed, [language]: true },
  });
}

export async function synthesizeOfflineSpeech(text: string, language: LanguageCode, allowDisabled = false) {
  const state = getOfflineVoiceState();
  if (!offlineVoicePackFor(language) || !state.installed[language] || (!state.enabled && !allowDisabled)) throw new Error("请先下载并启用对应语言的离线语音包。");
  const output = await sendRequest("synthesize", language, text);
  if (!output.audio || !output.sampleRate) throw new Error("离线语音包没有返回有效音频。");
  return { audio: output.audio, sampleRate: output.sampleRate };
}

export async function clearOfflineVoicePacks() {
  worker?.terminate();
  worker = null;
  workerPromise = null;
  pending.forEach((request) => request.reject(new Error("离线语音缓存已清除。")));
  pending.clear();
  if ("caches" in window) await window.caches.delete(CACHE_KEY);
  return writeState(defaultState());
}

export function offlineVoicePackFor(language: LanguageCode) {
  return OFFLINE_VOICE_PACKS.find((pack) => pack.language === language);
}
