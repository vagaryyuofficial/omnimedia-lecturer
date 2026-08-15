const MODEL_IDS = {
  EN: "Xenova/mms-tts-eng",
  FR: "Xenova/mms-tts-fra",
  DE: "Xenova/mms-tts-deu",
  IT: "Xenova/mms-tts-ita",
  ES: "Xenova/mms-tts-spa",
  KO: "Xenova/mms-tts-kor",
};

const synthesizers = new Map();
let transformersPromise;

function transformers() {
  transformersPromise ||= import("/vendor/transformers.min.js").then((module) => {
    module.env.useBrowserCache = true;
    module.env.allowRemoteModels = true;
    module.env.cacheKey = "transformers-cache";
    return module;
  });
  return transformersPromise;
}

function post(id, payload, transfer = []) {
  self.postMessage({ id, ...payload }, transfer);
}

async function synthesizerFor(language, requestId) {
  const existing = synthesizers.get(language);
  if (existing) return existing;
  const modelId = MODEL_IDS[language];
  if (!modelId) throw new Error("该语言暂未提供可下载的离线语音包。");

  const { pipeline } = await transformers();
  const created = pipeline("text-to-speech", modelId, {
    dtype: "q8",
    progress_callback: (progress) => {
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
  });

  synthesizers.set(language, created);
  created.catch(() => synthesizers.delete(language));
  return created;
}

self.onmessage = async (event) => {
  const request = event.data;
  try {
    const synthesizer = await synthesizerFor(request.language, request.id);
    if (request.type === "prepare") {
      post(request.id, { type: "ready", language: request.language });
      return;
    }

    const sourceText = request.text?.trim();
    if (!sourceText) throw new Error("没有可朗读的文字。");
    const output = await synthesizer(sourceText);
    const audio = output.audio instanceof Float32Array
      ? output.audio
      : new Float32Array(output.audio);
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
