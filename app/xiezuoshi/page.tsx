"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlertTriangle,
  Loader2,
  Send,
  ShieldCheck,
  Target,
} from "lucide-react";
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

type MetaItem = {
  name: string;
  description: string;
};

type ExtractedMeta = {
  characters: MetaItem[];
  worldItems: MetaItem[];
  events: MetaItem[];
  error?: string;
};

type ChapterItem = {
  id: string;
  title: string;
};

type SearchItem = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
};

const quickTags = ["#随笔随笔", "#人设演变", "#视频转场", "#宏观构想"];

export default function XiezuoshiPage() {
  const [manyouInput, setManyouInput] = useState("");
  const [manyouJilu, setManyouJilu] = useState<ManyouMsg[]>([]);
  const [manyouLoading, setManyouLoading] = useState(false);
  const [manyouError, setManyouError] = useState("");
  const [entityList, setEntityList] = useState<OocEntity[]>([]);
  const [oocLogs, setOocLogs] = useState<OocLog[]>([]);
  const [oocStatus, setOocStatus] = useState("白名单未加载");
  const [extractedMeta, setExtractedMeta] = useState<ExtractedMeta | null>(
    null,
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaMsg, setMetaMsg] = useState("");
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [leftArchiveTarget, setLeftArchiveTarget] = useState("session");
  const [rightArchiveTarget, setRightArchiveTarget] = useState("session");
  const [leftDelivering, setLeftDelivering] = useState(false);
  const [rightDelivering, setRightDelivering] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [activeTag, setActiveTag] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [copiedSearchId, setCopiedSearchId] = useState("");
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

  function hasMeta(data: ExtractedMeta | null) {
    if (!data) return false;
    return (
      data.characters.length > 0 ||
      data.worldItems.length > 0 ||
      data.events.length > 0
    );
  }

  async function loadEntityList() {
    const res = await fetch("/api/ooc-whitelist");
    const data = (await res.json()) as { entities?: OocEntity[] };
    const list = data.entities ?? [];

    entityRef.current = list;
    setEntityList(list);
    setOocStatus(`已加载 ${list.length} 个实体`);
  }

  async function scanMeta() {
    const nowText = editor?.getText().trim() ?? "";

    if (!nowText) {
      setMetaError("先写一点随笔再扫描");
      return;
    }

    setIsExtracting(true);
    setMetaError("");
    setMetaMsg("");

    try {
      const res = await fetch("/api/extract-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nowText }),
      });
      const data = (await res.json()) as ExtractedMeta;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "提取失败");
      }

      setExtractedMeta({
        characters: data.characters ?? [],
        worldItems: data.worldItems ?? [],
        events: data.events ?? [],
      });
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : "提取失败");
    } finally {
      setIsExtracting(false);
    }
  }

  async function postJson(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };

    if (!res.ok || data.error) {
      throw new Error(data.error ?? "同步失败");
    }
  }

  async function syncMeta() {
    if (!hasMeta(extractedMeta) || !extractedMeta) return;

    setSyncLoading(true);
    setMetaError("");
    setMetaMsg("");

    try {
      for (const item of extractedMeta.characters) {
        await postJson("/api/characters", {
          name: item.name,
          values: item.description,
        });
      }

      for (const item of extractedMeta.worldItems) {
        await postJson("/api/world-items", {
          name: item.name,
          type: "设定",
          desc: item.description,
          rules: item.description,
        });
      }

      for (const item of extractedMeta.events) {
        await postJson("/api/timeline-events", {
          title: item.name,
          status: "已提取",
          summary: item.description,
        });
      }

      setExtractedMeta(null);
      setMetaMsg("已同步到设定集");
      await loadEntityList();
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : "同步失败");
    } finally {
      setSyncLoading(false);
    }
  }

  function getArchiveTarget(value: string) {
    if (value === "session") {
      return { targetType: "session", targetId: "" };
    }

    return {
      targetType: "chapter",
      targetId: value.replace(/^chapter:/, ""),
    };
  }

  function getManyouContent() {
    return manyouJilu
      .map((item) => `${item.role === "user" ? "用户" : "外置大脑"}：${item.content}`)
      .join("\n\n")
      .trim();
  }

  async function deliverArchive(source: "left" | "right") {
    const isLeft = source === "left";
    const content = isLeft ? getManyouContent() : (editor?.getText().trim() ?? "");
    const targetValue = isLeft ? leftArchiveTarget : rightArchiveTarget;
    const { targetType, targetId } = getArchiveTarget(targetValue);

    if (!content) {
      setArchiveError(isLeft ? "暂无漫游对话可投递" : "暂无随笔内容可投递");
      return;
    }

    setArchiveError("");
    setArchiveMsg("");
    if (isLeft) {
      setLeftDelivering(true);
    } else {
      setRightDelivering(true);
    }

    try {
      const res = await fetch("/api/deliver-inspiration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          targetType,
          targetId,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "投递失败");
      }

      if (isLeft) {
        setManyouInput("");
      }
      setArchiveMsg("资产已成功打包投递，已收入大脑分支");
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "投递失败");
    } finally {
      if (isLeft) {
        setLeftDelivering(false);
      } else {
        setRightDelivering(false);
      }
    }
  }

  async function searchBrain(raw: string) {
    const tag = raw.trim();

    if (!tag) {
      setSearchResults([]);
      setActiveTag("");
      return;
    }

    setActiveTag(tag);
    setIsSearching(true);
    setSearchError("");

    try {
      const res = await fetch(
        `/api/global-search?tag=${encodeURIComponent(tag.replace(/^#/, ""))}`,
      );
      const data = (await res.json()) as {
        list?: SearchItem[];
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "检索失败");
      }

      setSearchResults(data.list ?? []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "检索失败");
    } finally {
      setIsSearching(false);
    }
  }

  function copySearchItem(item: SearchItem) {
    const text = `[${item.title}] ${new Date(item.createdAt).toLocaleString()}\n\n${item.text}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSearchId(item.id);
      setTimeout(() => setCopiedSearchId(""), 1500);
    });
  }

  function renderMetaGroup(title: string, list: MetaItem[]) {
    if (list.length === 0) return null;

    return (
      <div>
        <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {title}
        </h4>
        <div className="mt-2 grid gap-2">
          {list.map((item) => (
            <article
              key={`${title}-${item.name}-${item.description}`}
              className="rounded-md border border-zinc-200 bg-white/70 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="font-medium">{item.name}</div>
              <p className="mt-1 leading-6 text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderArchiveBox(source: "left" | "right") {
    const isLeft = source === "left";
    const target = isLeft ? leftArchiveTarget : rightArchiveTarget;
    const setTarget = isLeft ? setLeftArchiveTarget : setRightArchiveTarget;
    const loading = isLeft ? leftDelivering : rightDelivering;
    const dark = isLeft;

    return (
      <div
        className={
          dark
            ? "mt-4 rounded-lg border border-white/10 bg-white/5 p-3"
            : "mt-6 rounded-lg border border-black/10 bg-[#fffdf8] p-4 dark:border-white/10 dark:bg-zinc-950"
        }
      >
        <h3
          className={
            dark
              ? "text-sm font-semibold text-zinc-100"
              : "text-sm font-semibold"
          }
        >
          一键归档至外置大脑
        </h3>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={
            dark
              ? "mt-3 h-9 w-full rounded-md border border-white/10 bg-zinc-900 px-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-amber-300"
              : "mt-3 h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-800 dark:bg-zinc-900"
          }
        >
          <option value="session">归档为独立随笔日志</option>
          {chapters.map((item) => (
            <option key={item.id} value={`chapter:${item.id}`}>
              投递至已有文章/视频：{item.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          disabled={loading}
          onClick={() => void deliverArchive(source)}
          className="mt-3 w-full"
          variant={dark ? "default" : "outline"}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {loading ? "正在投递" : "确认投递打包"}
        </Button>
        {archiveError ? (
          <div
            className={
              dark
                ? "mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-200"
                : "mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-600"
            }
          >
            {archiveError}
          </div>
        ) : null}
        {archiveMsg ? (
          <div
            className={
              dark
                ? "mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-2 text-xs text-emerald-200"
                : "mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300"
            }
          >
            {archiveMsg}
          </div>
        ) : null}
      </div>
    );
  }

  function renderBrainIndex() {
    return (
      <div className="mt-6 rounded-lg border border-black/10 bg-white/75 p-4 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">大脑索引看板</h3>
          {isSearching ? (
            <Loader2 className="size-4 animate-spin text-zinc-500" />
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {quickTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => void searchBrain(tag)}
              className={
                activeTag === tag
                  ? "rounded-md bg-zinc-950 px-2 py-1 text-xs text-white dark:bg-amber-300 dark:text-black"
                  : "rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }
            >
              {tag}
            </button>
          ))}
        </div>

        <input
          value={activeTag}
          onChange={(e) => setActiveTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void searchBrain(activeTag);
            }
          }}
          placeholder="搜索旧灵感、标签或关键词"
          className="mt-3 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-800 dark:bg-zinc-900"
        />

        {searchError ? (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-600">
            {searchError}
          </div>
        ) : null}

        <div className="mt-3 max-h-80 overflow-y-auto pr-1">
          {searchResults.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-3 text-sm text-zinc-500 dark:border-zinc-700">
              {activeTag ? "暂无匹配记录。" : "选择标签或输入关键词开始检索。"}
            </div>
          ) : (
            <div className="grid gap-2">
              {searchResults.map((item) => (
                <article
                  key={`${item.title}-${item.id}`}
                  className="rounded-md border border-zinc-200 bg-[#fffdf8] p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">[{item.title}]</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copySearchItem(item)}
                      className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {copiedSearchId === item.id ? "已复制" : "全量复制"}
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-4 leading-6 text-zinc-600 dark:text-zinc-400">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
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

    fetch("/api/chapters")
      .then((res) => res.json())
      .then((data: { list?: ChapterItem[]; error?: string }) => {
        if (stop) return;

        if (data.error) {
          setArchiveError(data.error);
          return;
        }

        setChapters(data.list ?? []);
      })
      .catch(() => {
        if (!stop) setArchiveError("文章列表加载失败");
      });

    return () => {
      stop = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto grid max-w-[1500px] gap-5 px-5 py-8 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <aside className="rounded-lg border border-black/10 bg-zinc-950 text-zinc-50 shadow-sm dark:border-white/10">
          <div className="border-b border-white/10 p-4">
            <h2 className="text-lg font-semibold">灵感漫游</h2>
          </div>

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
              {renderArchiveBox("left")}
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
        </aside>

        <section className="rounded-lg border border-black/10 bg-[#fffdf8] p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <header className="mb-6 flex items-center justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/10">
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                随笔记录 / 静默感知
              </div>
              <h1 className="mt-1 text-2xl font-semibold">写作室</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-300 dark:text-black">
                <Target className="size-4" />
                停笔 3 秒后才检查
              </div>
            </div>
          </header>

          <EditorContent editor={editor} className="xiezuo-editor" />
        </section>

        <aside className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-600" />
            <h2 className="text-xl font-semibold">外置大脑记录感知</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isExtracting || syncLoading}
            onClick={() => void scanMeta()}
            className="mt-4 w-full border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900"
          >
            {isExtracting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isExtracting ? "正在扫描" : "🧠 扫描随笔并提取设定"}
          </Button>

          {metaError ? (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">
              {metaError}
            </div>
          ) : null}

          {metaMsg ? (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-700 dark:text-emerald-300">
              {metaMsg}
            </div>
          ) : null}

          {extractedMeta ? (
            <div className="mt-5 rounded-lg border border-black/10 bg-[#fffdf8] p-4 dark:border-white/10 dark:bg-zinc-950">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">待审查设定片段</h3>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-500 dark:bg-zinc-800">
                  {extractedMeta.characters.length +
                    extractedMeta.worldItems.length +
                    extractedMeta.events.length}
                  条
                </span>
              </div>

              {hasMeta(extractedMeta) ? (
                <div className="mt-4 grid gap-4">
                  {renderMetaGroup("人物潜在特质", extractedMeta.characters)}
                  {renderMetaGroup("事物/地点规则", extractedMeta.worldItems)}
                  {renderMetaGroup("时间线事件", extractedMeta.events)}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={syncLoading}
                    onClick={() => void syncMeta()}
                    className="w-full"
                  >
                    {syncLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    确认同步到设定集
                  </Button>
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-dashed border-zinc-300 p-3 text-sm text-zinc-500 dark:border-zinc-700">
                  没有提取到足够硬的设定事实。
                </div>
              )}
            </div>
          ) : null}

          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {oocStatus}
          </p>

          <div className="mt-5">
            <h3 className="text-sm font-medium">设定偏离提醒</h3>
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
            <h3 className="text-sm font-medium">当前随笔触及的记录</h3>
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

          {renderArchiveBox("right")}
          {renderBrainIndex()}
        </aside>
      </div>
    </main>
  );
}
