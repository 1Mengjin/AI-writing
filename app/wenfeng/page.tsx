"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type StyleItem = {
  id: string;
  name: string;
  status: string;
  features: Record<string, unknown>;
  forbiddenWords: string[];
  lockEnabled?: boolean;
  chunkCount?: number;
};

type AbData = {
  scene: string;
  a: string;
  b: string;
  error?: string;
};

type ChaijieData = {
  syntax: string;
  rhythm: string;
  synesthesia: string;
  skeleton: string;
};

type RewriteData = {
  tongyong?: string;
  chongzuShengcheng?: string;
  error?: string;
};

type ApiList = {
  list: StyleItem[];
};

type ApiCreate = {
  styleModel?: StyleItem;
  error?: string;
};

type FenxiRes = {
  chaijieFenxi?: ChaijieData;
  error?: string;
};

const initSliders = {
  narrativeDistance: 50,
  metaphorDensity: 50,
  endingStyle: 50,
};

function getSliders(style: StyleItem | null) {
  const sliders = style?.features?.sliders;

  if (!sliders || typeof sliders !== "object" || Array.isArray(sliders)) {
    return initSliders;
  }

  const data = sliders as Record<string, unknown>;

  return {
    narrativeDistance: Number(data.narrativeDistance ?? 50),
    metaphorDensity: Number(data.metaphorDensity ?? 50),
    endingStyle: Number(data.endingStyle ?? 50),
  };
}

