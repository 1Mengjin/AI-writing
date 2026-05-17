import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function buildData(body: Record<string, unknown>) {
  return {
    jing: {
      name: String(body.name ?? ""),
      gender: String(body.gender ?? ""),
      age: String(body.age ?? ""),
      faction: String(body.faction ?? ""),
      race: String(body.race ?? ""),
      mbti: String(body.mbti ?? ""),
      trauma: String(body.trauma ?? ""),
      values: String(body.values ?? ""),
    },
    dong: {
      want: String(body.want ?? ""),
      secret: String(body.secret ?? ""),
      stress: String(body.stress ?? ""),
      items: String(body.items ?? ""),
      currentEmotion: String(body.currentEmotion ?? ""),
      currentLocation: String(body.currentLocation ?? ""),
    },
    xingwei: {
      languageStyle: String(body.languageStyle ?? ""),
    },
  };
}

function getKeywords(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  return Array.from(new Set([name].filter(Boolean)));
}

export async function PUT(req: NextRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const project = await getMorenProject();

    const result = await prisma.character.updateMany({
      where: { id, projectId: project.id },
      data: {
        triggerKeywords: getKeywords(body),
        data: buildData(body),
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const item = await prisma.character.findFirst({
      where: { id, projectId: project.id },
    });

    return NextResponse.json({ item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const project = await getMorenProject();

    const result = await prisma.character.deleteMany({
      where: { id, projectId: project.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
