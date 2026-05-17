import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

async function callDeepSeek(system: string, content: string) {
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
        model: process.env.DEEPSEEK_EXPAND_MODEL ?? "deepseek-v4-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
        temperature: 0.45,
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
    const outline = String(body.outline ?? "").trim();
    const recentText = String(body.recentText ?? "").slice(-1000);
    const rewriteNote = String(body.rewriteNote ?? "").trim();
    const styleId = String(body.styleId ?? "");
    const characterStates = Array.isArray(body.characterStates)
      ? body.characterStates
      : [];
    const itemRules = Array.isArray(body.itemRules) ? body.itemRules : [];

    if (!outline) {
      return NextResponse.json({ error: "缺少大纲" }, { status: 400 });
    }

    const project = await getMorenProject();
    const style = styleId
      ? await prisma.styleModel.findFirst({
          where: { id: styleId, projectId: project.id },
        })
      : await prisma.styleModel.findFirst({
          where: { projectId: project.id },
          orderBy: { updatedAt: "desc" },
        });

    if (!style) {
      return NextResponse.json({ error: "缺少文风模型" }, { status: 400 });
    }

    const system = `
# Highest Priority Style Rules
Forbidden words and phrases:
${JSON.stringify(style.forbiddenWords)}

Style model:
${JSON.stringify(style.features)}

你是一个无情的文字渲染器。根据大纲和前文，严格使用指定的文风参数进行扩写。
不准总结，不准抒情，不准在结尾添加任何判断句。只输出连贯的小说正文。
禁止使用禁忌词。禁止通用网文腔、AI润色腔、解释、标题、列表、Markdown。
`.trim();

    const content = `
# Outline
${outline}

# Recent Text
${recentText || "暂无"}

# Character States
${JSON.stringify(characterStates)}

# Item Rules
${JSON.stringify(itemRules)}

# Rewrite Note
${rewriteNote || "无"}

# Output
只输出扩写后的正文。
`.trim();

    const draft = await callDeepSeek(system, content);

    return NextResponse.json({ draft });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
