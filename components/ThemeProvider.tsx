"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

// 7–20 Uhr = hell, 20–7 Uhr = dunkel
function getTimeBasedTheme(): Theme {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 20 ? "light" : "dark";
}

// Heute als YYYY-MM-DD
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  isAuto: boolean;
  resetAuto: () => void;
}>({ theme: "dark", toggle: () => {}, isAuto: true, resetAuto: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,  setTheme]  = useState<Theme>("dark");
  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    const savedTheme    = localStorage.getItem("theme")         as Theme | null;
    const overrideDate  = localStorage.getItem("themeOverrideDate");
    const manualToday   = overrideDate === today();

    let t: Theme;
    if (savedTheme && manualToday) {
      // Manuell überschrieben — gilt nur für heute
      t = savedTheme;
      setIsAuto(false);
    } else {
      // Automatisch nach Tageszeit
      t = getTimeBasedTheme();
      setIsAuto(true);
      localStorage.removeItem("theme");
      localStorage.removeItem("themeOverrideDate");
    }

    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // Jede Minute prüfen ob Tageszeit-Grenze überschritten wurde (nur im Auto-Modus)
  useEffect(() => {
    const interval = setInterval(() => {
      const overrideDate = localStorage.getItem("themeOverrideDate");
      if (overrideDate === today()) return; // manuell gesetzt — nicht überschreiben

      const t = getTimeBasedTheme();
      setTheme(t);
      document.documentElement.setAttribute("data-theme", t);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setIsAuto(false);
    localStorage.setItem("theme", next);
    localStorage.setItem("themeOverrideDate", today()); // gilt nur heute
    document.documentElement.setAttribute("data-theme", next);
  }

  function resetAuto() {
    const t = getTimeBasedTheme();
    setTheme(t);
    setIsAuto(true);
    localStorage.removeItem("theme");
    localStorage.removeItem("themeOverrideDate");
    document.documentElement.setAttribute("data-theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, isAuto, resetAuto }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
