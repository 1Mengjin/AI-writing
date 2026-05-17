import Link from "next/link";
import { BookOpenText, Feather, Network, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const rukou = [
  {
    title: "文风实验室",
    desc: "上传你的过往作品，让 AI 学习并记住你独有的语言风格和写作习惯。",
    icon: Feather,
    href: "/wenfeng",
  },
  {
    title: "人物与世界",
    desc: "建立你的角色档案与世界观设定，AI 会在写作时帮你记住这些细节，避免人物性格或设定跑偏。",
    icon: Network,
    href: "/renwu",
  },
  {
    title: "时间线",
    desc: "梳理故事的发展脉络，将重要事件、出场人物与发生地点清晰地串联起来。",
    icon: Network,
    href: "/timeline",
  },
  {
    title: "写作室",
    desc: "享受纯净的码字环境。当你卡壳时，专属助手随时准备为你提供灵感和接续思路。",
    icon: BookOpenText,
    href: "/xiezuoshi",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-1 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            共生：专注创作者的核心体验
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            AI 只做协作者，不做代笔者。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            在这里，你可以培养专属的写作助手。无论是模仿你的行文风格，还是管理角色与大纲，
            AI 都会安静地退居幕后，只在你需要灵感时才提供支持。
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
