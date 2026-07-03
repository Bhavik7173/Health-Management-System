import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("mc_theme") || "minimalist";
  });

  useEffect(() => {
    localStorage.setItem("mc_theme", theme);
    // Remove all theme classes first
    document.documentElement.classList.remove("theme-bento", "theme-glass", "theme-command");

    // Add new theme class (minimalist is default, no class needed)
    if (theme !== "minimalist") {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  const toggleTheme = (newTheme) => setTheme(newTheme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
