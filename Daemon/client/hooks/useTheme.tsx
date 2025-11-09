import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "light" | "dark";

type Ctx = {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<Ctx | undefined>(undefined);

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Check localStorage first
    const stored = localStorage.getItem("theme") as ThemeMode;
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    // Default to light mode or check system preference
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    return "light";
  });

  const isDark = theme === "dark";

  // Apply theme to document
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Save theme to localStorage
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem("theme", mode);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark]);

  const value = useMemo<Ctx>(
    () => ({ theme, isDark, setTheme, toggleTheme }),
    [theme, isDark, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
