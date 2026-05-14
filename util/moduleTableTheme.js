import { MENU_MODULES } from "../constants/menus";

/**
 * Map URL path to the module rail accent used for AgGrid / table chrome.
 * Longer module ids are matched first (e.g. `foo-bar` before `foo`).
 */
export function getTableColorSchemeForPath(pathname) {
  if (!pathname || typeof pathname !== "string") {
    return MENU_MODULES.all?.accent || "purple";
  }
  const path = pathname.split("?")[0] || pathname;

  const entries = Object.entries(MENU_MODULES).filter(([id]) => id !== "all");
  entries.sort((a, b) => b[0].length - a[0].length);

  for (const [moduleId, mod] of entries) {
    const prefix = `/${moduleId}`;
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return mod.accent || "purple";
    }
  }

  return MENU_MODULES.all?.accent || "purple";
}
