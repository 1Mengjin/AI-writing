import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

export async function GET() {
  const project = await getMorenProject();
  const list = await prisma.characterRelation.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ list });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const characterA = String(body.characterA ?? "");
    const characterB = String(body.characterB ?? "");
    const affinity = Number(body.affinity ?? 0);
    const notes = String(body.notes ?? "");

    if (!characterA || !characterB || characterA === characterB) {
      return NextResponse.json({ error: "关系角色不正确" }, { status: 400 });
    }

    const project = await getMorenProject();
    const item = await prisma.characterRelation.create({
      data: {
        projectId: project.id,
        characterA,
        characterB,
        affinity,
        notes,
      },
    });

    return NextResponse.json({ item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
