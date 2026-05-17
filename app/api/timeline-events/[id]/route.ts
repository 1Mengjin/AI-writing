import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function getList(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }

  return String(raw ?? "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildData(body: Record<string, unknown>) {
  return {
    title: String(body.title ?? ""),
    time: String(body.time ?? ""),
    status: String(body.status ?? "计划中"),
    summary: String(body.summary ?? ""),
    characterIds: getList(body.characterIds),
    locationId: String(body.locationId ?? ""),
    textLink: String(body.textLink ?? ""),
    relatedEventIds: getList(body.relatedEventIds),
    relationNote: String(body.relationNote ?? ""),
  };
}

export async function PUT(req: NextRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const project = await getMorenProject();

    const result = await prisma.timelineEvent.updateMany({
      where: { id, projectId: project.id },
      data: { data: buildData(body) },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "事件不存在" }, { status: 404 });
    }

    const item = await prisma.timelineEvent.findFirst({
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
    const result = await prisma.timelineEvent.deleteMany({
      where: { id, projectId: project.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "事件不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
