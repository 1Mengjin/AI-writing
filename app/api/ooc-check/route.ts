import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOocPrompt } from "@/lib/prompt";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

function parseJson(text: string) {
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

  return JSON.parse(clean.slice(start, end + 1)) as {
    has_conflict: boolean;
    conflicts: {
      level: "A" | "B" | "C";
      entity: string;
      rule_broken: string;
      reminder_text: string;
    }[];
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
            content: "你只输出合法 JSON，不要输出 Markdown 或解释。",
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

  return parseJson(text);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paragraph = String(body.paragraph ?? "").trim();
    const entities = Array.isArray(body.entities) ? body.entities : [];

    if (!paragraph) {
      return NextResponse.json({ error: "缺少段落" }, { status: 400 });
    }

    if (entities.length === 0) {
      return NextResponse.json({ error: "缺少实体规则" }, { status: 400 });
    }

    const prompt = await getOocPrompt();
    const content = `
${prompt}

[Entity Rules]:
${JSON.stringify(entities)}

[Target Text]:
${paragraph}
`.trim();

    const result = await callDeepSeek(content);

    if (result.has_conflict && result.conflicts.length > 0) {
      const project = await getMorenProject();

      await prisma.sentinelLog.create({
        data: {
          projectId: project.id,
          conflictDescription: JSON.stringify(result.conflicts),
        },
      });

      const old = await prisma.sentinelLog.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        skip: 100,
        select: { id: true },
      });

      if (old.length > 0) {
        await prisma.sentinelLog.deleteMany({
          where: { id: { in: old.map((item) => item.id) } },
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
