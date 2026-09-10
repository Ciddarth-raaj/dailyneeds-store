/**
 * Attendance List / Punch Audit - pure helpers for the screens.
 *
 * Kept free of React and of the API so they can be tested with
 * `node --test util/attendanceRaw.test.js`, the way util/workShiftForm.js is.
 */

/** Dynamic Clock Time columns: N follows the widest row, never a fixed 4. */
function clockTimeColumnCount(meta, rows) {
  const fromMeta = meta && Number(meta.max_punch_count);
  if (Number.isSafeInteger(fromMeta) && fromMeta > 0) return fromMeta;
  return (rows || []).reduce((max, r) => Math.max(max, (r.punches || []).length), 0);
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' (the app's display convention). */
function displayDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** 'YYYY-MM-DD HH:MM:SS' -> 'DD/MM/YYYY HH:MM:SS'. */
function displayDateTime(value) {
  if (!value) return "";
  const [d, t] = String(value).split(" ");
  return t ? `${displayDate(d)} ${t}` : displayDate(d);
}

/** The fixed part of the Attendance List, then Clock Time-1..N, then the count. */
function attendanceListColumns(n) {
  const cols = [
    { key: "user_id", header: "Employee Code" },
    { key: "employee_name", header: "Employee Name" },
    { key: "department_name", header: "Department" },
    { key: "home_outlet", header: "Home Outlet" },
    { key: "clock_date", header: "Clock Date" },
  ];
  for (let i = 1; i <= n; i += 1) {
    cols.push({ key: `clock_time_${i}`, header: `Clock Time-${i}`, punchIndex: i - 1 });
  }
  cols.push({ key: "punch_count", header: "Punches" });
  return cols;
}

/**
 * Flatten a row for the grid: `clock_time_1..n` hold the punch objects (the
 * cell renderer shows time + location), `clock_date` is display-formatted.
 * Nothing about IN/OUT, hours or status is computed here - or anywhere.
 */
function flattenRow(row, n) {
  const flat = {
    ...row,
    clock_date_display: displayDate(row.clock_date),
  };
  for (let i = 0; i < n; i += 1) {
    flat[`clock_time_${i + 1}`] = row.punches && row.punches[i] ? row.punches[i] : null;
  }
  return flat;
}

/** The Punches cell text: "4", or "4 (+1 quarantined)". */
function punchesCellText(row) {
  const q = Number(row.quarantined_punch_count) || 0;
  return q > 0 ? `${row.punch_count} (+${q} quarantined)` : String(row.punch_count);
}

/** Query string for the Punch Audit tab pre-filtered to one employee's day. */
function auditLinkFor(row) {
  const params = new URLSearchParams({
    tab: "audit",
    from: row.clock_date,
    to: row.clock_date,
    employee_id: String(row.employee_id),
    attendance_date: row.clock_date,
  });
  return `/attendance/list?${params.toString()}`;
}

/** The Attendance List query, with nothing about devices in it. */
function buildListQuery(filters) {
  const q = { from: filters.from, to: filters.to };
  if (filters.home_outlet_id) q.home_outlet_id = filters.home_outlet_id;
  if (filters.department_id) q.department_id = filters.department_id;
  if (filters.search && filters.search.trim()) q.search = filters.search.trim();
  return q;
}

function buildAuditQuery(filters) {
  const q = { from: filters.from, to: filters.to, limit: filters.limit || 500, offset: filters.offset || 0 };
  if (filters.dev_id) q.dev_id = filters.dev_id;
  if (filters.punch_outlet_id) q.punch_outlet_id = filters.punch_outlet_id;
  if (filters.device_status) q.device_status = filters.device_status;
  if (filters.review) q.review = filters.review;
  if (filters.source_ip && filters.source_ip.trim()) q.source_ip = filters.source_ip.trim();
  if (filters.search && filters.search.trim()) q.search = filters.search.trim();
  if (filters.employee_id) q.employee_id = filters.employee_id;
  if (filters.attendance_date) q.attendance_date = filters.attendance_date;
  return q;
}

/** Human wording for the review-queue statuses, all neutral. */
const DERIVATION_STATUS_LABEL = {
  OK: "Dated",
  UNMATCHED: "Employee code not in employee master",
  NO_SHIFT: "Employee has no assigned shift",
  NO_SCHEDULE_ROW: "Shift has no schedule row for that weekday",
  MISSING_CUTOFF: "Shift day has no Attendance Day Cutoff",
};

const DEVICE_STATUS_LABEL = {
  REGISTERED: "Registered",
  INACTIVE_DEVICE: "Inactive device at that time",
  UNREGISTERED_DEVICE: "Unregistered device",
};

/** Banner sentences from `meta`, each with the screen that fixes it. */
function bannerItems(meta) {
  if (!meta) return [];
  const items = [];
  if (meta.no_shift_punches > 0) {
    items.push({ key: "no_shift", text: `${meta.no_shift_punches} punch(es) from employees without an assigned shift are in the review queue.`, href: "/employee-shift-assignment", linkText: "Employee Shift Assignment" });
  }
  if (meta.missing_cutoff_punches > 0 || meta.no_schedule_row_punches > 0) {
    const n = (meta.missing_cutoff_punches || 0) + (meta.no_schedule_row_punches || 0);
    items.push({ key: "config", text: `${n} punch(es) could not be dated because a working shift day has no Attendance Day Cutoff.`, href: "/work-shift", linkText: "Work Shift Master" });
  }
  if (meta.unmatched_punches > 0) {
    items.push({ key: "unmatched", text: `${meta.unmatched_punches} punch(es) carry an employee code that is not in the employee master.`, href: "/hr/employees", linkText: "Employees" });
  }
  if (meta.unregistered_device_punches > 0 || (meta.unregistered_devices || []).length > 0) {
    items.push({ key: "unregistered", text: `${meta.unregistered_device_punches || 0} punch(es) from ${(meta.unregistered_devices || []).length} unregistered device(s) are quarantined until the device is registered.`, href: "/attendance/devices", linkText: "Devices" });
  }
  if (meta.inactive_device_punches > 0) {
    items.push({ key: "inactive", text: `${meta.inactive_device_punches} punch(es) came from a device with no active location at that time and are quarantined.`, href: "/attendance/devices", linkText: "Devices" });
  }
  return items;
}

module.exports = {
  clockTimeColumnCount,
  displayDate,
  displayDateTime,
  attendanceListColumns,
  flattenRow,
  punchesCellText,
  auditLinkFor,
  buildListQuery,
  buildAuditQuery,
  bannerItems,
  DERIVATION_STATUS_LABEL,
  DEVICE_STATUS_LABEL,
};
