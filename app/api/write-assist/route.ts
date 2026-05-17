import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

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
              "你是本地写作工具里的协作者。不要代笔，不要生成完整剧情。只给克制的问题、结构提示或意象方向。",
          },
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.5,
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
    const sourceText = String(body.sourceText ?? "").trim();
    const styleModelId = String(body.styleModelId ?? "");
    const ask = String(body.ask ?? "基于当前文本给我三个继续思考的问题。");

    if (!sourceText) {
      return NextResponse.json({ error: "缺少文本" }, { status: 400 });
    }

    const project = await getMorenProject();
    const style = styleModelId
      ? await prisma.styleModel.findFirst({
          where: {
            id: styleModelId,
            projectId: project.id,
          },
        })
      : await prisma.styleModel.findFirst({
          where: { projectId: project.id },
          orderBy: { createdAt: "desc" },
        });

    const features = style?.features ?? {};
    const forbiddenWords = style?.forbiddenWords ?? [];

    const prompt = `
# 风格锁定
${style ? `当前文风模型：${style.name}` : "当前没有文风模型，保持克制。"}
禁忌词：${JSON.stringify(forbiddenWords)}
文风指纹：${JSON.stringify(features)}

# 最高优先级
1. 禁止使用禁忌词。
2. 禁止通用润色腔、排比、总结升华。
3. 不要替用户写完整段落。
4. 只输出 3-5 条短建议或问题。

# 用户请求
${ask}

# 当前文本
${sourceText}
`.trim();

    const text = await callDeepSeek(prompt);

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
