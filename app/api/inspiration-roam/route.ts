import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ManyouMsg = {
  role: "user" | "assistant";
  content: string;
};

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
        model: process.env.DEEPSEEK_WRITE_MODEL ?? "deepseek-v4-pro",
        messages: [
          {
            role: "system",
            content:
              "你是苏格拉底式提问者。禁止提供任何故事段落、情节建议或完整叙事句子。必须且只能用开放性的问题或意象对比来回应用户，引导用户自行思考。不要总结，不要代写，不要给答案。",
          },
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.7,
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

  return text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = String(body.input ?? "").trim();
    const intent = String(body.intent ?? "").trim();
    const nowText = String(body.nowText ?? "").slice(-1200);
    const manyouJilu = Array.isArray(body.manyouJilu)
      ? (body.manyouJilu as ManyouMsg[]).slice(-8)
      : [];

    if (!input && !intent) {
      return NextResponse.json({ error: "缺少输入" }, { status: 400 });
    }

    const content = `
# 当前写作片段
${nowText || "暂无"}

# 漫游记录
${manyouJilu.map((item) => `${item.role}: ${item.content}`).join("\n")}

# 用户输入
${input}

# 下一步意图
${intent || "正常回应"}

# 输出要求
只输出 2-4 个开放问题或意象对比。不要给剧情答案，不要写正文。
`.trim();

    const text = await callDeepSeek(content);

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
