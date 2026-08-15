import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("serves the offline TTS worker without injecting the page-only dev client", async () => {
  const [engine, worker, packageJson] = await Promise.all([
    readProjectFile("lib/offline-voice-engine.ts"),
    readProjectFile("public/offline-tts.worker.js"),
    readProjectFile("package.json"),
  ]);

  assert.match(engine, /new Worker\("\/offline-tts\.worker\.js"/);
  assert.doesNotMatch(engine, /offline-tts\.worker\?worker/);
  assert.match(worker, /import\("\/vendor\/transformers\.min\.js"\)/);
  assert.doesNotMatch(worker, /cdn\.jsdelivr\.net/);

  const scripts = JSON.parse(packageJson).scripts;
  assert.equal(scripts.predev, "node scripts/sync-transformers-runtime.mjs");
  assert.equal(scripts.prebuild, "node scripts/sync-transformers-runtime.mjs");
});

test("offers an explicit installed-pack preview instead of a fake file download", async () => {
  const [component, readme] = await Promise.all([
    readProjectFile("app/LecturerApp.tsx"),
    readProjectFile("README.md"),
  ]);

  assert.match(component, /playOfflineSpeech/);
  assert.match(component, /下载到此浏览器/);
  assert.match(component, /▶ 试听/);
  assert.match(readme, /Cache Storage/);
  assert.match(readme, /Preview/);
});

test("removes Chinese speech while retaining target-language voice packs", async () => {
  const [offlineEngine, audioEngine, component, worker, packageJson] = await Promise.all([
    readProjectFile("lib/offline-voice-engine.ts"),
    readProjectFile("lib/audio-engine.ts"),
    readProjectFile("app/LecturerApp.tsx"),
    readProjectFile("public/offline-tts.worker.js"),
    readProjectFile("package.json"),
  ]);

  assert.doesNotMatch(offlineEngine, /BricksDisplay\/vits-cmn|toneType|pinyin-pro/);
  assert.doesNotMatch(worker, /BricksDisplay\/vits-cmn|CN:/);
  assert.match(audioEngine, /中文语音已停用/);
  assert.doesNotMatch(component, /系统普通话声线（推荐）|playDeviceSpeech|试听系统中文/);
  assert.equal(JSON.parse(packageJson).devDependencies["pinyin-pro"], undefined);
});

test("ships 144 bilingual modules across six stages backed by an open-source catalog", async () => {
  const library = await readProjectFile("lib/course-library.ts");
  assert.equal((library.match(/\bm\("(?:lit|econ|psych|biz|daily|art|phil|sci)-l[1-6]-[123]"/g) || []).length, 144);
  for (const level of ["L1", "L2", "L3", "L4", "L5", "L6"]) assert.match(library, new RegExp(`"${level}"`));
  assert.match(library, /OpenStax/);
  assert.match(library, /MIT OpenCourseWare/);
  assert.match(library, /Stanford Encyclopedia of Philosophy/);
  assert.match(library, /Heilbrunn Timeline of Art History/);
  assert.match(library, /CEFR descriptors/);
});
