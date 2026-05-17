"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme } = useThemeMode();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="切换主题"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
