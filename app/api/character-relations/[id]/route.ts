import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const project = await getMorenProject();
    const result = await prisma.characterRelation.deleteMany({
      where: { id, projectId: project.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "关系不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
