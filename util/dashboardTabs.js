/**
 * THE DASHBOARD's tabs - which exist, in what order, who may open each, and
 * which one a URL actually opens.
 *
 * ONE PAGE, FOUR EXISTING SCREENS. `/dashboard` composes screens that were
 * separate pages; it computes nothing of its own. Each tab is the existing
 * screen's own component with its own filters, cards, drill-downs, loading,
 * error and refusal states.
 *
 *   attendance      Attendance Today       the dated (By date) view
 *   staffing        Attendance & Staffing  the Now view
 *   payroll         Payroll                the Payroll Dashboard
 *   my-attendance   My Attendance          the employee's own month - ALWAYS LAST
 *
 * The first two are the two views of ONE screen, which has always had a
 * Now / By date switch. They share one `panel`, so moving between them keeps
 * that screen mounted with its filters, exactly as the switch always did.
 *
 * NO NEW PERMISSIONS. Each tab is offered on the rule its page already used:
 * `view_attendance_dashboard` for both attendance views (there has never been a
 * separate staffing key), the Payrun's own `canOpenPayrun` for Payroll, and
 * nothing for My Attendance, which is every employee's own month. The access
 * map is computed by `customHooks/useDashboardTabAccess.js` from those rules.
 *
 * NOT A SECURITY BOUNDARY. A hidden tab is presentation; every endpoint behind
 * every tab re-checks the caller on the server.
 *
 * CommonJS, so these rules are unit-tested with `node --test` and no bundler.
 */

const DASHBOARD_TABS = [
  { key: "attendance", label: "Attendance Today", panel: "attendance", view: "HISTORY" },
  { key: "staffing", label: "Attendance & Staffing", panel: "attendance", view: "NOW" },
  { key: "payroll", label: "Payroll", panel: "payroll" },
  { key: "my-attendance", label: "My Attendance", panel: "my-attendance" },
];

const DASHBOARD_PATH = "/dashboard";

const tabByKey = (key) => DASHBOARD_TABS.find((t) => t.key === key) || null;

/** The tabs this caller may open, in display order. `access` is `{ [key]: boolean }`. */
function permittedTabs(access) {
  return DASHBOARD_TABS.filter((t) => Boolean(access && access[t.key]));
}

/**
 * WHICH TAB THE URL OPENS.
 *
 *   no `tab`                    the first permitted tab (Attendance Today when allowed)
 *   a permitted `tab`           that tab
 *   unknown, repeated, or not   the first permitted tab, and `fellBack` is true
 *   permitted for this caller   so the shell can correct the URL
 *   nothing permitted           `tab` is null
 *
 * A forbidden tab is refused HERE, before anything renders, so its screen is
 * never mounted and never asks the server for anything.
 */
function resolveDashboardTab(requested, access) {
  const allowed = permittedTabs(access);
  const first = allowed.length ? allowed[0] : null;
  if (requested === undefined || requested === null || requested === "") {
    return { tab: first, fellBack: false };
  }
  // `?tab=a&tab=b` arrives as an array; it names no single tab.
  const key = typeof requested === "string" ? requested : null;
  const match = key ? allowed.find((t) => t.key === key) : null;
  if (match) return { tab: match, fellBack: false };
  return { tab: first, fellBack: true };
}

/** The tab that shows one view of the attendance screen. */
function tabForAttendanceView(view) {
  return view === "HISTORY" ? "attendance" : "staffing";
}

/**
 * `/dashboard?tab=<key>`, carrying any other query parameters across - an old
 * bookmark's query string survives its redirect.
 */
function dashboardHref(tab, query) {
  const params = new URLSearchParams();
  Object.keys(query || {}).forEach((k) => {
    if (k === "tab") return;
    const v = query[k];
    (Array.isArray(v) ? v : [v]).forEach((item) => {
      if (item !== undefined && item !== null) params.append(k, String(item));
    });
  });
  const rest = params.toString();
  return `${DASHBOARD_PATH}?tab=${encodeURIComponent(tab)}${rest ? `&${rest}` : ""}`;
}

/**
 * THE OLD ROUTES, and the tab each now opens. `/attendance/dashboard` opened
 * on its Now view, so it lands on Attendance & Staffing - what that bookmark
 * always showed. `next.config.js` redirects these on a full load and the old
 * page files redirect on an in-app navigation.
 */
const LEGACY_DASHBOARD_ROUTES = {
  "/attendance/dashboard": "staffing",
  "/payroll/dashboard": "payroll",
  "/attendance/my": "my-attendance",
};

module.exports = {
  DASHBOARD_TABS,
  DASHBOARD_PATH,
  LEGACY_DASHBOARD_ROUTES,
  dashboardHref,
  permittedTabs,
  resolveDashboardTab,
  tabByKey,
  tabForAttendanceView,
};
