"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Clock3, Feather, Home, Network } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "首页", icon: Home },
  { href: "/xiezuoshi", label: "写作室", icon: BookOpenText },
  { href: "/renwu", label: "人物与世界", icon: Network },
  { href: "/timeline", label: "时间线", icon: Clock3 },
  { href: "/wenfeng", label: "文风实验室", icon: Feather },
];

export function SiteNav() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1600px] flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-foreground text-sm font-semibold text-background">
            共
          </div>
          <div>
            <div className="text-base font-semibold tracking-[0.2em]">共生</div>
            <div className="text-xs text-muted-foreground">
              本地个人 AI 辅助写作工具
            </div>
          </div>
        </Link>

        <div className="flex items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {links.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/" ? path === "/" : path.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-muted text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
