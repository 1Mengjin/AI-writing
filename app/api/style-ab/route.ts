import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type AbData = {
  scene: string;
  a: string;
  b: string;
};

function parseAb(text: string) {
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

  const data = JSON.parse(clean.slice(start, end + 1)) as AbData;

  return {
    scene: String(data.scene ?? ""),
    a: String(data.a ?? ""),
    b: String(data.b ?? ""),
  };
}

async function clearOld(styleId: string) {
  const old = await prisma.calibrationLog.findMany({
    where: { styleModelId: styleId },
    orderBy: { createdAt: "desc" },
    skip: 50,
    select: { id: true },
  });

  if (old.length > 0) {
    await prisma.calibrationLog.deleteMany({
      where: { id: { in: old.map((item) => item.id) } },
    });
  }
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
              "你只输出合法 JSON，不要 Markdown，不要解释。必须生成两个同场景但微调方向不同的中文段落。",
          },
          { role: "user", content },
        ],
        temperature: 0.55,
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

  return parseAb(text);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const styleId = String(body.styleId ?? "");
    const scene = String(body.scene ?? "雨夜重逢").trim();

    if (!styleId) {
      return NextResponse.json({ error: "缺少文风模型" }, { status: 400 });
    }

    const style = await prisma.styleModel.findUnique({
      where: { id: styleId },
    });

    if (!style) {
      return NextResponse.json({ error: "文风模型不存在" }, { status: 404 });
    }

    const content = `
# 当前文风参数
${JSON.stringify(style.features)}

# 禁忌词
${JSON.stringify(style.forbiddenWords)}

# 场景
${scene}

# 输出要求
输出合法 JSON：
{
  "scene": "场景一句话",
  "a": "版本A，偏向更近的叙事距离或更克制的比喻",
  "b": "版本B，偏向更远的叙事距离或更密的意象互联"
}
每个版本 120-180 字。避开禁忌词。
`.trim();

    const abCeshiData = await callDeepSeek(content);

    await prisma.calibrationLog.create({
      data: {
        styleModelId: styleId,
        action: "ab_generate",
        payload: { scene, abCeshiData } as Prisma.InputJsonValue,
      },
    });
    await clearOld(styleId);

    return NextResponse.json(abCeshiData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
