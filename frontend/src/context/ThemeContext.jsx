import React, { createContext, useState } from "react";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  const toggleCollapse = () => setCollapsed((c) => !c);
  const toggleDark = () => setDark((d) => !d);

  return (
    <ThemeContext.Provider
      value={{ collapsed, toggleCollapse, dark, toggleDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
