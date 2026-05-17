import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

export async function GET() {
  const project = await getMorenProject();
  const [jueseList, wupinList] = await Promise.all([
    prisma.character.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.worldItem.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const entities = [
    ...jueseList.map((item) => ({
      id: item.id,
      kind: "character",
      keywords: item.triggerKeywords,
      data: item.data,
    })),
    ...wupinList.map((item) => ({
      id: item.id,
      kind: "worldItem",
      keywords: item.triggerKeywords,
      data: item.data,
    })),
  ];

  return NextResponse.json({ entities });
}
