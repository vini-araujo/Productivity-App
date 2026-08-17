"use client";

import { Moon, Sun } from "lucide-react";
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
      className="fixed bottom-20 right-4 z-50 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-lg shadow-slate-950/10 backdrop-blur-xl lg:bottom-4"
      suppressHydrationWarning
    >
      {(["light", "dark"] as const).map((option) => {
        const Icon = option === "light" ? Sun : Moon;
        return (
          <button
            aria-label={`Use ${option} theme`}
            aria-pressed={theme === option}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition ${
              theme === option
                ? "bg-slate-100 text-blue-600"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
            }`}
            key={option}
            onClick={() => chooseTheme(option)}
            title={`${option[0].toUpperCase()}${option.slice(1)} theme`}
            type="button"
          >
            <Icon aria-hidden="true" size={17} strokeWidth={2.4} />
          </button>
        );
      })}
    </div>
  );
}
