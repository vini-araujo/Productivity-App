"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const storageKey = "ordyn-theme";
const themeChangeEvent = "ordyn-theme-change";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function storedTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
}

function serverTheme(): Theme {
  return "light";
}

function subscribeToThemeChanges(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToThemeChanges,
    storedTheme,
    serverTheme,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function chooseTheme(nextTheme: Theme) {
    window.localStorage.setItem(storageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  return (
    <div
      aria-label="Theme"
      className="fixed bottom-4 right-4 z-50 rounded-lg border border-slate-800 bg-slate-900 p-1 shadow-xl shadow-black/10"
      suppressHydrationWarning
    >
      {(["light", "dark"] as const).map((option) => (
        <button
          aria-pressed={theme === option}
          className={`rounded-md px-3 py-2 text-xs font-semibold capitalize transition ${
            theme === option
              ? "bg-emerald-300 text-slate-950"
              : "text-slate-400 hover:bg-slate-950 hover:text-white"
          }`}
          key={option}
          onClick={() => chooseTheme(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
