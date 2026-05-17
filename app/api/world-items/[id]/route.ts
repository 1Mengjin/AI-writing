import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function getList(raw: unknown) {
  return String(raw ?? "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildData(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? ""),
    type: String(body.type ?? "地点"),
    desc: String(body.desc ?? ""),
    rules: getList(body.rules).map((text) => ({
      text,
      active: true,
    })),
    aliases: getList(body.aliases),
    relatedCharacterIds: getList(body.relatedCharacterIds),
  };
}

function getKeywords(body: Record<string, unknown>) {
  const data = buildData(body);
  return Array.from(
    new Set([data.name, ...data.aliases].filter(Boolean)),
  );
}

export async function PUT(req: NextRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const data = buildData(body);
    const project = await getMorenProject();

    const result = await prisma.worldItem.updateMany({
      where: { id, projectId: project.id },
      data: {
        type: data.type,
        triggerKeywords: getKeywords(body),
        data,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "卡片不存在" }, { status: 404 });
    }

    const item = await prisma.worldItem.findFirst({
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
    const result = await prisma.worldItem.deleteMany({
      where: { id, projectId: project.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "卡片不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
