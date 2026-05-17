import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const styleId = searchParams.get("styleId") || "";

    if (!styleId) {
      return NextResponse.json({ error: "缺少模型ID" }, { status: 400 });
    }

    // 查询该模型下最新的 50 条 A/B 测试记录
    const list = await prisma.calibrationLog.findMany({
      where: { 
        styleModelId: styleId,
        action: "ab_choice"
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ list });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}