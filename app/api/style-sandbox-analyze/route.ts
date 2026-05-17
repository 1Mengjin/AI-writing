import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Fenxi = {
  syntax: string;
  rhythm: string;
  synesthesia: string;
  skeleton: string;
};

function parseFenxi(text: string) {
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

  const data = JSON.parse(clean.slice(start, end + 1)) as Fenxi;

  return {
    syntax: String(data.syntax ?? ""),
    rhythm: String(data.rhythm ?? ""),
    synesthesia: String(data.synesthesia ?? ""),
    skeleton: String(data.skeleton ?? ""),
  };
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
              "你是文本技术拆解器。只输出合法 JSON，不要 Markdown，不要解释。",
          },
          { role: "user", content },
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

  return parseFenxi(text);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paragraph = String(body.paragraph ?? "").trim();

    if (!paragraph) {
      return NextResponse.json({ error: "缺少原段落" }, { status: 400 });
    }

    const content = `
# 原段落
${paragraph}

# 输出格式
{
  "syntax": "句式拆解，短句/长句/断裂方式，30字内",
  "rhythm": "节奏拆解，停顿、推进、回收方式，30字内",
  "synesthesia": "通感拆解，感官互换或意象连接，30字内",
  "skeleton": "可迁移骨架，说明如何换主题但保留手法，60字内"
}
`.trim();

    const chaijieFenxi = await callDeepSeek(content);

    return NextResponse.json({ chaijieFenxi });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
