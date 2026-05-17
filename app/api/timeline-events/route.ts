import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

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

export async function GET() {
  const project = await getMorenProject();
  const list = await prisma.timelineEvent.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ list });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const data = buildData(body);

    if (!data.title) {
      return NextResponse.json({ error: "事件标题不能为空" }, { status: 400 });
    }

    const project = await getMorenProject();
    const item = await prisma.timelineEvent.create({
      data: {
        projectId: project.id,
        data,
      },
    });

    return NextResponse.json({ item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
