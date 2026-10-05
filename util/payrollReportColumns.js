/**
 * Payroll Reports - column selection rules, pure.
 *
 * ORDER IS THE CONTRACT: the array position of a field key is the column
 * position on screen, in the saved month layout, in a template and in the
 * Excel / PDF export. Every operation here returns a NEW array; none of them
 * re-sorts what the user arranged.
 *
 * CommonJS so `node --test` runs it without a bundler.
 */

/** Columns "Clear optional columns" keeps: who a row is about. */
const IDENTITY_KEYS = ["employee_id", "employee_name"];

function toggle(selected, key, maxFields) {
  const list = Array.isArray(selected) ? selected : [];
  if (list.includes(key)) return list.filter((k) => k !== key);
  if (maxFields > 0 && list.length >= maxFields) return list;
  return [...list, key];
}

/** Every field of a group, ticked; already-selected keys keep their place, new ones go to the end. */
function selectAllInGroup(selected, group, maxFields) {
  const list = Array.isArray(selected) ? [...selected] : [];
  for (const field of (group && group.fields) || []) {
    if (list.includes(field.key)) continue;
    if (maxFields > 0 && list.length >= maxFields) break;
    list.push(field.key);
  }
  return list;
}

/** Every field of a group, unticked. */
function clearGroup(selected, group) {
  const keys = new Set(((group && group.fields) || []).map((f) => f.key));
  return (Array.isArray(selected) ? selected : []).filter((k) => !keys.has(k));
}

const isGroupFullySelected = (selected, group) =>
  Boolean(group && group.fields.length) && group.fields.every((f) => (selected || []).includes(f.key));

/** Keep only the identity columns that are selected; drop everything optional. */
function clearOptional(selected) {
  return (Array.isArray(selected) ? selected : []).filter((k) => IDENTITY_KEYS.includes(k));
}

function move(selected, index, delta) {
  const next = [...(selected || [])];
  const target = index + delta;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Drag-and-drop: take the column at `from` and drop it at `to`. */
function reorder(selected, from, to) {
  const next = [...(selected || [])];
  if (from === to || from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Group fields by search text (label, group, sub-group); groups with no match are dropped. */
function filterGroups(groups, search) {
  const term = String(search || "").trim().toLowerCase();
  if (!term) return groups || [];
  return (groups || [])
    .map((g) => ({
      ...g,
      fields: g.fields.filter(
        (f) =>
          f.label.toLowerCase().includes(term) ||
          String(f.subgroup || "").toLowerCase().includes(term) ||
          g.group.toLowerCase().includes(term)
      ),
    }))
    .filter((g) => g.fields.length > 0);
}

/** Keys the catalogue no longer offers this user are dropped, so the table never asks for them. */
function availableOnly(selected, groups) {
  const known = new Set();
  (groups || []).forEach((g) => g.fields.forEach((f) => known.add(f.key)));
  return (selected || []).filter((k) => known.has(k));
}

const SOURCE_BADGE = {
  PAYRUN: { label: "Payrun", color: "green" },
  PAYRUN_SNAPSHOT: { label: "Payrun snapshot", color: "teal" },
  ATTENDANCE_MONTH: { label: "Attendance (as read)", color: "blue" },
  CURRENT_MASTER: { label: "Current master", color: "orange" },
  COMPUTED: { label: "Computed", color: "gray" },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const monthLabel = (year, month) => `${MONTH_NAMES[Number(month) - 1]} ${year}`;

/** "2026-9" <-> { year, month } for a <select> value. */
const monthValue = (m) => `${m.year}-${m.month}`;
const parseMonthValue = (v) => {
  const [y, m] = String(v || "").split("-").map(Number);
  return Number.isInteger(y) && Number.isInteger(m) ? { year: y, month: m } : null;
};

module.exports = {
  IDENTITY_KEYS,
  toggle,
  selectAllInGroup,
  clearGroup,
  isGroupFullySelected,
  clearOptional,
  move,
  reorder,
  filterGroups,
  availableOnly,
  SOURCE_BADGE,
  MONTH_NAMES,
  monthLabel,
  monthValue,
  parseMonthValue,
};
