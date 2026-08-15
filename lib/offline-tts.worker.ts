import type { LanguageCode } from "./academy-data";

type WorkerRequest = {
  id: string;
  type: "prepare" | "synthesize";
  language: LanguageCode;
  text?: string;
};

type SpeechOutput = {
  audio: Float32Array;
  sampling_rate: number;
};

const MODEL_IDS: Record<LanguageCode, string> = {
  CN: "BricksDisplay/vits-cmn",
  EN: "Xenova/mms-tts-eng",
  FR: "Xenova/mms-tts-fra",
  DE: "Xenova/mms-tts-deu",
};

const synthesizers = new Map<LanguageCode, Promise<CallableFunction>>();
const TRANSFORMERS_RUNTIME_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js";
let transformersPromise: Promise<typeof import("@huggingface/transformers")> | null = null;

async function transformers() {
  // Keep the ONNX runtime out of the server/Worker bundle. The browser downloads
  // this immutable ESM build together with the first voice pack and caches both.
  transformersPromise ||= import(/* @vite-ignore */ TRANSFORMERS_RUNTIME_URL).then((module) => {
    module.env.useBrowserCache = true;
    module.env.allowRemoteModels = true;
    module.env.cacheKey = "transformers-cache";
    return module;
  });
  return transformersPromise;
}

function post(id: string, payload: Record<string, unknown>, transfer?: Transferable[]) {
  self.postMessage({ id, ...payload }, transfer || []);
}

async function synthesizerFor(language: LanguageCode, requestId: string) {
  const existing = synthesizers.get(language);
  if (existing) return existing;
  const { pipeline } = await transformers();
  const created = pipeline("text-to-speech", MODEL_IDS[language], {
    dtype: "q8",
    progress_callback: (progress: { status?: string; progress?: number; loaded?: number; total?: number; file?: string }) => {
      if (progress.status === "progress" || progress.status === "progress_total") {
        post(requestId, {
          type: "progress",
          language,
          progress: Number(progress.progress || 0),
          loaded: Number(progress.loaded || 0),
          total: Number(progress.total || 0),
          file: progress.file || "",
        });
      }
    },
  }) as Promise<CallableFunction>;
  synthesizers.set(language, created);
  created.catch(() => synthesizers.delete(language));
  return created;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    const synthesizer = await synthesizerFor(request.language, request.id);
    if (request.type === "prepare") {
      post(request.id, { type: "ready", language: request.language });
      return;
    }

    const sourceText = request.text?.trim();
    if (!sourceText) throw new Error("没有可朗读的文字。");
    const output = await synthesizer(sourceText) as SpeechOutput;
    const audio = output.audio instanceof Float32Array ? output.audio : new Float32Array(output.audio);
    post(request.id, {
      type: "audio",
      language: request.language,
      audio,
      sampleRate: output.sampling_rate,
    }, [audio.buffer]);
  } catch (error) {
    post(request.id, {
      type: "error",
      language: request.language,
      message: error instanceof Error ? error.message : "离线语音包初始化失败。",
    });
  }
};
