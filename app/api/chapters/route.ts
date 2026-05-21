import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

export async function GET() {
  try {
    const project = await getMorenProject();
    const list = await prisma.chapter.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
      },
    });

    return NextResponse.json({ list });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
