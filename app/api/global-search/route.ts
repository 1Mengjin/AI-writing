import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMorenProject } from "@/lib/project";

export const runtime = "nodejs";

type SearchRow = {
  id: string;
  title: string;
  text: string | null;
  createdAt: Date;
};

type SearchItem = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
};

function cleanKeyword(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return String(params.get("tag") ?? params.get("keyword") ?? "").trim();
}

function cutText(text: string, keyword: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const index = clean.toLowerCase().indexOf(keyword.toLowerCase());

  if (index === -1) return clean.slice(0, 260);

  const start = Math.max(0, index - 90);
  const end = Math.min(clean.length, index + keyword.length + 170);

  return clean.slice(start, end);
}

function toItem(row: SearchRow, keyword: string): SearchItem {
  return {
    id: row.id,
    title: row.title,
    text: cutText(row.text ?? "", keyword),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const keyword = cleanKeyword(req);

    if (!keyword) {
      return NextResponse.json({ error: "缺少 tag 或 keyword" }, { status: 400 });
    }

    const project = await getMorenProject();
    const like = `%${keyword}%`;

    const sessions = await prisma.$queryRaw<SearchRow[]>`
      SELECT
        id,
        '随笔日志' AS title,
        COALESCE(note, stats::text) AS text,
        created_at AS "createdAt"
      FROM writing_sessions
      WHERE project_id = ${project.id}
        AND (
          note ILIKE ${like}
          OR stats::text ILIKE ${like}
        )
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const chapters = await prisma.$queryRaw<SearchRow[]>`
      SELECT
        id,
        title,
        content AS text,
        created_at AS "createdAt"
      FROM chapters
      WHERE project_id = ${project.id}
        AND (
          title ILIKE ${like}
          OR content ILIKE ${like}
        )
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const list = [...sessions, ...chapters]
      .map((item) => toItem(item, keyword))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return NextResponse.json({ list });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
