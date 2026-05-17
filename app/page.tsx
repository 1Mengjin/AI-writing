import Link from "next/link";
import { BookOpenText, Feather, Network, ShieldCheck } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

const rukou = [
  {
    title: "文风实验室",
    desc: "上传语料，提取文风指纹，建立可锁定的风格模型。",
    icon: Feather,
    href: "/wenfeng",
  },
  {
    title: "人物与世界",
    desc: "管理角色卡和世界规则，为后续 OOC 哨兵提供结构化依据。",
    icon: Network,
    href: "/renwu",
  },
  {
    title: "时间线",
    desc: "记录事件条目、因果说明，并关联已有角色与地点。",
    icon: Network,
    href: "/timeline",
  },
  {
    title: "写作室",
    desc: "保留极简书写体验，让 AI 只在需要时作为协作者出现。",
    icon: BookOpenText,
    href: "/xiezuoshi",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div>
            <div className="text-lg font-semibold tracking-[0.2em]">共生</div>
            <div className="text-xs text-muted-foreground">
              本地个人 AI 辅助写作工具
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link className="hover:text-foreground" href="/xiezuoshi">
              写作室
            </Link>
            <Link className="hover:text-foreground" href="/renwu">
              人物与世界
            </Link>
            <Link className="hover:text-foreground" href="/timeline">
              时间线
            </Link>
            <Link className="hover:text-foreground" href="/wenfeng">
              文风实验室
            </Link>
          </nav>
          <ModeToggle />
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-1 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            第一阶段：核心创作闭环
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            AI 只做协作者，不做代笔者。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            当前项目先打通文风模型、写作室和角色卡 CRUD。所有生成逻辑都围绕
            “非侵入式交互”和“风格镜像”展开。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/wenfeng">进入文风实验室</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/xiezuoshi">打开写作室</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {rukou.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-5" />
                </div>
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 leading-7 text-muted-foreground">
                  {item.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
