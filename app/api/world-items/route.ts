import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

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

export async function GET() {
  const project = await getMorenProject();
  const list = await prisma.worldItem.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ list });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const data = buildData(body);

    if (!data.name) {
      return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
    }

    const project = await getMorenProject();
    const item = await prisma.worldItem.create({
      data: {
        projectId: project.id,
        type: data.type,
        triggerKeywords: getKeywords(body),
        data,
      },
    });

    return NextResponse.json({ item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
