"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlertTriangle,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

type OocEntity = {
  id: string;
  kind: string;
  keywords: string[];
  data: unknown;
};

type OocConflict = {
  level: "A" | "B" | "C";
  entity: string;
  rule_broken: string;
  reminder_text: string;
};

type OocData = {
  has_conflict?: boolean;
  conflicts?: OocConflict[];
  error?: string;
};

type OocLog = OocConflict & {
  id: string;
  time: string;
};

type ManyouMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ManyouData = {
  text?: string;
  error?: string;
};

type Luxian = {
  name: string;
  turn: string;
  roles: string[];
};

type MaiLuoData = {
  list?: Luxian[];
  error?: string;
};

type StyleBrief = {
  id: string;
  name: string;
};

type ExpandData = {
  draft?: string;
  error?: string;
};

const qingGanData = [
  { name: "1", tension: 22 },
  { name: "2", tension: 48 },
  { name: "3", tension: 35 },
  { name: "4", tension: 72 },
  { name: "5", tension: 58 },
  { name: "6", tension: 86 },
];

const jiezouData = [
  { name: "动作", value: 30, color: "#dc2626" },
  { name: "对话", value: 46, color: "#2563eb" },
  { name: "描写", value: 28, color: "#16a34a" },
  { name: "内心", value: 18, color: "#9333ea" },
  { name: "信息", value: 20, color: "#f59e0b" },
];