export default function WenfengPage() {
  // 1. 在文件顶部引入 Copy 图标（如果尚未引入）
// import { Copy, Check } from "lucide-react"; 

// 2. 在组件内部添加以下状态
const [historyList, setHistoryList] = useState<any[]>([]);
const [historyLoading, setHistoryLoading] = useState(false);
const [copiedId, setCopiedId] = useState(""); // 用于记录哪个文本被复制了

// 3. 编写获取历史记录的函数
async function loadHistory(styleId: string) {
  if (!styleId) return;
  setHistoryLoading(true);
  try {
    const res = await fetch(`/api/style-calibration-history?styleId=${styleId}`);
    const data = await res.json();
    if (res.ok && data.list) {
      setHistoryList(data.list);
    }
  } catch (err) {
    console.error("历史记录加载失败", err);
  } finally {
    setHistoryLoading(false);
  }
}

// 4. 编写复制文本到剪贴板的函数
function handleCopy(text: string, logId: string) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    setCopiedId(logId);
    setTimeout(() => setCopiedId(""), 2000); // 2秒后恢复图标
  });
}
  const [name, setName] = useState("我的第一份文风");
  const [coreText, setCoreText] = useState("");
  const [sketchText, setSketchText] = useState("");
  const [negativeText, setNegativeText] = useState("");
  const [list, setList] = useState<StyleItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [scene, setScene] = useState("雨夜重逢");
  const [abCeshiData, setAbCeshiData] = useState<AbData | null>(null);
  const [abLoading, setAbLoading] = useState(false);
  const [myText, setMyText] = useState("");

  const [yuanDuan, setYuanDuan] = useState("");
  const [chaijieFenxi, setChaijieFenxi] = useState<ChaijieData | null>(null);
  const [chaijieLoading, setChaijieLoading] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [rewrite, setRewrite] = useState<RewriteData>({});
  const [rewriteLoading, setRewriteLoading] = useState(false);

  const activeStyle = useMemo(
    () => list.find((item) => item.id === activeId) ?? list[0] ?? null,
    [activeId, list],
  );
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [sliders, setSliders] = useState(initSliders);
  const [controlLoading, setControlLoading] = useState(false);

  function tongbuControl(style: StyleItem | null) {
    setForbiddenWords(style?.forbiddenWords ?? []);
    setSliders(getSliders(style));
  }

  async function loadList() {
    try {
      const res = await fetch("/api/style-models");
      const data = (await res.json()) as ApiList;
      const nextList = data.list ?? [];
      const nextStyle =
        nextList.find((item) => item.id === activeId) ?? nextList[0] ?? null;

      setList(nextList);

      if (nextStyle) {
        setActiveId(nextStyle.id);
      }

      tongbuControl(nextStyle);
    } catch {
      setList([]);
      tongbuControl(null);
    }
  }

  async function readFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      setError("当前基础版只直接解析 .txt；.docx 会在后续接入。");
      return;
    }

    setError("");
    setCoreText(await file.text());
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/style-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          coreText,
          sketchText,
          negativeText,
        }),
      });
      const data = (await res.json()) as ApiCreate;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "创建失败");
      }

      if (data.styleModel) {
        setActiveId(data.styleModel.id);
      }

      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  async function shengchengAb() {
    if (!activeStyle) {
      setError("先创建或选择文风模型");
      return;
    }

    setAbLoading(true);
    setError("");

    try {
      const res = await fetch("/api/style-ab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId: activeStyle.id, scene }),
      });
      const data = (await res.json()) as AbData;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "生成失败");
      }

      setAbCeshiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setAbLoading(false);
    }
  }

  async function xuanAb(choice: "A" | "B" | "mine") {
    if (!activeStyle || !abCeshiData) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/style-ab-choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: activeStyle.id,
          choice,
          myText,
          scene: abCeshiData.scene,
          a: abCeshiData.a,
          b: abCeshiData.b,
        }),
      });
      const data = (await res.json()) as ApiCreate;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "校准失败");
      }

      await loadList();
      if (activeStyle?.id) {
        void loadHistory(activeStyle.id); // 提交成功后刷新历史列表
      }
      setMyText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "校准失败");
    } finally {
      setLoading(false);
    }
  }

  async function chaijie() {
    setChaijieLoading(true);
    setError("");

    try {
      const res = await fetch("/api/style-sandbox-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraph: yuanDuan }),
      });
      const data = (await res.json()) as FenxiRes;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "拆解失败");
      }

      setChaijieFenxi(data.chaijieFenxi ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "拆解失败");
    } finally {
      setChaijieLoading(false);
    }
  }

  async function chongzu() {
    if (!chaijieFenxi) {
      setError("先完成拆解");
      return;
    }

    setRewriteLoading(true);
    setError("");

    try {
      const res = await fetch("/api/style-sandbox-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: newTopic, fenxi: chaijieFenxi }),
      });
      const data = (await res.json()) as RewriteData;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "重组失败");
      }

      setRewrite(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重组失败");
    } finally {
      setRewriteLoading(false);
    }
  }

  async function baocunControl(
    nextWords = forbiddenWords,
    nextSliders = sliders,
  ) {
    if (!activeStyle) return;

    setControlLoading(true);
    setError("");

    try {
      const res = await fetch("/api/style-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: activeStyle.id,
          forbiddenWords: nextWords,
          sliders: nextSliders,
        }),
      });
      const data = (await res.json()) as ApiCreate;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "更新失败");
      }

      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setControlLoading(false);
    }
  }

  function addWord() {
    const word = newWord.trim();

    if (!word) return;

    const nextWords = Array.from(new Set([...forbiddenWords, word]));
    setForbiddenWords(nextWords);
    setNewWord("");
    void baocunControl(nextWords, sliders);
  }

  function removeWord(word: string) {
    const nextWords = forbiddenWords.filter((item) => item !== word);
    setForbiddenWords(nextWords);
    void baocunControl(nextWords, sliders);
  }

  function changeSlider(key: keyof typeof initSliders, value: number) {
    const next = { ...sliders, [key]: value };
    setSliders(next);
    void baocunControl(forbiddenWords, next);
  }

  useEffect(() => {
    let stop = false;

    fetch("/api/style-models")
      .then((res) => res.json())
      .then((data: ApiList) => {
        if (stop) return;
        const nextList = data.list ?? [];
        const nextStyle = nextList[0] ?? null;

        setList(nextList);

        if (nextStyle) {
          setActiveId(nextStyle.id);
        }

        tongbuControl(nextStyle);
      })
      .catch(() => {
        if (!stop) {
          setList([]);
          tongbuControl(null);
        }
      });

    return () => {
      stop = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-5 py-8">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 text-sm text-muted-foreground">
              文风实验室 / 校准工作室
            </div>
            <h1 className="text-3xl font-semibold">调准你的另一个声音</h1>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              A/B 选择负责细节微调，沙盘负责拆骨架，右栏控制禁忌与倾向。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadList}>
            <RefreshCcw className="size-4" />
            刷新模型
          </Button>
        </header>

        {error ? (
          <div className="mb-5 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
            <AlertCircle className="mt-0.5 size-4" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="mb-6 grid gap-4 rounded-lg border border-border bg-card p-5 lg:grid-cols-[360px_1fr]">
          <form onSubmit={submit}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">创建模型</h2>
              <Plus className="size-5 text-muted-foreground" />
            </div>
            <label className="mt-4 block text-sm font-medium">
              模型名称
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              核心语料
              <input
                type="file"
                accept=".txt,.docx"
                onChange={readFile}
                className="mt-2 block w-full text-sm text-muted-foreground"
              />
              <textarea
                value={coreText}
                onChange={(e) => setCoreText(e.target.value)}
                placeholder="粘贴至少 200 字文本。"
                className="mt-3 min-h-32 w-full resize-y rounded-md border border-border bg-background p-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <textarea
                value={sketchText}
                onChange={(e) => setSketchText(e.target.value)}
                placeholder="速写捕捉，可选"
                className="min-h-24 resize-y rounded-md border border-border bg-background p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={negativeText}
                onChange={(e) => setNegativeText(e.target.value)}
                placeholder="反面教材，可选"
                className="min-h-24 resize-y rounded-md border border-border bg-background p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button disabled={loading} className="mt-4 w-full">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading ? "正在分析" : "提取并保存"}
            </Button>
          </form>

          <div>
            <h2 className="text-xl font-semibold">风格存档</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">还没有文风模型。</p>
              ) : (
                list.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      tongbuControl(item);
                    }}
                    className={
                      activeStyle?.id === item.id
                        ? "rounded-md border border-amber-500 bg-amber-50 p-4 text-left dark:bg-amber-950"
                        : "rounded-md border border-border p-4 text-left hover:bg-muted"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium">{item.name}</h3>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      已学习的文本段落数：{item.chunkCount ?? 0}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.25fr_0.8fr]">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">文风偏好选择</h2>
            <label className="mt-4 block text-sm">
              场景
              <input
                value={scene}
                onChange={(e) => setScene(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <Button
              type="button"
              disabled={abLoading || !activeStyle}
              onClick={() => void shengchengAb()}
              className="mt-4 w-full"
            >
              {abLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              生成 AB 选项
            </Button>

            <div className="mt-5 grid gap-3">
              <article className="rounded-md border border-border p-4">
                <div className="mb-2 text-sm font-medium">版本 A</div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {abCeshiData?.a ?? "等待生成。"}
                </p>
              </article>
              <article className="rounded-md border border-border p-4">
                <div className="mb-2 text-sm font-medium">版本 B</div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {abCeshiData?.b ?? "等待生成。"}
                </p>
              </article>
            </div>

            <textarea
              value={myText}
              onChange={(e) => setMyText(e.target.value)}
              placeholder="也可以写下你的版本。"
              className="mt-4 min-h-24 w-full resize-y rounded-md border border-border bg-background p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                disabled={!abCeshiData}
                onClick={() => void xuanAb("A")}
              >
                选 A
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!abCeshiData}
                onClick={() => void xuanAb("B")}
              >
                选 B
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!abCeshiData || !myText.trim()}
                onClick={() => void xuanAb("mine")}
              >
                提供我的版本
              </Button>
            </div>
            {/* 新增的历史记录查看与复制面板 */}
            <div className="mt-6 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">历史填写的版本 ({historyList.length})</h3>
                {historyLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
              </div>

              <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-1">
                {historyList.length === 0 ? (
      <p className="text-xs text-muted-foreground py-2 text-center">暂无自定义版本的提交历史。</p>
    ) : (
      historyList.map((log) => {
        const payload = (typeof log.payload === 'object' && log.payload !== null) ? log.payload : {};
        const textContent = payload.myText || "";
        const sceneName = payload.scene || "未定场景";

        // 如果用户当时没有提供“我的版本”，则不渲染该条历史
        if (!textContent.trim()) return null;

        return (
          <article key={log.id} className="rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed relative group">
            <div className="flex items-center justify-between mb-1 opacity-70">
              <span className="font-medium bg-background px-1.5 py-0.5 rounded border">
                场景: {sceneName}
              </span>
              <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="whitespace-pre-wrap text-muted-foreground mt-1 pr-8">
              {textContent}
            </p>
            
            {/* 复制按钮，鼠标悬停时显现 */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 bottom-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleCopy(textContent, log.id)}
              title="复制该文本"
            >
              {copiedId === log.id ? (
                <span className="text-emerald-600 font-bold text-[10px]">已复制</span>
              ) : (
                // 引入 lucide-react 的 Copy 图标，或直接用文字代替
                <span className="text-stone-500 hover:text-stone-950">复制</span>
              )}
            </Button>
          </article>
        );
      })
    )}
  </div>
</div>
          </section>



          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">段落风格解析室</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
              <textarea
                value={yuanDuan}
                onChange={(e) => setYuanDuan(e.target.value)}
                placeholder="粘贴一段你满意的段落。"
                className="min-h-44 resize-y rounded-md border border-border bg-background p-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="rounded-md border border-border bg-background p-3">
                <div className="text-sm font-medium">分析结果</div>
                {chaijieFenxi ? (
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                    <p>句式：{chaijieFenxi.syntax}</p>
                    <p>节奏：{chaijieFenxi.rhythm}</p>
                    <p>通感：{chaijieFenxi.synesthesia}</p>
                    <p>骨架：{chaijieFenxi.skeleton}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    还没有拆解。
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              disabled={chaijieLoading}
              onClick={() => void chaijie()}
              className="mt-3"
            >
              {chaijieLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              拆解段落
            </Button>

            <div className="mt-6 border-t border-border pt-5">
              <textarea
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="输入新主题，例如：用战役前夕的笔法，写一场解散前的乐队排练。"
                className="min-h-24 w-full resize-y rounded-md border border-border bg-background p-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="button"
                disabled={rewriteLoading}
                onClick={() => void chongzu()}
                className="mt-3"
              >
                {rewriteLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                重组生成
              </Button>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <article className="rounded-md border border-border p-4">
                  <div className="mb-2 text-sm font-medium">普通AI写法</div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {rewrite.tongyong ?? "等待生成。"}
                  </p>
                </article>
                <article className="rounded-md border border-amber-500/40 bg-amber-50 p-4 dark:bg-amber-950">
                  <div className="mb-2 text-sm font-medium">模仿你的融合写法</div>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {rewrite.chongzuShengcheng ?? "等待生成。"}
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">禁忌与强化</h2>
              {controlLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Save className="size-4 text-muted-foreground" />
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="新增禁忌词"
                className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="button" variant="outline" onClick={addWord}>
                添加
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {forbiddenWords.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无禁忌词。</p>
              ) : (
                forbiddenWords.map((word) => (
                  <button
                    key={word}
                    type="button"
                    draggable
                    onClick={() => removeWord(word)}
                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    {word}
                    <Trash2 className="size-3" />
                  </button>
                ))
              )}
            </div>

            <div className="mt-6 grid gap-5">
              {[
                ["narrativeDistance", "叙事距离", "亲密耳语", "鹰眼观察"],
                ["metaphorDensity", "比喻密度", "极简直陈", "极繁互联"],
                ["endingStyle", "结尾倾向", "戛然而止", "余韵长叹"],
              ].map(([key, label, left, right]) => (
                <label key={key} className="block text-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">
                      {sliders[key as keyof typeof initSliders]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliders[key as keyof typeof initSliders]}
                    onChange={(e) =>
                      changeSlider(
                        key as keyof typeof initSliders,
                        Number(e.target.value),
                      )
                    }
                    className="w-full accent-blue-600"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>{left}</span>
                    <span>{right}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
