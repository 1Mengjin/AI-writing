import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Luxian = {
  name: string;
  turn: string;
  roles: string[];
};

function parseJson(text: string) {
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");

  if (start === -1 || end === -1) {
    throw new Error("AI 没有返回 JSON 数组");
  }

  const list = JSON.parse(clean.slice(start, end + 1)) as Luxian[];

  if (!Array.isArray(list)) {
    throw new Error("JSON 不是数组");
  }

  return list.slice(0, 4).map((item) => ({
    name: String(item.name ?? ""),
    turn: String(item.turn ?? ""),
    roles: Array.isArray(item.roles) ? item.roles.map(String) : [],
  }));
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
            content:
              "你只输出合法 JSON 数组，不要 Markdown，不要解释。数组长度必须是 3 到 4。",
          },
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.2,
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

  return parseJson(text);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const draft = String(body.draft ?? "").trim();

    if (!draft) {
      return NextResponse.json({ error: "缺少文稿内容" }, { status: 400 });
    }

    const content = `
# 任务
基于当前文稿，推演 3-4 条不同的后续路线。只给结构化纲要，不写正文，不给完整叙事句子。

# Few-Shot
输入：人物在雨夜发现旧信，但还没有拆开。
输出：
[
  {"name":"迟拆信","turn":"角色选择先隐藏信件，关系压力转入暗线","roles":["主角","寄信人"]},
  {"name":"当场公开","turn":"旧信成为公开冲突，引爆原本压住的误会","roles":["主角","旁观者"]},
  {"name":"信件失踪","turn":"物证消失，故事焦点转向谁动过它","roles":["主角","偷信者"]}
]

# 当前文稿
${draft.slice(-5000)}

# 输出格式
严格输出 JSON 数组，每项必须包含：
- name: 路线名称
- turn: 核心转向
- roles: 影响角色数组
`.trim();

    const list = await callDeepSeek(content);

    return NextResponse.json({ list });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
