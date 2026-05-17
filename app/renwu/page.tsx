"use client";

import dynamic from "next/dynamic";
import type { ComponentType, FormEvent } from "react";
import { useState } from "react";
import type { ForceGraphProps } from "react-force-graph-2d";
import { Loader2, Pencil, RefreshCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type TuNode = {
  id: string;
  name: string;
};

type TuLink = {
  source: string;
  target: string;
  affinity: number;
  notes: string;
};

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as ComponentType<ForceGraphProps<TuNode, TuLink>>;

type CharData = {
  jing?: Record<string, string>;
  dong?: Record<string, string>;
  xingwei?: Record<string, string>;
};

type Character = {
  id: string;
  triggerKeywords: string[];
  data: CharData;
};

type WuPinData = {
  name?: string;
  type?: string;
  desc?: string;
  rules?: { text: string; active: boolean }[];
  aliases?: string[];
  relatedCharacterIds?: string[];
};

type WuPin = {
  id: string;
  type: string;
  triggerKeywords: string[];
  data: WuPinData;
};

type Guanxi = {
  id: string;
  characterA: string;
  characterB: string;
  affinity: number;
  notes?: string;
};

type ApiList<T> = {
  list?: T[];
  error?: string;
};

const initJuese = {
  id: "",
  name: "",
  gender: "",
  age: "",
  faction: "",
  race: "",
  mbti: "",
  trauma: "",
  values: "",
  want: "",
  secret: "",
  stress: "",
  items: "",
  languageStyle: "",
  currentEmotion: "",
  currentLocation: "",
};

const initWupin = {
  id: "",
  name: "",
  type: "地点",
  desc: "",
  rules: "",
  aliases: "",
  relatedCharacterIds: "",
};

const initGuanxi = {
  characterA: "",
  characterB: "",
  affinity: "0",
  notes: "",
};

export default function RenwuPage() {
  const [tab, setTab] = useState<"juese" | "wupin" | "guanxi">("juese");
  const [jueseForm, setJueseForm] = useState(initJuese);
  const [wupinForm, setWupinForm] = useState(initWupin);
  const [guanxiForm, setGuanxiForm] = useState(initGuanxi);
  const [jueseList, setJueseList] = useState<Character[]>([]);
  const [wupinList, setWupinList] = useState<WuPin[]>([]);
  const [guanxiList, setGuanxiList] = useState<Guanxi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setJuese(key: keyof typeof initJuese, value: string) {
    setJueseForm((old) => ({ ...old, [key]: value }));
  }

  function setWupin(key: keyof typeof initWupin, value: string) {
    setWupinForm((old) => ({ ...old, [key]: value }));
  }

  function setGuanxi(key: keyof typeof initGuanxi, value: string) {
    setGuanxiForm((old) => ({ ...old, [key]: value }));
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [jueseRes, wupinRes] = await Promise.all([
        fetch("/api/characters"),
        fetch("/api/world-items"),
      ]);
      const guanxiRes = await fetch("/api/character-relations");
      const jueseData = (await jueseRes.json()) as ApiList<Character>;
      const wupinData = (await wupinRes.json()) as ApiList<WuPin>;
      const guanxiData = (await guanxiRes.json()) as ApiList<Guanxi>;

      if (!jueseRes.ok || jueseData.error) {
        throw new Error(jueseData.error ?? "角色读取失败");
      }

      if (!wupinRes.ok || wupinData.error) {
        throw new Error(wupinData.error ?? "事物读取失败");
      }

      if (!guanxiRes.ok || guanxiData.error) {
        throw new Error(guanxiData.error ?? "关系读取失败");
      }

      setJueseList(jueseData.list ?? []);
      setWupinList(wupinData.list ?? []);
      setGuanxiList(guanxiData.list ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveJuese(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isEdit = Boolean(jueseForm.id);
      const res = await fetch(
        isEdit ? `/api/characters/${jueseForm.id}` : "/api/characters",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jueseForm),
        },
      );
      const data = (await res.json()) as ApiList<Character>;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "保存失败");
      }

      setJueseForm(initJuese);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveWupin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isEdit = Boolean(wupinForm.id);
      const res = await fetch(
        isEdit ? `/api/world-items/${wupinForm.id}` : "/api/world-items",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wupinForm),
        },
      );
      const data = (await res.json()) as ApiList<WuPin>;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "保存失败");
      }

      setWupinForm(initWupin);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(kind: "juese" | "wupin", id: string) {
    setLoading(true);
    setError("");

    try {
      const url =
        kind === "juese" ? `/api/characters/${id}` : `/api/world-items/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = (await res.json()) as ApiList<unknown>;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "删除失败");
      }

      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveGuanxi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/character-relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guanxiForm),
      });
      const data = (await res.json()) as ApiList<Guanxi>;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "保存失败");
      }

      setGuanxiForm(initGuanxi);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function removeGuanxi(id: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/character-relations/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as ApiList<unknown>;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "删除失败");
      }

      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  function editJuese(item: Character) {
    const jing = item.data.jing ?? {};
    const dong = item.data.dong ?? {};
    const xingwei = item.data.xingwei ?? {};

    setTab("juese");
    setJueseForm({
      id: item.id,
      name: jing.name ?? "",
      gender: jing.gender ?? "",
      age: jing.age ?? "",
      faction: jing.faction ?? "",
      race: jing.race ?? "",
      mbti: jing.mbti ?? "",
      trauma: jing.trauma ?? "",
      values: jing.values ?? "",
      want: dong.want ?? "",
      secret: dong.secret ?? "",
      stress: dong.stress ?? "",
      items: dong.items ?? "",
      languageStyle: xingwei.languageStyle ?? "",
      currentEmotion: dong.currentEmotion ?? "",
      currentLocation: dong.currentLocation ?? "",
    });
  }

  function editWupin(item: WuPin) {
    const data = item.data;

    setTab("wupin");
    setWupinForm({
      id: item.id,
      name: data.name ?? "",
      type: data.type ?? item.type,
      desc: data.desc ?? "",
      rules: (data.rules ?? []).map((rule) => rule.text).join("\n"),
      aliases: (data.aliases ?? []).join("，"),
      relatedCharacterIds: (data.relatedCharacterIds ?? []).join("，"),
    });
  }

  const smallInput =
    "mt-1 h-10 w-full rounded-md border border-stone-300 bg-white px-3 outline-none focus:ring-2 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-950";
  const bigInput =
    "mt-1 min-h-20 w-full resize-y rounded-md border border-stone-300 bg-white p-3 outline-none focus:ring-2 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-950";
  const guanxiTuData = {
    nodes: jueseList.map((item) => ({
      id: item.id,
      name: item.data.jing?.name ?? "未命名",
    })),
    links: guanxiList.map((item) => ({
      source: item.characterA,
      target: item.characterB,
      affinity: item.affinity,
      notes: item.notes ?? "",
    })),
  };

  function getJueseName(id: string) {
    const item = jueseList.find((juese) => juese.id === id);
    return item?.data.jing?.name ?? "未知角色";
  }

  return (
    <main className="min-h-screen bg-[#f7f1e6] text-stone-950 dark:bg-stone-950 dark:text-stone-50">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-stone-300 pb-6 dark:border-stone-800 md:flex-row md:items-end">
          <div>
            <div className="text-sm text-stone-500">世界观构建</div>
            <h1 className="mt-1 text-3xl font-semibold">人物与事物</h1>
            <p className="mt-3 max-w-2xl leading-7 text-stone-600 dark:text-stone-400">
              在这里记录的角色、地点和特殊物品，会在你后续写作时被 AI 自动识别。这能防止 AI 助手在辅助写作时违背你的基础设定。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadAll}>
            <RefreshCcw className="size-4" />
            刷新
          </Button>
        </header>

        <div className="mb-6 flex gap-2">
          <Button
            type="button"
            variant={tab === "juese" ? "default" : "outline"}
            onClick={() => setTab("juese")}
          >
            人物档案
          </Button>
          <Button
            type="button"
            variant={tab === "wupin" ? "default" : "outline"}
            onClick={() => setTab("wupin")}
          >
            事物/地点
          </Button>
          <Button
            type="button"
            variant={tab === "guanxi" ? "default" : "outline"}
            onClick={() => setTab("guanxi")}
          >
            关系图
          </Button>
        </div>

        {error ? (
          <div className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {tab === "juese" ? (
          <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
            <form
              onSubmit={saveJuese}
              className="rounded-lg border border-stone-300 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              <h2 className="mb-4 text-xl font-semibold">
                {jueseForm.id ? "编辑角色" : "新建角色"}
              </h2>

              <div className="grid gap-3">
                {[
                  ["name", "姓名"],
                  ["gender", "性别"],
                  ["age", "年龄"],
                  ["faction", "派系"],
                  ["race", "国籍/种族"],
                  ["mbti", "性格底色"],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm">
                    {label}
                    <input
                      value={jueseForm[key as keyof typeof initJuese]}
                      onChange={(e) =>
                        setJuese(key as keyof typeof initJuese, e.target.value)
                      }
                      className={smallInput}
                    />
                  </label>
                ))}

                {[
                  ["trauma", "创伤事件"],
                  ["values", "价值观"],
                  ["want", "当前诉求"],
                  ["secret", "秘密与盲区"],
                  ["stress", "压力反应"],
                  ["items", "关联物品"],
                  ["languageStyle", "语言风格"],
                  ["currentEmotion", "当前情绪"],
                  ["currentLocation", "当前位置"],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm">
                    {label}
                    <textarea
                      value={jueseForm[key as keyof typeof initJuese]}
                      onChange={(e) =>
                        setJuese(key as keyof typeof initJuese, e.target.value)
                      }
                      className={bigInput}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                <Button disabled={loading} className="flex-1">
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  保存
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setJueseForm(initJuese)}
                >
                  清空
                </Button>
              </div>
            </form>

            <section className="grid content-start gap-4">
              {jueseList.length === 0 ? (
                <div className="rounded-lg border border-stone-300 bg-white/70 p-6 text-stone-500 dark:border-stone-800 dark:bg-stone-900">
                  暂无角色。点击刷新读取数据库。
                </div>
              ) : (
                jueseList.map((item) => {
                  const jing = item.data.jing ?? {};
                  const dong = item.data.dong ?? {};
                  const xingwei = item.data.xingwei ?? {};

                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-stone-300 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {jing.name || "未命名"}
                          </h3>
                          <p className="mt-1 text-sm text-stone-500">
                            {jing.gender} / {jing.age} / {jing.faction}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => editJuese(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => void removeItem("juese", item.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-2">
                        <p>价值观：{jing.values || "未填写"}</p>
                        <p>当前诉求：{dong.want || "未填写"}</p>
                        <p>压力反应：{dong.stress || "未填写"}</p>
                        <p>语言风格：{xingwei.languageStyle || "未填写"}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.triggerKeywords.map((key) => (
                          <span
                            key={key}
                            className="rounded-md bg-stone-200 px-2 py-1 text-xs dark:bg-stone-800"
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </div>
        ) : tab === "wupin" ? (
          <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
            <form
              onSubmit={saveWupin}
              className="rounded-lg border border-stone-300 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              <h2 className="mb-4 text-xl font-semibold">
                {wupinForm.id ? "编辑卡片" : "新建卡片"}
              </h2>

              <div className="grid gap-3">
                <label className="text-sm">
                  名称
                  <input
                    value={wupinForm.name}
                    onChange={(e) => setWupin("name", e.target.value)}
                    className={smallInput}
                  />
                </label>

                <label className="text-sm">
                  类型
                  <select
                    value={wupinForm.type}
                    onChange={(e) => setWupin("type", e.target.value)}
                    className={smallInput}
                  >
                    <option>地点</option>
                    <option>组织</option>
                    <option>概念</option>
                    <option>特殊物品</option>
                  </select>
                </label>

                {[
                  ["aliases", "别名"],
                  ["desc", "描写定调"],
                  ["rules", "规则与特性"],
                  ["relatedCharacterIds", "关联角色ID"],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm">
                    {label}
                    <textarea
                      value={wupinForm[key as keyof typeof initWupin]}
                      onChange={(e) =>
                        setWupin(key as keyof typeof initWupin, e.target.value)
                      }
                      className={bigInput}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                <Button disabled={loading} className="flex-1">
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  保存
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWupinForm(initWupin)}
                >
                  清空
                </Button>
              </div>
            </form>

            <section className="grid content-start gap-4">
              {wupinList.length === 0 ? (
                <div className="rounded-lg border border-stone-300 bg-white/70 p-6 text-stone-500 dark:border-stone-800 dark:bg-stone-900">
                  暂无事物/地点。点击刷新读取数据库。
                </div>
              ) : (
                wupinList.map((item) => {
                  const data = item.data;

                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-stone-300 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {data.name || "未命名"}
                          </h3>
                          <p className="mt-1 text-sm text-stone-500">
                            {data.type || item.type}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => editWupin(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => void removeItem("wupin", item.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-7">
                        {data.desc || "未填写定调"}
                      </p>
                      <div className="mt-3 grid gap-2 text-sm">
                        {(data.rules ?? []).map((rule) => (
                          <div
                            key={rule.text}
                            className="rounded-md border border-stone-300 p-2 dark:border-stone-700"
                          >
                            {rule.active ? "生效" : "关闭"}：{rule.text}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.triggerKeywords.map((key) => (
                          <span
                            key={key}
                            className="rounded-md bg-stone-200 px-2 py-1 text-xs dark:bg-stone-800"
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <form
              onSubmit={saveGuanxi}
              className="rounded-lg border border-stone-300 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              <h2 className="mb-4 text-xl font-semibold">新增关系</h2>
              <div className="grid gap-3">
                <label className="text-sm">
                  角色 A
                  <select
                    value={guanxiForm.characterA}
                    onChange={(e) => setGuanxi("characterA", e.target.value)}
                    className={smallInput}
                  >
                    <option value="">请选择</option>
                    {jueseList.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.data.jing?.name ?? "未命名"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  角色 B
                  <select
                    value={guanxiForm.characterB}
                    onChange={(e) => setGuanxi("characterB", e.target.value)}
                    className={smallInput}
                  >
                    <option value="">请选择</option>
                    {jueseList.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.data.jing?.name ?? "未命名"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  好感度
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    value={guanxiForm.affinity}
                    onChange={(e) => setGuanxi("affinity", e.target.value)}
                    className={smallInput}
                  />
                </label>
                <label className="text-sm">
                  备注
                  <textarea
                    value={guanxiForm.notes}
                    onChange={(e) => setGuanxi("notes", e.target.value)}
                    className={bigInput}
                  />
                </label>
              </div>
              <Button disabled={loading} className="mt-5 w-full">
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                保存关系
              </Button>
            </form>

            <section className="grid gap-4">
              <div className="h-[520px] overflow-hidden rounded-lg border border-stone-300 bg-white/80 dark:border-stone-800 dark:bg-stone-900">
                <ForceGraph2D
                  graphData={guanxiTuData}
                  nodeId="id"
                  nodeLabel="name"
                  nodeColor={() => "#64748b"}
                  linkColor={(link) =>
                    Number(link.affinity) >= 0 ? "#2563eb" : "#dc2626"
                  }
                  linkWidth={(link) =>
                    Math.max(1, Math.abs(Number(link.affinity)) / 25)
                  }
                  linkLabel="notes"
                  width={760}
                  height={520}
                />
              </div>
              <div className="grid gap-3">
                {guanxiList.map((item) => (
                  <article
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-stone-300 bg-white/70 p-4 text-sm dark:border-stone-800 dark:bg-stone-900"
                  >
                    <div>
                      <div className="font-medium">
                        {getJueseName(item.characterA)} →{" "}
                        {getJueseName(item.characterB)}
                      </div>
                      <div className="mt-1 text-stone-500">
                        好感度：{item.affinity} / {item.notes || "无备注"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => void removeGuanxi(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
