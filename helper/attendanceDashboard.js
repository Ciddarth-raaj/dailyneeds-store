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

  getOverview: (filters) => call("/attendance/dashboard/overview", queryFor(filters)),

  getDrilldown: ({ bucket, limit = 50, offset = 0, ...filters }) =>
    call("/attendance/dashboard/drilldown", { ...queryFor(filters), bucket, limit, offset }),

  /** The trend takes no `search`: it is an aggregate over days, not people. */
  getTrend: ({ days, ...filters }) => {
    const params = queryFor(filters);
    delete params.search;
    if (days) params.days = days;
    return call("/attendance/dashboard/trend", params);
  },

  getRecentPunches: ({ store_ids, limit = 25 } = {}) => {
    const params = { limit };
    if (Array.isArray(store_ids) && store_ids.length > 0) params.store_ids = store_ids.join(",");
    return call("/attendance/dashboard/recent-punches", params);
  },
};

export default attendanceDashboard;
