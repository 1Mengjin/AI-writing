import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type MetaItem = {
  name?: string;
  title?: string;
  description?: string;
};

type MetaData = {
  characters?: MetaItem[];
  worldItems?: MetaItem[];
  events?: MetaItem[];
};

type CleanMetaItem = {
  name: string;
  description: string;
};

type CleanMetaData = {
  characters: CleanMetaItem[];
  worldItems: CleanMetaItem[];
  events: CleanMetaItem[];
};

const SYSTEM_PROMPT = `
你是创作者的外置大脑数据提取器。你的任务是通读用户即兴创作的意识流随笔或破碎想法。

你需要提取三类隐藏设定片段：
1. 人物潜在特质：如新展现的语言风格、情绪反应、创伤、执念、习惯。
2. 事物/地点规则：如新道具、地点、组织、物理法则、运行限制。
3. 时间线事件：如某事发生的因果逻辑、前后顺序、已经形成的过去事实。

硬性要求：
- 坚决不要虚构或发散设定。
- 只提取文本中已经明确写出、明显暗示、或能被原文直接支撑的硬性事实。
- 不要评价文笔，不要提出建议，不要补剧情。
- 只输出合法 JSON，不要 Markdown，不要解释。
- JSON 必须包含三个数组：characters、worldItems、events。
- 每个数组项必须包含 name 和 description。
- name 是触发词或标题，description 是提取出的特质或事实描述。
`.trim();

function parseMeta(text: string): CleanMetaData {
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

  const data = JSON.parse(clean.slice(start, end + 1)) as MetaData;

  return {
    characters: cleanList(data.characters),
    worldItems: cleanList(data.worldItems),
    events: cleanList(data.events),
  };
}

function cleanList(list: unknown): CleanMetaItem[] {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const meta = item as MetaItem;
      const name = String(meta.name ?? meta.title ?? "").trim();
      const description = String(meta.description ?? "").trim();

      if (!name || !description) return null;

      return { name, description };
    })
    .filter((item): item is CleanMetaItem => item !== null);
}

async function callDeepSeek(content: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 DEEPSEEK_API_KEY");
  }

  const res = await fetch(
    process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_STYLE_MODEL ?? "deepseek-v4-flash",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.1,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek 调用失败：${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;

  if (typeof text !== "string") {
    throw new Error("DeepSeek 返回格式异常");
  }

  return parseMeta(text);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nowText = String(body.nowText ?? "").trim();

    if (!nowText) {
      return NextResponse.json({ error: "缺少随笔文本" }, { status: 400 });
    }

    const content = `
# 随笔文本
${nowText.slice(-6000)}

# 返回格式
{
  "characters": [
    { "name": "人物触发词", "description": "文本已经明确支撑的人物特质" }
  ],
  "worldItems": [
    { "name": "事物或地点触发词", "description": "文本已经明确支撑的规则或事实" }
  ],
  "events": [
    { "name": "事件标题", "description": "文本已经明确支撑的因果或时间线事实" }
  ]
}
`.trim();

    const meta = await callDeepSeek(content);

    return NextResponse.json(meta);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
