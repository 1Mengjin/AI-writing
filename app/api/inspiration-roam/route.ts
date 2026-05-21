import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ManyouMsg = {
  role: "user" | "assistant";
  content: string;
};

const SHITING_KEYS = [
  "视频",
  "分镜",
  "剪辑",
  "画面",
  "镜头",
  "转场",
  "音效",
  "配乐",
  "旁白",
  "景别",
  "机位",
  "调度",
];

const SYSTEM_PROMPT = `
你是创作者的“外置大脑秘书”和“视听/叙事顾问”。

核心边界：
- 坚决不代写正文、小说段落、脚本台词、完整分镜脚本或可直接发布的成稿。
- 你只负责提炼、梳理、诊断、追问和给方向，不能替用户完成表达。
- 用户给出的内容可能跳跃、琐碎、不完整。你要保持共鸣，但语言必须精准、客观，不要空泛夸奖。
- 如果用户前提矛盾、逻辑断层明显，要直接指出，并说明断在哪里。

双轨感知：
- 当输入、当前随笔或历史对话中出现“视频、分镜、剪辑、画面、转场、音效、镜头、配乐、旁白、景别、机位、调度”等词汇时，自动切换到视听语言思维。
- 视听语言思维要从画面意象、节奏张力、镜头调度、声音设计、情绪曲线角度给指点。
- 未命中视听词时，默认按文本叙事和随笔写作思维处理，关注主题线索、语气、结构、反直觉闪光点。

输出格式：
- 必须使用干净 Markdown。
- 必须包含这些小标题：
【核心意象提炼】
【外置大脑逻辑梳理】
【视听/叙事改进指点】
【深度追问】
- 每个小标题下用 2-4 条短要点，不要写成整段粘稠大文本。
- 【深度追问】必须给 2-3 个问题，问题要具体、有启发性，能促使创作者继续发散。
- 不要输出“以下是正文”“我帮你写一版”“可以这样写”等代写暗示。
`.trim();

async function callDeepSeek(content: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 DEEPSEEK_API_KEY");
  }

  const res = await fetch(
    process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_WRITE_MODEL ?? "deepseek-v4-pro",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.7,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek 调用失败：${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;

  if (typeof text !== "string") {
    throw new Error("DeepSeek 返回格式异常");
  }

  return text.trim();
}

function cleanManyouJilu(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is ManyouMsg => {
      if (!item || typeof item !== "object") return false;
      const msg = item as Partial<ManyouMsg>;
      return (
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string"
      );
    })
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(-800),
    }))
    .filter((item) => item.content);
}

function hasShitingSignal(text: string) {
  return SHITING_KEYS.some((key) => text.includes(key));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = String(body.input ?? "").trim();
    const intent = String(body.intent ?? "").trim();
    const nowText = String(body.nowText ?? "").slice(-1200);
    const manyouJilu = cleanManyouJilu(body.manyouJilu);

    if (!input && !intent) {
      return NextResponse.json({ error: "缺少输入" }, { status: 400 });
    }

    const historyText = manyouJilu
      .map((item) => `${item.role === "user" ? "用户" : "外置大脑"}：${item.content}`)
      .join("\n");
    const allText = `${input}\n${intent}\n${nowText}\n${historyText}`;
    const mode = hasShitingSignal(allText) ? "视听语言思维" : "文本叙事思维";

    const content = `
# 当前模式
${mode}

# 主编辑器随笔内容
${nowText || "暂无"}

# 历史对话记录
${historyText || "暂无"}

# 用户输入
${input || "暂无"}

# 下一步意图
${intent || "正常漫游回应"}

# 输出要求
按系统提示词规定的 Markdown 小标题输出。禁止代写正文或脚本，只做提炼、梳理、指点和追问。
`.trim();

    const text = await callDeepSeek(content);

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
