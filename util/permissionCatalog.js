/**
 * Derives a flat, display-ready catalog of permission modules from the
 * existing `PERMISSIONS` constant.
 *
 * IMPORTANT: this file only changes how permissions are *presented*. Permission
 * keys (the values submitted to the backend) are taken verbatim from
 * `constants/permissions.js` — nothing is renamed, added or removed here.
 */
import { PERMISSIONS } from "../constants/permissions";
import MENUS, { MENU_MODULES } from "../constants/menus";

/** Display titles for permission groups that have no matching sidebar menu. */
const MODULE_TITLES = {
  items: "Items",
  cleaning: "Cleaning & Packing",
  Products: "Products",
  indents: "Indents & Transportations",
  pick_pack: "Pick & Pack",
  stock_checker: "Stock Checker",
  expiry_checker: "Expiry Checker",
  uploads: "Uploads",
  grn: "GRN",
  purchase_ref: "Purchase Ref",
  gst: "GST",
  Miscellaneous: "Miscellaneous",
};

/** FontAwesome 6 icon per module, so headers stay scannable at a glance. */
const MODULE_ICONS = {
  dashboard: "fa-chart-pie",
  employee: "fa-users",
  master: "fa-database",
  materials: "fa-boxes-stacked",
  purchase_order: "fa-file-signature",
  invoice: "fa-file-invoice",
  items: "fa-box",
  cleaning: "fa-broom",
  eb_consumption: "fa-bolt",
  advance_request: "fa-hand-holding-dollar",
  accounts: "fa-calculator",
  reconcilation: "fa-scale-balanced",
  purchase: "fa-cart-shopping",
  debit_note: "fa-file-circle-minus",
  Products: "fa-tags",
  indents: "fa-truck",
  tickets: "fa-ticket",
  pick_pack: "fa-box-open",
  stock_checker: "fa-clipboard-check",
  expiry_checker: "fa-hourglass-end",
  uploads: "fa-upload",
  grn: "fa-file-import",
  purchase_ref: "fa-receipt",
  gst: "fa-file-invoice-dollar",
  Miscellaneous: "fa-ellipsis",
};

function titleize(key) {
  return String(key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function moduleTitle(menuKey) {
  return MODULE_TITLES[menuKey] || MENUS[menuKey]?.title || titleize(menuKey);
}

function moduleIcon(menuKey) {
  return MODULE_ICONS[menuKey] || "fa-folder";
}

function isNestedPermissionGroup(menuPermissions) {
  const values = Object.values(menuPermissions || {});
  if (!values.length) return false;
  return values.every((v) => typeof v === "object" && v !== null);
}

/** `{ key, label }` for every truthy permission of a group, in declared order. */
function toPermissionList(group) {
  return Object.keys(group || {})
    .filter((key) => group[key])
    .map((key) => ({ key, label: group[key] }));
}

function buildModules() {
  const modules = [];

  Object.keys(PERMISSIONS).forEach((menuKey) => {
    const menuPermissions = PERMISSIONS[menuKey];
    const title = moduleTitle(menuKey);
    const icon = moduleIcon(menuKey);

    if (isNestedPermissionGroup(menuPermissions)) {
      Object.keys(menuPermissions).forEach((groupKey) => {
        const permissions = toPermissionList(menuPermissions[groupKey]);
        if (!permissions.length) return;

        const groupTitle =
          MENU_MODULES[menuKey]?.menu?.[groupKey]?.title || titleize(groupKey);

        modules.push({
          id: `${menuKey}.${groupKey}`,
          title: `${title} · ${groupTitle}`,
          icon,
          colorScheme: menuKey === "gst" ? "blue" : "purple",
          permissions,
        });
      });
      return;
    }

    const permissions = toPermissionList(menuPermissions);
    if (!permissions.length) return;

    modules.push({
      id: menuKey,
      title,
      icon,
      colorScheme: "purple",
      permissions,
    });
  });

  return modules;
}

export const PERMISSION_MODULES = buildModules();

/** Every unique permission key that can be granted from this screen. */
export const ALL_PERMISSION_KEYS = Array.from(
  new Set(
    PERMISSION_MODULES.flatMap((module) =>
      module.permissions.map((permission) => permission.key)
    )
  )
);

export const TOTAL_PERMISSION_COUNT = ALL_PERMISSION_KEYS.length;

/**
 * Number of catalog permissions currently granted. Keys stored against a
 * designation that are no longer listed in `PERMISSIONS` are ignored for the
 * count (they are still preserved on save).
 */
export function countEnabledPermissions(permissions = []) {
  const selected = new Set(permissions);
  return ALL_PERMISSION_KEYS.reduce(
    (total, key) => (selected.has(key) ? total + 1 : total),
    0
  );
}
