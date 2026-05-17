"use client";

import * as React from "react";

type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeCtx>({
  theme: "light",
  setTheme: () => {},
});

const eventName = "theme-change";

function getTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const saved = window.localStorage.getItem("theme");

  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(cb: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  window.addEventListener(eventName, cb);
  window.addEventListener("storage", cb);
  media.addEventListener("change", cb);

  return () => {
    window.removeEventListener(eventName, cb);
    window.removeEventListener("storage", cb);
    media.removeEventListener("change", cb);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore<Theme>(
    subscribe,
    getTheme,
    () => "light",
  );

  React.useInsertionEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(next: Theme) {
    window.localStorage.setItem("theme", next);
    applyTheme(next);
    window.dispatchEvent(new Event(eventName));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return React.useContext(ThemeContext);
}
