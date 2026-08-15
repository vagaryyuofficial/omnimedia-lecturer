import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cssUrl = new URL("../app/globals.css", import.meta.url);

test("keeps typography scale variables resolvable", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(css, /:root\s*{[\s\S]*?--font-scale:\s*1\s*;[\s\S]*?--minimum-font-size:\s*13px\s*;/);
  assert.match(css, /data-text-size="large"[^}]*--minimum-font-size:\s*14px\s*;/);
  assert.match(css, /data-text-size="extra"[^}]*--minimum-font-size:\s*15px\s*;/);
  assert.match(css, /\.lecture-paper\s*{[^}]*--minimum-font-size:\s*15px\s*;/);
  assert.doesNotMatch(
    css,
    /--minimum-font-size:\s*[^;]*var\(--minimum-font-size\)/,
    "--minimum-font-size must not reference itself; cyclic custom properties invalidate every dependent font-size",
  );
});

test("uses interface fonts for navigation and voice descriptions", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(css, /body\s*{[\s\S]*?"SF Pro Text"/);
  assert.match(css, /\.voice-strategy\s*>\s*button\s*>\s*span:first-child/);
  assert.match(css, /\.voice-copy\s*{[^}]*"SF Pro Text"/);
  assert.doesNotMatch(css, /\.voice-copy small\s*{[^}]*SFMono-Regular/);
});

test("prevents subject names from overlapping in the mobile dock", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(css, /@media\s*\(max-width:\s*650px\)[\s\S]*?\.campaign-name\s*{\s*display:\s*none\s*;\s*}/);
});
