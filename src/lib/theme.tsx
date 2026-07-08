import { useEffect, useState, useCallback } from "react";
import type { ThemeMode } from "./storage";

const KEY = "mm.theme";

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement;
  if (mode === "light") html.classList.add("theme-light");
  else html.classList.remove("theme-light");
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = (window.localStorage.getItem(KEY) as ThemeMode) || "dark";
    setMode(stored);
    applyTheme(stored);
    setHydrated(true);
  }, []);

  const set = useCallback((next: ThemeMode) => {
    setMode(next);
    window.localStorage.setItem(KEY, next);
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    set(mode === "dark" ? "light" : "dark");
  }, [mode, set]);

  return { mode, set, toggle, hydrated };
}
