import React from "react";
import { useRouter } from "next/router";
import { ModuleTableThemeProvider } from "../contexts/ModuleTableThemeContext";
import { getTableColorSchemeForPath } from "../util/moduleTableTheme";

/**
 * Syncs table accent to the active app module (see `MENU_MODULES` accents).
 */
export default function ModuleTableThemeBridge({ children }) {
  const router = useRouter();
  const colorScheme = getTableColorSchemeForPath(router.pathname);

  return (
    <ModuleTableThemeProvider colorScheme={colorScheme}>
      {children}
    </ModuleTableThemeProvider>
  );
}
