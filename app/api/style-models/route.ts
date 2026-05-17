import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";
import { getWenfengPrompt } from "@/lib/prompt";
import { cleanText, cutChunks, parseJson } from "@/lib/wenfeng";

export const runtime = "nodejs";

async function callDeepSeek(prompt: string, text: string) {
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
              "你只输出合法 JSON。不要输出 Markdown、解释、寒暄或额外文字。",
          },
          {
            role: "user",
            content: `${prompt}\n\n# Input Text\n${text}`,
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
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("DeepSeek 返回格式异常");
  }

  return parseJson(content);
}

export async function GET() {
  const project = await getMorenProject();
  const list = await prisma.styleModel.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: {
      corpusChunks: {
        select: { id: true },
      },
    },
  });

  return NextResponse.json({
    list: list.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      features: item.features,
      forbiddenWords: item.forbiddenWords,
      lockEnabled: item.lockEnabled,
      chunkCount: item.corpusChunks.length,
      createdAt: item.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "未命名文风");
    const coreText = cleanText(String(body.coreText ?? ""));
    const sketchText = cleanText(String(body.sketchText ?? ""));
    const negativeText = cleanText(String(body.negativeText ?? ""));

    if (coreText.length < 200) {
      return NextResponse.json(
        { error: "核心语料至少需要 200 字，后续再提高到 3000 字门槛。" },
        { status: 400 },
      );
    }

    const project = await getMorenProject();
    const prompt = await getWenfengPrompt();
    const fenxiText = [coreText, sketchText].filter(Boolean).join("\n\n");
    const features = await callDeepSeek(prompt, fenxiText);
    const chunks = cutChunks(coreText);
    const forbiddenWords = Array.from(
      new Set([...(features.banned_ai_words ?? [])]),
    );

    const style = await prisma.styleModel.create({
      data: {
        projectId: project.id,
        name,
        status: "analyzed",
        features,
        forbiddenWords,
        corpusChunks: {
          create: [
            ...chunks.map((content) => ({
              content,
              type: "core",
              meta: { source: "coreText" },
            })),
            ...(sketchText
              ? [
                  {
                    content: sketchText,
                    type: "sketch",
                    meta: { source: "sketchText" },
                  },
                ]
              : []),
            ...(negativeText
              ? [
                  {
                    content: negativeText,
                    type: "negative",
                    meta: { source: "negativeText" },
                  },
                ]
              : []),
          ],
        },
        calibrationLog: {
          create: {
            action: "initial_analysis",
            payload: { features },
          },
        },
      },
      include: {
        corpusChunks: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      styleModel: {
        id: style.id,
        name: style.name,
        status: style.status,
        features: style.features,
        forbiddenWords: style.forbiddenWords,
        chunkCount: style.corpusChunks.length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
