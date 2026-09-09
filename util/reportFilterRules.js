/**
 * Reports — the rules that decide which filters exist, and what is sent.
 *
 * They live outside the component so they can be RUN in a test rather than
 * matched as source. Each is small, and each has a failure mode that is quiet
 * and expensive: a filter narrowing a column nobody can see, an emptied box
 * that still narrows, or - the one this file exists for - a saved filter that
 * vanishes the moment somebody touches a column.
 *
 * ============================================ TWO KINDS OF FILTER, NOT ONE ==
 *
 * COMMON filters - employment status, outlet, department, designation, search
 * - are operational controls belonging to the report RUN. They are always
 * available, whether or not the matching column is displayed: narrowing a
 * Bank/KYC report to one branch does not require Outlet to be one of its
 * columns. They travel as the backend filter keys that already existed.
 *
 * DYNAMIC filters are any other field, and are available only while that
 * field is a column of the report. The backend enforces that too - a dynamic
 * filter must be in `field_keys` - because a filter you cannot see on screen
 * is a filter nobody can check.
 *
 * The distinction is why removing a column removes its DYNAMIC filter and
 * leaves the common ones alone.
 */

/**
 * The four fields whose filters are the report run's own, keyed by the
 * catalogue field they correspond to. The frontend is allowed to know these
 * four by name - they map onto backend filter keys that predate the field
 * catalogue - and nothing else about Employee Master.
 */
const COMMON_FILTER_FIELDS = {
  employment_status: "status",
  outlet: "outlet_ids",
  department: "department_ids",
  designation: "designation_ids",
};

/** The complete filter definition, with nothing applied. */
const emptyCommon = () => ({
  status: "active",
  outlet_ids: [],
  department_ids: [],
  designation_ids: [],
  search: "",
});

/**
 * Split a saved report's filters into the state the screen holds.
 *
 * THE WHOLE DEFINITION IS KEPT, which is the point. A saved report carries
 * `status`, `outlet_ids`, `department_ids`, `designation_ids`, `search` and
 * `field_filters`; holding only the last two meant that the moment a column
 * changed and the definition was sent expanded, the other four were gone -
 * silently widening the report, and saving a copy of something narrower than
 * what was on screen.
 *
 * A saved `field_filters` entry naming one of the four common fields is
 * folded into its own key rather than kept as a dynamic filter, so there is
 * one representation of each concept however an older template spelled it.
 */
function splitSavedFilters(saved) {
  const src = saved && typeof saved === "object" ? saved : {};
  const common = emptyCommon();

  if (src.status) common.status = String(src.status);
  for (const key of ["outlet_ids", "department_ids", "designation_ids"]) {
    if (Array.isArray(src[key])) common[key] = [...src[key]];
  }
  if (src.search) common.search = String(src.search);

  const fieldFilters = [];
  for (const entry of Array.isArray(src.field_filters) ? src.field_filters : []) {
    if (!entry || typeof entry !== "object") continue;
    const mapped = COMMON_FILTER_FIELDS[entry.field];
    if (!mapped) {
      fieldFilters.push(entry);
      continue;
    }
    if (mapped === "status") {
      if (entry.value) common.status = String(entry.value);
    } else if (Array.isArray(entry.value)) {
      common[mapped] = [...entry.value];
    }
  }

  return { common, fieldFilters };
}

/**
 * The filters to send, and to save. One function, so a preview, an export and
 * a Save a Copy cannot describe three different reports.
 */
function toRequestFilters(common, fieldFilters) {
  const c = common || emptyCommon();
  return {
    status: c.status || "active",
    outlet_ids: c.outlet_ids || [],
    department_ids: c.department_ids || [],
    designation_ids: c.designation_ids || [],
    search: c.search || "",
    field_filters: fieldFilters || [],
  };
}

/**
 * Drop any DYNAMIC filter whose column is no longer selected.
 *
 * A dynamic filter is eligible only while its column is in the report, so
 * removing the column has to remove the filter: leaving one behind would
 * narrow the count by something the screen no longer shows, and the backend
 * would refuse the request anyway. Common filters are not passed through
 * here at all - they are held separately, and losing one because a column was
 * removed is the bug this shape prevents.
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

/** Which common filters are actually narrowing anything, for the chips. */
function activeCommon(common) {
  const c = common || emptyCommon();
  const out = [];
  if (c.status && c.status !== "active") out.push({ key: "status", value: c.status });
  for (const key of ["outlet_ids", "department_ids", "designation_ids"]) {
    if ((c[key] || []).length) out.push({ key, value: c[key] });
  }
  if (c.search) out.push({ key: "search", value: c.search });
  return out;
}

module.exports = {
  COMMON_FILTER_FIELDS,
  emptyCommon,
  splitSavedFilters,
  toRequestFilters,
  pruneFilters,
  isEmptyFilter,
  activeCommon,
};
