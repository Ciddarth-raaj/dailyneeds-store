import React, { useMemo } from "react";
import { useRouter } from "next/router";
import { ChakraProvider } from "@chakra-ui/react";
import { ModuleTableThemeProvider } from "../contexts/ModuleTableThemeContext";
import { getTableColorSchemeForPath } from "../util/moduleTableTheme";
import { createAppTheme } from "../theme";

/**
 * Syncs Chakra + table accent to the active app module (see `MENU_MODULES` accents).
 * Buttons without an explicit `colorScheme` use the module palette.
 */
export default function ModuleTableThemeBridge({ children }) {
  const router = useRouter();
  const colorScheme = getTableColorSchemeForPath(router.pathname);
  const moduleTheme = useMemo(
    () => createAppTheme(colorScheme),
    [colorScheme]
  );

  return (
    <ChakraProvider theme={moduleTheme}>
      <ModuleTableThemeProvider colorScheme={colorScheme}>
        {children}
      </ModuleTableThemeProvider>
    </ChakraProvider>
  );
}
