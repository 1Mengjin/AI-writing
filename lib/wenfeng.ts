export type WenfengFeatures = {
  syntax_fingerprint: {
    average_sentence_length: string;
    frequent_punctuation: string[];
  };
  narrative_distance: string;
  sensory_preference: string[];
  emotion_style: string;
  unique_markers: string[];
  banned_ai_words: string[];
};

export function cleanText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cutChunks(text: string) {
  const clean = cleanText(text);
  const parts = clean.split(/\n{2,}/).filter(Boolean);
  const chunks: string[] = [];
  let now = "";

  for (const part of parts) {
    const next = now ? `${now}\n\n${part}` : part;

    if (next.length <= 400) {
      now = next;
      continue;
    }

    if (now) {
      chunks.push(now);
      now = part.slice(Math.max(0, part.length - 40));
    } else {
      chunks.push(part);
      now = "";
    }
  }

  if (now) {
    chunks.push(now);
  }

  return chunks.length ? chunks : [clean].filter(Boolean);
}

export function parseJson(text: string) {
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("AI 没有返回 JSON");
  }

  return JSON.parse(clean.slice(start, end + 1)) as WenfengFeatures;
}

export function getTags(features: WenfengFeatures) {
  return [
    features.narrative_distance,
    ...features.sensory_preference,
    ...features.unique_markers,
  ]
    .filter(Boolean)
    .slice(0, 3);
}
