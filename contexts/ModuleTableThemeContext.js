import React, { createContext, useContext, useMemo } from "react";

const DEFAULT_COLOR_SCHEME = "purple";

const ModuleTableThemeContext = createContext({
  colorScheme: DEFAULT_COLOR_SCHEME,
});

/**
 * Sets the default Chakra / AgGrid accent for tables on this subtree.
 * Usually provided once from `_app` via `ModuleTableThemeBridge` (route → module accent).
 */
export function ModuleTableThemeProvider({ children, colorScheme }) {
  const value = useMemo(() => {
    return {
      colorScheme: colorScheme || DEFAULT_COLOR_SCHEME,
    };
  }, [colorScheme]);

  return (
    <ModuleTableThemeContext.Provider value={value}>
      {children}
    </ModuleTableThemeContext.Provider>
  );
}

export function useModuleTableTheme() {
  return useContext(ModuleTableThemeContext);
}
