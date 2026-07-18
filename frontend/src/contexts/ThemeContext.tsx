import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export type ColorMode = "light" | "dark" | "system";

const COLOR_MODE_STORAGE_KEY = "smart_spotify_color_mode";

function getStoredColorMode(): ColorMode {
  const value = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

interface ThemeContextType {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { source } = useAuth();
  const [colorMode, setColorModeState] = useState<ColorMode>(() =>
    getStoredColorMode(),
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    getSystemPrefersDark(),
  );

  // Keep "system" in sync with live OS-level theme changes.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) =>
      setSystemPrefersDark(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const isDark =
    colorMode === "system" ? systemPrefersDark : colorMode === "dark";

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? source : `${source}-light`,
    );
  }, [source, isDark]);

  const setColorMode = (mode: ColorMode) => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    setColorModeState(mode);
  };

  const value: ThemeContextType = { colorMode, setColorMode, isDark };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
