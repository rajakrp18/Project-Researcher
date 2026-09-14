"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type ThemeMode = "auto" | "dark" | "light";

export default function ThemeToggle() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme-preference") as ThemeMode) || "auto";
    setThemeMode(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    if (mode === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", mode);
    }
  };

  useEffect(() => {
    if (themeMode !== "auto") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  const handleModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem("theme-preference", mode);
    applyTheme(mode);
  };

  return (
    <div className="theme-toggle-group" role="radiogroup" aria-label="Theme Selection">
      <button
        type="button"
        className={`theme-btn ${themeMode === "auto" ? "active" : ""}`}
        onClick={() => handleModeChange("auto")}
        title="Auto (Follow System Theme)"
        aria-checked={themeMode === "auto"}
      >
        <Monitor size={16} />
        <span>Auto</span>
      </button>
      <button
        type="button"
        className={`theme-btn ${themeMode === "light" ? "active" : ""}`}
        onClick={() => handleModeChange("light")}
        title="Light Mode"
        aria-checked={themeMode === "light"}
      >
        <Sun size={16} />
        <span>Light</span>
      </button>
      <button
        type="button"
        className={`theme-btn ${themeMode === "dark" ? "active" : ""}`}
        onClick={() => handleModeChange("dark")}
        title="Dark Mode"
        aria-checked={themeMode === "dark"}
      >
        <Moon size={16} />
        <span>Dark</span>
      </button>
    </div>
  );
}
