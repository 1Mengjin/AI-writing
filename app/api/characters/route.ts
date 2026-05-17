import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

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

export async function GET() {
  const project = await getMorenProject();
  const list = await prisma.character.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ list });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const data = buildData(body);

    if (!data.jing.name) {
      return NextResponse.json({ error: "角色姓名不能为空" }, { status: 400 });
    }

    const project = await getMorenProject();
    const item = await prisma.character.create({
      data: {
        projectId: project.id,
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
