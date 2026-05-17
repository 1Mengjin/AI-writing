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
    const forbiddenWords = Array.isArray(body.forbiddenWords)
      ? body.forbiddenWords.map(String).filter(Boolean)
      : [];
    const sliders = toObj(body.sliders);

    if (!styleId) {
      return NextResponse.json({ error: "缺少文风模型" }, { status: 400 });
    }

    const style = await prisma.styleModel.findUnique({
      where: { id: styleId },
    });

    if (!style) {
      return NextResponse.json({ error: "文风模型不存在" }, { status: 404 });
    }

    const features = toObj(style.features);
    const next = await prisma.styleModel.update({
      where: { id: styleId },
      data: {
        forbiddenWords,
        features: {
          ...features,
          sliders,
        } as Prisma.InputJsonValue,
      },
    });

    await prisma.calibrationLog.create({
      data: {
        styleModelId: styleId,
        action: "style_control",
        payload: { forbiddenWords, sliders } as Prisma.InputJsonValue,
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
