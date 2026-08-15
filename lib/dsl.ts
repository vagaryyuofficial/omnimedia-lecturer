import type { LanguageCode } from "./academy-data";

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "term"; value: string; language: LanguageCode };

export type LanguageCardEntry = {
  term: string;
  meaning: string;
  grammar: string;
};

export type DslBlock =
  | { type: "heading"; value: string }
  | { type: "paragraph"; tokens: InlineToken[] }
  | {
      type: "language-card";
      language: Exclude<LanguageCode, "CN">;
      sentence: string;
      entries: LanguageCardEntry[];
    };

const INLINE_TERM = /\{\{([^|{}]+)\|(CN|EN|FR|DE|IT|ES|KO|JA)\}\}/g;

export function tokenizeInline(value: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of value.matchAll(INLINE_TERM)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ type: "text", value: value.slice(cursor, index) });
    }
    tokens.push({
      type: "term",
      value: match[1].trim(),
      language: match[2] as LanguageCode,
    });
    cursor = index + match[0].length;
  }

  if (cursor < value.length) {
    tokens.push({ type: "text", value: value.slice(cursor) });
  }
  return tokens;
}

function parseLanguageCard(line: string): DslBlock | null {
  const match = line.match(/^\[\[(EN|FR|DE|IT|ES|KO|JA):\s*([^|]+?)\s*\|\|\s*(.+)\]\]$/);
  if (!match) return null;

  const entries = match[3]
    .split(/\s*;;\s*/)
    .map((entry) => {
      const parts = entry.split(/\s*:\s*/);
      return {
        term: parts[0]?.trim() || "",
        meaning: parts[1]?.trim() || "",
        grammar: parts.slice(2).join(": ").trim(),
      };
    })
    .filter((entry) => entry.term);

  return {
    type: "language-card",
    language: match[1] as Exclude<LanguageCode, "CN">,
    sentence: match[2].trim(),
    entries,
  };
}

export function parseLectureDsl(input: string): DslBlock[] {
  return input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): DslBlock => {
      if (line.startsWith("## ")) {
        return { type: "heading", value: line.slice(3).trim() };
      }
      const card = parseLanguageCard(line);
      if (card) return card;
      return { type: "paragraph", tokens: tokenizeInline(line) };
    });
}
