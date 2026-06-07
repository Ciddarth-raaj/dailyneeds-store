import { MENU_MODULES } from "../constants/menus";

function collectMenuLocations(menuTree, locations = []) {
  if (!menuTree) return locations;

  for (const key of Object.keys(menuTree)) {
    const item = menuTree[key];
    if (item.location) locations.push(item.location);

    if (item.subMenu) {
      for (const sKey of Object.keys(item.subMenu)) {
        const sub = item.subMenu[sKey];
        if (sub.location) locations.push(sub.location);

        if (sub.subMenu) {
          for (const ssKey of Object.keys(sub.subMenu)) {
            if (sub.subMenu[ssKey].location) {
              locations.push(sub.subMenu[ssKey].location);
            }
          }
        }
      }
    }
  }

  return locations;
}

function pathMatchesMenuLocation(path, location) {
  if (!location) return false;
  return path === location || path.startsWith(`${location}/`);
}

/**
 * Resolve which app module owns a route by walking each module's menu tree.
 * Exact menu location wins over prefix (child routes); longer locations win ties.
 */
export function findModuleIdForPath(pathname) {
  if (!pathname || typeof pathname !== "string") return null;

  const path = pathname.split("?")[0] || pathname;
  const moduleIds = Object.keys(MENU_MODULES);
  let best = null;

  for (const moduleId of moduleIds) {
    const locations = collectMenuLocations(MENU_MODULES[moduleId].menu);

    for (const location of locations) {
      if (!pathMatchesMenuLocation(path, location)) continue;

      const exact = path === location;
      const moduleOrder = moduleIds.indexOf(moduleId);

      if (
        !best ||
        (exact && !best.exact) ||
        (exact === best.exact && location.length > best.location.length) ||
        (exact === best.exact &&
          location.length === best.location.length &&
          moduleOrder < best.moduleOrder)
      ) {
        best = { moduleId, location, exact, moduleOrder };
      }
    }
  }

  return best?.moduleId ?? null;
}

/**
 * Map URL path to the module rail accent used for AgGrid / table chrome.
 */
export function getTableColorSchemeForPath(pathname) {
  const moduleId = findModuleIdForPath(pathname);
  if (moduleId && MENU_MODULES[moduleId]) {
    return MENU_MODULES[moduleId].accent || "purple";
  }

  return MENU_MODULES.all?.accent || "purple";
}
