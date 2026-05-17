import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function callDeepSeek(system: string, content: string, temp: number) {
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
        model: process.env.DEEPSEEK_WRITE_MODEL ?? "deepseek-v4-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
        temperature: temp,
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

  return text
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = String(body.topic ?? "").trim();
    const fenxi = body.fenxi ?? {};

    if (!topic) {
      return NextResponse.json({ error: "缺少新主题" }, { status: 400 });
    }

    const tongyong = await callDeepSeek(
      "你是普通写作助手。只输出一段中文描写，不要解释。",
      `主题：${topic}\n写 120-180 字。`,
      0.6,
    );

    const chongzuShengcheng = await callDeepSeek(
      "你必须仅输出重写后的中文段落。禁止输出前置问候，禁止说“好的”，禁止解释，禁止标题，禁止列表，禁止 Markdown，禁止任何排版标记。除了段落正文，不允许有任何其他文字。",
      `
# 新主题
${topic}

# 技术骨架
${JSON.stringify(fenxi)}

# 要求
用技术骨架迁移，不照搬原句。输出 120-180 字的一段正文。
`.trim(),
      0.45,
    );

    return NextResponse.json({ tongyong, chongzuShengcheng });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
