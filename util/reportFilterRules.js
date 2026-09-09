/**
 * Reports — the two rules that decide which filters exist.
 *
 * They live outside the component so they can be RUN in a test rather than
 * matched as source. Both are one-liners whose failure modes are quiet and
 * expensive - a filter narrowing a column nobody can see, or an emptied box
 * that still narrows - which is exactly the kind of thing a regex assertion
 * cannot demonstrate.
 */

/**
 * Drop any filter whose column is no longer selected.
 *
 * SELECTED IS THE ELIGIBILITY, so removing a column has to remove its filter
 * too. Leaving one behind is the worst outcome available here: the result
 * count would be narrowed by something the screen no longer shows, and nobody
 * reading the report could explain the number.
 */
function pruneFilters(fieldFilters, selectedKeys) {
  const keep = new Set(selectedKeys || []);
  return (fieldFilters || []).filter((f) => keep.has(f.field));
}

/**
 * Whether a control has been left empty, and so must send no filter at all.
 *
 * An empty text filter sent as `""` becomes `LIKE '%%'` on the server, which
 * still excludes NULLs - so clearing a box would silently keep narrowing.
 */
const isEmptyFilter = (entry, type) => {
  if (type === "date") return !entry.from && !entry.to;
  if (Array.isArray(entry.value)) return entry.value.length === 0;
  return entry.value === undefined || entry.value === null || String(entry.value).trim() === "";
};

module.exports = { pruneFilters, isEmptyFilter };
