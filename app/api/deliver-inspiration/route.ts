import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
你是创作者的资产整理秘书。传入的内容是一段极其跳跃、破碎的灵感或对话。

请在不扭曲原意的前提下，为其生成一段【结构化归档摘要】。
摘要需说明：
- 这段想法在叙事或视频制作上的闪光点是什么。
- 核心因果是什么。
- 后续创作时最值得保留的资产是什么。

不要输出任何多余的客套话，直接返回摘要正文。
`.trim();

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
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.3,
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

function buildArchiveBlock(content: string, summary: string) {
  const time = new Date().toISOString();

  return `

---

【灵感资产投递｜${time}】

【结构化归档摘要】
${summary}

【原始碎片】
${content}
`.trimEnd();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const content = String(body.content ?? "").trim();
    const targetType = body.targetType;
    const targetId = String(body.targetId ?? "").trim();

    if (!content) {
      return NextResponse.json({ error: "缺少投递内容" }, { status: 400 });
    }

    if (targetType !== "chapter" && targetType !== "session") {
      return NextResponse.json(
        { error: "targetType 只能是 chapter 或 session" },
        { status: 400 },
      );
    }

    if (targetType === "chapter" && !targetId) {
      return NextResponse.json({ error: "缺少 Chapter ID" }, { status: 400 });
    }

    const summary = await callDeepSeek(`
# 原始灵感或对话
${content.slice(-8000)}
`.trim());

    const project = await getMorenProject();
    const archiveBlock = buildArchiveBlock(content, summary);

    if (targetType === "chapter") {
      const chapter = await prisma.chapter.findFirst({
        where: {
          id: targetId,
          projectId: project.id,
        },
      });

      if (!chapter) {
        return NextResponse.json({ error: "未找到目标 Chapter" }, { status: 404 });
      }

      const item = await prisma.chapter.update({
        where: { id: chapter.id },
        data: {
          content: `${chapter.content || ""}${archiveBlock}`,
        },
      });

      return NextResponse.json({
        ok: true,
        targetType,
        targetId: item.id,
        summary,
      });
    }

    const item = await prisma.writingSession.create({
      data: {
        projectId: project.id,
        note: archiveBlock,
        stats: {
          type: "inspiration_archive",
          source: "deliver-inspiration",
          summary,
          rawText: content,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      targetType,
      targetId: item.id,
      summary,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