export default function XiezuoshiPage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [expandMode, setExpandMode] = useState(false);
  const [outline, setOutline] = useState("");
  const [draft, setDraft] = useState("");
  const [rewriteNote, setRewriteNote] = useState("");
  const [expandLoading, setExpandLoading] = useState(false);
  const [expandError, setExpandError] = useState("");
  const [styleId, setStyleId] = useState("");
  const [styleList, setStyleList] = useState<StyleBrief[]>([]);
  const [jiaoshoujia, setJiaoshoujia] = useState(false);
  const [jiegouTab, setJiegouTab] = useState<"qinggan" | "mailuo" | "jiezou">(
    "qinggan",
  );
  const [maiLuoList, setMaiLuoList] = useState<Luxian[]>([]);
  const [maiLuoLoading, setMaiLuoLoading] = useState(false);
  const [maiLuoError, setMaiLuoError] = useState("");
  const [manyouInput, setManyouInput] = useState("");
  const [manyouJilu, setManyouJilu] = useState<ManyouMsg[]>([]);
  const [manyouLoading, setManyouLoading] = useState(false);
  const [manyouError, setManyouError] = useState("");
  const [entityList, setEntityList] = useState<OocEntity[]>([]);
  const [oocLogs, setOocLogs] = useState<OocLog[]>([]);
  const [oocStatus, setOocStatus] = useState("白名单未加载");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckRef = useRef("");
  const entityRef = useRef<OocEntity[]>([]);

  const extensions = useMemo(
    () => [
      StarterKit,
      Placeholder.configure({
        placeholder: "从一句不完整的话开始。工具会等你需要时再出现。",
      }),
    ],
    [],
  );

  function findMatched(text: string) {
    const part = text.slice(-500);

    return entityRef.current.filter((item) =>
      item.keywords.some((key) => key && part.includes(key)),
    );
  }

  async function jianchaOoc(text: string) {
    const paragraph = text.slice(-500).trim();

    if (!paragraph || paragraph === lastCheckRef.current) {
      return;
    }

    const matched = findMatched(paragraph);

    if (matched.length === 0) {
      setOocStatus("未命中触发词");
      return;
    }

    lastCheckRef.current = paragraph;
    setOocStatus(`命中 ${matched.length} 个实体，正在静默校验`);

    try {
      const res = await fetch("/api/ooc-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraph, entities: matched }),
      });
      const data = (await res.json()) as OocData;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "OOC 校验失败");
      }

      if (!data.has_conflict || !data.conflicts?.length) {
        setOocStatus("未发现冲突");
        return;
      }

      const time = new Date().toLocaleTimeString();
      const nextLogs = data.conflicts.map((item, index) => ({
        ...item,
        id: `${Date.now()}-${index}`,
        time,
      }));

      setOocLogs((old) => [...nextLogs, ...old].slice(0, 30));
      setOocStatus(`发现 ${nextLogs.length} 条提醒`);
    } catch (err) {
      setOocStatus(err instanceof Error ? err.message : "OOC 校验失败");
    }
  }

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[68vh] outline-none text-lg leading-9 font-serif text-foreground",
      },
    },
    onUpdate({ editor: nowEditor }) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const text = nowEditor.getText();

      timerRef.current = setTimeout(() => {
        void jianchaOoc(text);
      }, 3000);
    },
  });

  async function fasongWenti(input: string, intent = "") {
    const text = input.trim();

    if (!text && !intent) return;

    setManyouLoading(true);
    setManyouError("");

    const userMsg: ManyouMsg | null = text
      ? {
          id: `${Date.now()}-u`,
          role: "user",
          content: text,
        }
      : null;
    const nextJilu = userMsg ? [...manyouJilu, userMsg] : manyouJilu;

    if (userMsg) {
      setManyouJilu(nextJilu);
      setManyouInput("");
    }

    try {
      const res = await fetch("/api/inspiration-roam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: text,
          intent,
          nowText: editor?.getText() ?? "",
          manyouJilu: nextJilu.map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      });
      const data = (await res.json()) as ManyouData;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "漫游失败");
      }

      const aiMsg: ManyouMsg = {
        id: `${Date.now()}-a`,
        role: "assistant",
        content: data.text ?? "",
      };

      setManyouJilu((old) => [...old, aiMsg]);
    } catch (err) {
      setManyouError(err instanceof Error ? err.message : "漫游失败");
    } finally {
      setManyouLoading(false);
    }
  }

  function onManyouKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    void fasongWenti(manyouInput);
  }

  async function maiLuoTuiYan() {
    const draft = editor?.getText().trim() ?? "";

    if (!draft) {
      setMaiLuoError("先写一点文稿");
      return;
    }

    setMaiLuoLoading(true);
    setMaiLuoError("");

    try {
      const res = await fetch("/api/plot-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = (await res.json()) as MaiLuoData;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "推演失败");
      }

      setMaiLuoList(data.list ?? []);
    } catch (err) {
      setMaiLuoError(err instanceof Error ? err.message : "推演失败");
    } finally {
      setMaiLuoLoading(false);
    }
  }

  function escapeHtml(text: string) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getContextData() {
    const text = `${outline}\n${editor?.getText() ?? ""}`;
    const matched = entityList.filter((item) =>
      item.keywords.some((key) => key && text.includes(key)),
    );

    return {
      characterStates: matched
        .filter((item) => item.kind === "character")
        .map((item) => ({
          id: item.id,
          keywords: item.keywords,
          data: item.data,
        })),
      itemRules: matched
        .filter((item) => item.kind === "worldItem")
        .map((item) => ({
          id: item.id,
          keywords: item.keywords,
          data: item.data,
        })),
    };
  }

  async function expandDraft(note = "") {
    const recentText = editor?.getText().slice(-1000) ?? "";
    const contextData = getContextData();

    if (!outline.trim()) {
      setExpandError("先写大纲");
      return;
    }

    setExpandLoading(true);
    setExpandError("");

    try {
      const res = await fetch("/api/outline-expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline,
          recentText,
          styleId,
          rewriteNote: note,
          characterStates: contextData.characterStates,
          itemRules: contextData.itemRules,
        }),
      });
      const data = (await res.json()) as ExpandData;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "扩写失败");
      }

      setDraft(data.draft ?? "");
    } catch (err) {
      setExpandError(err instanceof Error ? err.message : "扩写失败");
    } finally {
      setExpandLoading(false);
    }
  }

  function acceptDraft() {
    if (!editor || !draft.trim()) return;

    const html = draft
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("");

    editor
      .chain()
      .focus()
      .setTextSelection(editor.state.doc.content.size)
      .insertContent(html)
      .run();
    setOutline("");
    setDraft("");
    setRewriteNote("");
    setExpandError("");
  }

  function discardDraft() {
    setDraft("");
    setRewriteNote("");
    setExpandError("");
  }

  function renderExpandMode() {
    const contextData = getContextData();

    return (
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-black/10 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">大纲输入</h2>
            <Button
              type="button"
              disabled={expandLoading}
              onClick={() => void expandDraft()}
            >
              {expandLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Generate
            </Button>
          </div>
          <textarea
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="写主线脉络、核心动作或对话大意。"
            className="mt-4 min-h-[62vh] w-full resize-y rounded-md border border-zinc-200 bg-[#fffdf8] p-4 text-base leading-8 outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
          />
          <div className="mt-3 grid gap-2 text-xs text-zinc-500">
            <div>recentText：自动截取主编辑器最后 1000 字</div>
            <div>characterStates：{contextData.characterStates.length}</div>
            <div>itemRules：{contextData.itemRules.length}</div>
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">草稿审批台</h2>
            <select
              value={styleId}
              onChange={(e) => setStyleId(e.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">使用最新文风</option>
              {styleList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {expandError ? (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">
              {expandError}
            </div>
          ) : null}

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="生成后的正文会先停在这里，不会直接写入主编辑器。"
            className="mt-4 min-h-[52vh] w-full resize-y rounded-md border border-zinc-200 bg-[#fffdf8] p-4 font-serif text-lg leading-9 outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
          />

          <input
            value={rewriteNote}
            onChange={(e) => setRewriteNote(e.target.value)}
            placeholder="Rewrite note，例如：动作描写太啰嗦，精简点"
            className="mt-3 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
          />

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button type="button" onClick={acceptDraft} disabled={!draft.trim()}>
              Accept & Insert
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={expandLoading}
              onClick={() => void expandDraft(rewriteNote)}
            >
              Rewrite
            </Button>
            <Button type="button" variant="outline" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        </section>
      </div>
    );
  }

  function renderJiegouPanel() {
    return (
      <aside className="rounded-lg border border-black/10 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="flex flex-wrap gap-2">
          {[
            ["qinggan", "情感曲线"],
            ["mailuo", "脉络推演"],
            ["jiezou", "节奏扫描"],
          ].map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={jiegouTab === key ? "default" : "outline"}
              onClick={() =>
                setJiegouTab(key as "qinggan" | "mailuo" | "jiezou")
              }
            >
              {label}
            </Button>
          ))}
        </div>

        {jiegouTab === "qinggan" ? (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">情感曲线</h2>
              <span className="text-xs text-zinc-500">点击点位预留标注</span>
            </div>
            <div className="h-72 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qingGanData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="tension"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    onClick={() => setMaiLuoError("手动标注入口已预留")}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {jiegouTab === "mailuo" ? (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">脉络推演</h2>
              <Button
                type="button"
                size="sm"
                disabled={maiLuoLoading}
                onClick={() => void maiLuoTuiYan()}
              >
                {maiLuoLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                获取推演
              </Button>
            </div>

            {maiLuoError ? (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">
                {maiLuoError}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              {maiLuoList.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
                  暂无路线。点击获取推演后只会生成纲要卡片。
                </div>
              ) : (
                maiLuoList.map((item) => (
                  <article
                    key={`${item.name}-${item.turn}`}
                    className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="mt-2 leading-6 text-zinc-700 dark:text-zinc-300">
                      {item.turn}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-300 dark:text-black"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : null}

        {jiegouTab === "jiezou" ? (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">节奏扫描</h2>
              <span className="text-xs text-zinc-500">模拟数据占位</span>
            </div>
            <div className="h-72 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jiezouData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={50} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                    {jiezouData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </aside>
    );
  }

  useEffect(() => {
    let stop = false;

    fetch("/api/ooc-whitelist")
      .then((res) => res.json())
      .then((data: { entities?: OocEntity[] }) => {
        if (stop) return;
        const list = data.entities ?? [];
        entityRef.current = list;
        setEntityList(list);
        setOocStatus(`已加载 ${list.length} 个实体`);
      })
      .catch(() => {
        if (!stop) setOocStatus("白名单加载失败");
      });

    return () => {
      stop = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    let stop = false;

    fetch("/api/style-models")
      .then((res) => res.json())
      .then((data: { list?: StyleBrief[] }) => {
        if (stop) return;
        const list = data.list ?? [];
        setStyleList(list);

        if (list[0]) {
          setStyleId(list[0].id);
        }
      })
      .catch(() => {
        if (!stop) setStyleList([]);
      });

    return () => {
      stop = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div
        className={
          expandMode
            ? "mx-auto max-w-[1500px] px-5 py-8"
            : jiaoshoujia && leftOpen
            ? "mx-auto grid max-w-[1500px] gap-5 px-5 py-8 xl:grid-cols-[320px_1fr]"
            : jiaoshoujia
              ? "mx-auto grid max-w-[1500px] gap-5 px-5 py-8 xl:grid-cols-[52px_1fr]"
              : leftOpen
            ? "mx-auto grid max-w-[1500px] gap-5 px-5 py-8 xl:grid-cols-[320px_1fr_340px]"
            : "mx-auto grid max-w-[1500px] gap-5 px-5 py-8 xl:grid-cols-[52px_1fr_340px]"
        }
      >
        {!expandMode ? (
        <aside className="rounded-lg border border-black/10 bg-zinc-950 text-zinc-50 shadow-sm dark:border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 p-3">
            {leftOpen ? <h2 className="text-lg font-semibold">灵感漫游</h2> : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setLeftOpen((old) => !old)}
            >
              {leftOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          </div>

          {leftOpen ? (
            <div className="flex h-[78vh] flex-col p-4">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {manyouJilu.length === 0 ? (
                  <div className="rounded-md border border-dashed border-white/15 p-4 text-sm leading-6 text-zinc-400">
                    写一个模糊念头。这里不会替你写，只会追问。
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {manyouJilu.map((item) => (
                      <article
                        key={item.id}
                        className={
                          item.role === "user"
                            ? "ml-8 rounded-md bg-amber-300 p-3 text-sm leading-6 text-black"
                            : "mr-8 rounded-md bg-zinc-900 p-3 text-sm leading-6 text-zinc-100"
                        }
                      >
                        <div className="whitespace-pre-wrap">{item.content}</div>
                        {item.role === "assistant" ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void fasongWenti(
                                  "",
                                  `围绕这条回应展开聊聊：${item.content}`,
                                )
                              }
                              className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
                            >
                              展开聊聊
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void fasongWenti(
                                  "",
                                  `换一个方向，不沿用这条回应：${item.content}`,
                                )
                              }
                              className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
                            >
                              不，换个方向
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {manyouError ? (
                <div className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-2 text-sm text-red-200">
                  {manyouError}
                </div>
              ) : null}

              <div className="mt-3">
                <textarea
                  value={manyouInput}
                  onChange={(e) => setManyouInput(e.target.value)}
                  onKeyDown={onManyouKey}
                  placeholder="写一个模糊的念头，然后按 Enter"
                  className="min-h-24 w-full resize-none rounded-md border border-white/10 bg-zinc-900 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-amber-300"
                />
                <Button
                  type="button"
                  disabled={manyouLoading}
                  onClick={() => void fasongWenti(manyouInput)}
                  className="mt-2 w-full"
                >
                  {manyouLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {manyouLoading ? "正在追问" : "发送"}
                </Button>
              </div>
            </div>
          ) : null}
        </aside>
        ) : null}

        <section className="rounded-lg border border-black/10 bg-[#fffdf8] p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <header className="mb-6 flex items-center justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/10">
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                故事工坊 / OOC 静默检测
              </div>
              <h1 className="mt-1 text-2xl font-semibold">写作室</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={jiaoshoujia ? "default" : "outline"}
                onClick={() => {
                  setExpandMode(false);
                  setJiaoshoujia((old) => !old);
                }}
              >
                脚手架模式
              </Button>
              <Button
                type="button"
                variant={expandMode ? "default" : "outline"}
                onClick={() => {
                  setJiaoshoujia(false);
                  setExpandMode((old) => !old);
                }}
              >
                扩写模式
              </Button>
              <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-300 dark:text-black">
                <Target className="size-4" />
                停笔 3 秒后才检查
              </div>
            </div>
          </header>

          {expandMode ? (
            renderExpandMode()
          ) : jiaoshoujia ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <EditorContent editor={editor} className="xiezuo-editor" />
              {renderJiegouPanel()}
            </div>
          ) : (
            <EditorContent editor={editor} className="xiezuo-editor" />
          )}
        </section>

        {!jiaoshoujia && !expandMode ? (
        <aside className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-600" />
            <h2 className="text-xl font-semibold">上下文感知</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {oocStatus}
          </p>

          <div className="mt-5">
            <h3 className="text-sm font-medium">哨兵日志</h3>
            <div className="mt-3 grid gap-3">
              {oocLogs.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
                  暂无提醒。这里不会弹窗。
                </div>
              ) : (
                oocLogs.map((log) => (
                  <article
                    key={log.id}
                    className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="size-4" />
                        {log.level} / {log.entity}
                      </span>
                      <span className="text-xs opacity-70">{log.time}</span>
                    </div>
                    <p>{log.reminder_text}</p>
                    <p className="mt-2 text-xs opacity-75">{log.rule_broken}</p>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium">已加载实体</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {entityList.slice(0, 20).map((item) => (
                <span
                  key={item.id}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
                >
                  {item.keywords[0] ?? item.kind}
                </span>
              ))}
            </div>
          </div>
        </aside>
        ) : null}
      </div>
    </main>
  );
}
