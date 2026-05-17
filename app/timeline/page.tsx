"use client";

import { FormEvent, useState } from "react";
import { Loader2, Pencil, RefreshCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CharData = {
  jing?: Record<string, string>;
};

type Character = {
  id: string;
  data: CharData;
};

type WuPinData = {
  name?: string;
  type?: string;
};

type WuPin = {
  id: string;
  type: string;
  data: WuPinData;
};

type EventData = {
  title?: string;
  time?: string;
  status?: string;
  summary?: string;
  characterIds?: string[];
  locationId?: string;
  textLink?: string;
  relatedEventIds?: string[];
  relationNote?: string;
};

type TimeEvent = {
  id: string;
  data: EventData;
};

type ApiList<T> = {
  list?: T[];
  error?: string;
};

const initEvent = {
  id: "",
  title: "",
  time: "",
  status: "计划中",
  summary: "",
  characterIds: [] as string[],
  locationId: "",
  textLink: "",
  relatedEventIds: [] as string[],
  relationNote: "",
};

export default function TimelinePage() {
  const [form, setForm] = useState(initEvent);
  const [events, setEvents] = useState<TimeEvent[]>([]);
  const [jueseList, setJueseList] = useState<Character[]>([]);
  const [wupinList, setWupinList] = useState<WuPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const didianList = wupinList.filter((item) => {
    const type = item.data.type ?? item.type;
    return type === "地点";
  });

  function setVal<K extends keyof typeof initEvent>(
    key: K,
    value: (typeof initEvent)[K],
  ) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function toggleId(key: "characterIds" | "relatedEventIds", id: string) {
    setForm((old) => {
      const list = old[key];
      const next = list.includes(id)
        ? list.filter((item) => item !== id)
        : [...list, id];

      return { ...old, [key]: next };
    });
  }

  function getJueseName(id: string) {
    const item = jueseList.find((juese) => juese.id === id);
    return item?.data.jing?.name ?? "未知角色";
  }

  function getDidianName(id?: string) {
    const item = didianList.find((wupin) => wupin.id === id);
    return item?.data.name ?? "未关联地点";
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [eventRes, jueseRes, wupinRes] = await Promise.all([
        fetch("/api/timeline-events"),
        fetch("/api/characters"),
        fetch("/api/world-items"),
      ]);
      const eventData = (await eventRes.json()) as ApiList<TimeEvent>;
      const jueseData = (await jueseRes.json()) as ApiList<Character>;
      const wupinData = (await wupinRes.json()) as ApiList<WuPin>;

      if (!eventRes.ok || eventData.error) {
        throw new Error(eventData.error ?? "事件读取失败");
      }

      if (!jueseRes.ok || jueseData.error) {
        throw new Error(jueseData.error ?? "角色读取失败");
      }

      if (!wupinRes.ok || wupinData.error) {
        throw new Error(wupinData.error ?? "地点读取失败");
      }

      setEvents(eventData.list ?? []);
      setJueseList(jueseData.list ?? []);
      setWupinList(wupinData.list ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isEdit = Boolean(form.id);
      const res = await fetch(
        isEdit ? `/api/timeline-events/${form.id}` : "/api/timeline-events",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = (await res.json()) as ApiList<TimeEvent>;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "保存失败");
      }

      setForm(initEvent);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/timeline-events/${id}`, {
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

  function edit(item: TimeEvent) {
    const data = item.data;

    setForm({
      id: item.id,
      title: data.title ?? "",
      time: data.time ?? "",
      status: data.status ?? "计划中",
      summary: data.summary ?? "",
      characterIds: data.characterIds ?? [],
      locationId: data.locationId ?? "",
      textLink: data.textLink ?? "",
      relatedEventIds: data.relatedEventIds ?? [],
      relationNote: data.relationNote ?? "",
    });
  }

  const smallInput =
    "mt-1 h-10 w-full rounded-md border border-stone-300 bg-white px-3 outline-none focus:ring-2 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-950";
  const bigInput =
    "mt-1 min-h-24 w-full resize-y rounded-md border border-stone-300 bg-white p-3 outline-none focus:ring-2 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-950";

  return (
    <main className="min-h-screen bg-[#f7f1e6] text-stone-950 dark:bg-stone-950 dark:text-stone-50">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-stone-300 pb-6 dark:border-stone-800 md:flex-row md:items-end">
          <div>
            <div className="text-sm text-stone-500">故事脉络推演</div>
            <h1 className="mt-1 text-3xl font-semibold">因果链</h1>
            <p className="mt-3 max-w-2xl leading-7 text-stone-600 dark:text-stone-400">
              将复杂的剧情拆解为具体的事件，把出场人物、发生地点以及事件的前因后果清晰地记录并串联起来。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadAll}>
            <RefreshCcw className="size-4" />
            刷新
          </Button>
        </header>

        {error ? (
          <div className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
          <form
            onSubmit={submit}
            className="rounded-lg border border-stone-300 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900"
          >
            <h2 className="mb-4 text-xl font-semibold">
              {form.id ? "编辑事件" : "新建事件"}
            </h2>

            <div className="grid gap-3">
              <label className="text-sm">
                事件标题
                <input
                  value={form.title}
                  onChange={(e) => setVal("title", e.target.value)}
                  className={smallInput}
                />
              </label>

              <label className="text-sm">
                时间点
                <input
                  value={form.time}
                  onChange={(e) => setVal("time", e.target.value)}
                  className={smallInput}
                />
              </label>

              <label className="text-sm">
                状态
                <select
                  value={form.status}
                  onChange={(e) => setVal("status", e.target.value)}
                  className={smallInput}
                >
                  <option>已发生</option>
                  <option>正在发生</option>
                  <option>计划中</option>
                  <option>废弃</option>
                </select>
              </label>

              <label className="text-sm">
                地点
                <select
                  value={form.locationId}
                  onChange={(e) => setVal("locationId", e.target.value)}
                  className={smallInput}
                >
                  <option value="">未关联</option>
                  {didianList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.data.name ?? "未命名地点"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                事件简述
                <textarea
                  value={form.summary}
                  onChange={(e) => setVal("summary", e.target.value)}
                  className={bigInput}
                />
              </label>

              <label className="text-sm">
                文稿片段链接
                <input
                  value={form.textLink}
                  onChange={(e) => setVal("textLink", e.target.value)}
                  className={smallInput}
                />
              </label>

              <div className="text-sm">
                涉及角色
                <div className="mt-2 grid gap-2 rounded-md border border-stone-300 p-3 dark:border-stone-700">
                  {jueseList.length === 0 ? (
                    <span className="text-stone-500">先刷新角色列表</span>
                  ) : (
                    jueseList.map((item) => (
                      <label key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.characterIds.includes(item.id)}
                          onChange={() => toggleId("characterIds", item.id)}
                        />
                        {item.data.jing?.name ?? "未命名角色"}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="text-sm">
                关联事件
                <div className="mt-2 grid gap-2 rounded-md border border-stone-300 p-3 dark:border-stone-700">
                  {events.length === 0 ? (
                    <span className="text-stone-500">先刷新事件列表</span>
                  ) : (
                    events
                      .filter((item) => item.id !== form.id)
                      .map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={form.relatedEventIds.includes(item.id)}
                            onChange={() =>
                              toggleId("relatedEventIds", item.id)
                            }
                          />
                          {item.data.title ?? "未命名事件"}
                        </label>
                      ))
                  )}
                </div>
              </div>

              <label className="text-sm">
                因果说明
                <textarea
                  value={form.relationNote}
                  onChange={(e) => setVal("relationNote", e.target.value)}
                  className={bigInput}
                />
              </label>
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
                onClick={() => setForm(initEvent)}
              >
                清空
              </Button>
            </div>
          </form>

          <section className="grid content-start gap-4">
            {events.length === 0 ? (
              <div className="rounded-lg border border-stone-300 bg-white/70 p-6 text-stone-500 dark:border-stone-800 dark:bg-stone-900">
                暂无事件。点击刷新读取数据库。
              </div>
            ) : (
              events.map((item) => {
                const data = item.data;

                return (
                  <article
                    key={item.id}
                    className="rounded-lg border border-stone-300 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-stone-500">
                          {data.time || "未定时间"} / {data.status}
                        </div>
                        <h3 className="mt-1 text-xl font-semibold">
                          {data.title || "未命名事件"}
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => edit(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => void remove(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7">
                      {data.summary || "未填写简述"}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                      <p>地点：{getDidianName(data.locationId)}</p>
                      <p>
                        角色：
                        {(data.characterIds ?? []).map(getJueseName).join("，") ||
                          "未关联"}
                      </p>
                      <p>
                        关联事件：
                        {(data.relatedEventIds ?? []).length || "无"}
                      </p>
                      <p>因果说明：{data.relationNote || "未填写"}</p>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
