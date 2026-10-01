"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./Icons";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setTheme(set === "dark" || set === "light" ? set : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem("ok-theme", next); } catch {}
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-warm/50 px-3 text-sm text-warm hover:bg-warm/10"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
