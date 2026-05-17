import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toObj(data: unknown) {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

async function clearOld(styleId: string) {
  const old = await prisma.calibrationLog.findMany({
    where: { styleModelId: styleId },
    orderBy: { createdAt: "desc" },
    skip: 50,
    select: { id: true },
  });

  if (old.length > 0) {
    await prisma.calibrationLog.deleteMany({
      where: { id: { in: old.map((item) => item.id) } },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const styleId = String(body.styleId ?? "");
    const choice = String(body.choice ?? "");
    const myText = String(body.myText ?? "");
    const scene = String(body.scene ?? "");
    const a = String(body.a ?? "");
    const b = String(body.b ?? "");

    if (!styleId || !choice) {
      return NextResponse.json({ error: "缺少校准选择" }, { status: 400 });
    }

    const style = await prisma.styleModel.findUnique({
      where: { id: styleId },
    });

    if (!style) {
      return NextResponse.json({ error: "文风模型不存在" }, { status: 404 });
    }

    const features = toObj(style.features);
    const ab = toObj(features.ab);
    const oldCount = Number(ab[choice] ?? 0);
    const nextFeatures = {
      ...features,
      ab: {
        ...ab,
        [choice]: oldCount + 1,
        lastChoice: choice,
        lastAt: new Date().toISOString(),
      },
    };

    const next = await prisma.styleModel.update({
      where: { id: styleId },
      data: {
        status: "calibrating",
        features: nextFeatures as Prisma.InputJsonValue,
      },
    });

    await prisma.calibrationLog.create({
      data: {
        styleModelId: styleId,
        action: "ab_choice",
        payload: { choice, myText, scene, a, b } as Prisma.InputJsonValue,
      },
    });
    await clearOld(styleId);

    return NextResponse.json({
      styleModel: {
        id: next.id,
        name: next.name,
        status: next.status,
        features: next.features,
        forbiddenWords: next.forbiddenWords,
        lockEnabled: next.lockEnabled,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
