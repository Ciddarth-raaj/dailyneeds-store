import API from "../util/api";

/**
 * The Attendance Dashboard, as `routes/attendance_dashboard.js` defines it.
 *
 * FIVE READS, ALL GET, ALL BEHIND `view_attendance_dashboard`. There is no
 * write here and there is nothing to write: the dashboard is an overview of
 * state that already exists. Nothing in this file can approve a request,
 * regularize a punch, edit a time or recalculate a date - the backend router
 * has no such route, and every action the screen links out to goes through the
 * existing helper for that screen, behind its own existing permission.
 *
 *   filters         the real outlets, designations and Shift Management shifts
 *   overview        the six cards and the panels for one attendance date
 *   drilldown       the paginated employee list behind one card or issue
 *   trend           completed attendance days only
 *   recentPunches   the bounded tail of received punches, plus device freshness
 *
 * `store_ids` is sent as a comma-separated list because that is what the route
 * validates. It is a FILTER: the server intersects it with the caller's own
 * scope and it can never widen what the caller may read.
 *
 * Refusals arrive as `{ code: 403, msg }` like every other helper, so the
 * screens read `code` rather than assuming success.
 */
const call = (url, params) =>
  new Promise((resolve, reject) => {
    API.get(url, { params })
      .then((res) => resolve(res.data))
      .catch(reject);
  });

/** Only the filters that were actually chosen are sent. */
const queryFor = ({ attendance_date, store_ids, designation_id, work_shift_id, search }) => {
  const params = { attendance_date };
  if (Array.isArray(store_ids) && store_ids.length > 0) params.store_ids = store_ids.join(",");
  if (designation_id) params.designation_id = designation_id;
  if (work_shift_id) params.work_shift_id = work_shift_id;
  if (search) params.search = search;
  return params;
};

const attendanceDashboard = {
  getFilters: () => call("/attendance/dashboard/filters"),

  /**
   * THE OPERATIONAL SNAPSHOT. Takes no date: the server decides what "now" is
   * and returns one `as_of`. A caller-supplied date would put a past day's
   * figures under a "Now" heading, which is the one thing this view must not
   * do - historical figures keep their own dated view.
   */
  getStaffing: ({ store_ids, designation_id, work_shift_id, search } = {}) => {
    const params = {};
    if (Array.isArray(store_ids) && store_ids.length > 0) params.store_ids = store_ids.join(",");
    if (designation_id) params.designation_id = designation_id;
    if (work_shift_id) params.work_shift_id = work_shift_id;
    if (search) params.search = search;
    return call("/attendance/dashboard/staffing", params);
  },

  /**
   * ONE BUCKET OF THE CURRENT SNAPSHOT, PAGED.
   *
   * The snapshot itself carries only previews, so every full list on the NOW
   * view comes from here: the total this returns is the same number the card
   * shows, because both are produced by one server-side classification. It takes
   * no date for the same reason the snapshot does not, and it returns its OWN
   * `as_of` - a list opened a minute after the card is a new observation, and
   * the screen shows that rather than implying they are the same instant.
   */
  getStaffingDrilldown: ({
    bucket,
    store_ids,
    store_id,
    designation_id,
    work_shift_id,
    search,
    gap_class,
    limit = 50,
    offset = 0,
  } = {}) => {
    const params = { bucket, limit, offset };
    if (Array.isArray(store_ids) && store_ids.length > 0) params.store_ids = store_ids.join(",");
    if (store_id) params.store_id = store_id;
    if (designation_id) params.designation_id = designation_id;
    if (work_shift_id) params.work_shift_id = work_shift_id;
    if (search) params.search = search;
    if (gap_class) params.gap_class = gap_class;
    return call("/attendance/dashboard/staffing/drilldown", params);
  },

  /**
   * Repeated shortfalls against the schedule, with the evidence behind them.
   *
   * IT TAKES THE SAME FILTERS AS THE CARDS, the effective shift included. A
   * pattern panel narrowed differently from the figures above it is a different
   * question wearing the same heading.
   */
  getRecurringGaps: ({ store_ids, designation_id, work_shift_id, search, comparable_days } = {}) => {
    const params = {};
    if (Array.isArray(store_ids) && store_ids.length > 0) params.store_ids = store_ids.join(",");
    if (designation_id) params.designation_id = designation_id;
    if (work_shift_id) params.work_shift_id = work_shift_id;
    if (search) params.search = search;
    if (comparable_days) params.comparable_days = comparable_days;
    return call("/attendance/dashboard/recurring-gaps", params);
  },

  getOverview: (filters) => call("/attendance/dashboard/overview", queryFor(filters)),

  /**
   * `store_unassigned` selects the "no outlet on record" group explicitly.
   * An employee with no store cannot be named by a store filter, and omitting
   * the filter would quietly return everybody.
   */
  getDrilldown: ({ bucket, limit = 50, offset = 0, store_unassigned = false, ...filters }) => {
    const params = { ...queryFor(filters), bucket, limit, offset };
    if (store_unassigned) params.store_unassigned = true;
    return call("/attendance/dashboard/drilldown", params);
  },

  /**
   * THE TREND TAKES THE SAME FILTERS AS EVERYTHING ELSE, SEARCH INCLUDED.
   * This helper used to `delete params.search` and the route used to forbid
   * it, so the chart quietly described a different population from the cards
   * above it. The server applies it per date, against each date's own
   * applicable population.
   */
  getTrend: ({ days, ...filters }) => {
    const params = queryFor(filters);
    if (days) params.days = days;
    return call("/attendance/dashboard/trend", params);
  },

  /**
   * The punches the engine dated to the SELECTED attendance day, for the
   * selected filters - not the latest punches company-wide. Takes the same
   * filter set, because a feed showing another day under these cards is not
   * evidence about anything.
   */
  getRecentPunches: ({ limit = 25, ...filters }) =>
    call("/attendance/dashboard/recent-punches", { ...queryFor(filters), limit }),
};

export default attendanceDashboard;
