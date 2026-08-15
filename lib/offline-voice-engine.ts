import type { LanguageCode } from "./academy-data";
import OfflineTtsWorker from "./offline-tts.worker?worker";
import { pinyin } from "pinyin-pro";

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
    language: "CN",
    name: "普通话 · Bricks VITS",
    locale: "zh-CN",
    model: "BricksDisplay/vits-cmn",
    size: "约 37 MB",
    license: "Apache-2.0",
    licenseUrl: "https://huggingface.co/BricksDisplay/vits-cmn",
    sourceUrl: "https://huggingface.co/BricksDisplay/vits-cmn",
    description: "中文专用 VITS 声线；文字先在本地转换为带声调拼音，再由 ONNX 模型合成。",
  },
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
  },
];

const STORAGE_KEY = "deep-voice-offline-packs-v1";
const CACHE_KEY = "transformers-cache";
const pending = new Map<string, PendingRequest>();
let worker: Worker | null = null;

function defaultState(): OfflineVoiceState {
  return { enabled: false, installed: {} };
}

export function getOfflineVoiceState(): OfflineVoiceState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as OfflineVoiceState;
    return { enabled: Boolean(parsed.enabled), installed: parsed.installed || {} };
  } catch {
    return defaultState();
  }
}

function writeState(state: OfflineVoiceState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("deep-voice-offline-state", { detail: state }));
  return state;
}

export function setOfflineVoiceEnabled(enabled: boolean) {
  const state = getOfflineVoiceState();
  return writeState({ ...state, enabled });
}

function getWorker() {
  if (worker) return worker;
  worker = new OfflineTtsWorker({ name: "deep-voice-offline-tts" });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
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
  worker.onerror = (event) => {
    const error = new Error(event.message || "离线语音工作线程发生错误。");
    pending.forEach((request) => request.reject(error));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function sendRequest(
  type: "prepare" | "synthesize",
  language: LanguageCode,
  text?: string,
  onProgress?: PendingRequest["onProgress"],
) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise<{ audio?: Float32Array; sampleRate?: number }>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, type, language, text });
  });
}

export async function downloadOfflineVoicePack(
  language: LanguageCode,
  onProgress?: PendingRequest["onProgress"],
) {
  if (!("Worker" in window) || !("caches" in window)) {
    throw new Error("当前浏览器不支持本地模型缓存，请使用最新版 Chrome、Edge、Safari 或 Firefox。");
  }
  await sendRequest("prepare", language, undefined, onProgress);
  const state = getOfflineVoiceState();
  return writeState({
    enabled: true,
    installed: { ...state.installed, [language]: true },
  });
}

export async function synthesizeOfflineSpeech(text: string, language: LanguageCode) {
  const state = getOfflineVoiceState();
  if (!state.enabled || !state.installed[language]) throw new Error("请先下载并启用对应语言的离线语音包。");
  const input = language === "CN"
    ? pinyin(text, { toneType: "num", type: "array", nonZh: "consecutive" }).join("")
    : text;
  const output = await sendRequest("synthesize", language, input);
  if (!output.audio || !output.sampleRate) throw new Error("离线语音包没有返回有效音频。");
  return { audio: output.audio, sampleRate: output.sampleRate };
}

export async function clearOfflineVoicePacks() {
  worker?.terminate();
  worker = null;
  pending.forEach((request) => request.reject(new Error("离线语音缓存已清除。")));
  pending.clear();
  if ("caches" in window) await window.caches.delete(CACHE_KEY);
  return writeState(defaultState());
}

export function offlineVoicePackFor(language: LanguageCode) {
  return OFFLINE_VOICE_PACKS.find((pack) => pack.language === language) || OFFLINE_VOICE_PACKS[0];
}
