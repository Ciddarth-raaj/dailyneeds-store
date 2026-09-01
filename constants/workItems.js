/**
 * Shared vocabulary for work items — tickets and tasks are the same record
 * separated by `item_type`, so every screen reads its labels and colours here.
 */

export const ITEM_TYPES = {
  ticket: { label: "Ticket", plural: "Tickets", icon: "fa-ticket", colorScheme: "purple" },
  task: { label: "Task", plural: "Tasks", icon: "fa-circle-check", colorScheme: "teal" },
};

export const STATUS_META = {
  open: { label: "Open", colorScheme: "orange" },
  in_progress: { label: "In Progress", colorScheme: "blue" },
  closed: { label: "Closed", colorScheme: "gray" },
};

export const PRIORITY_META = {
  low: { label: "Low", colorScheme: "blue", rank: 1 },
  medium: { label: "Medium", colorScheme: "orange", rank: 2 },
  high: { label: "High", colorScheme: "red", rank: 3 },
  urgent: { label: "Urgent", colorScheme: "red", rank: 4 },
};

export const STATUS_LIST = Object.keys(STATUS_META).map((id) => ({
  id,
  value: STATUS_META[id].label,
}));

export const PRIORITY_LIST = Object.keys(PRIORITY_META).map((id) => ({
  id,
  value: PRIORITY_META[id].label,
}));

export const ITEM_TYPE_LIST = Object.keys(ITEM_TYPES).map((id) => ({
  id,
  value: ITEM_TYPES[id].label,
}));

export const RECURRENCE_FREQUENCIES = [
  { id: "daily", value: "Daily" },
  { id: "weekly", value: "Weekly" },
  { id: "monthly", value: "Monthly" },
];

export const WEEKDAYS = [
  { id: "0", value: "Sunday" },
  { id: "1", value: "Monday" },
  { id: "2", value: "Tuesday" },
  { id: "3", value: "Wednesday" },
  { id: "4", value: "Thursday" },
  { id: "5", value: "Friday" },
  { id: "6", value: "Saturday" },
];

export const statusMeta = (status) =>
  STATUS_META[status] || { label: "None", colorScheme: "gray" };

export const priorityMeta = (priority) =>
  PRIORITY_META[priority] || { label: "None", colorScheme: "gray" };

export const itemTypeMeta = (itemType) => ITEM_TYPES[itemType] || ITEM_TYPES.ticket;

/** Midnight-anchored day difference: negative is overdue, 0 is today. */
export const daysUntilDue = (dueDate) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;
  const atMidnight = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((atMidnight(due) - atMidnight(new Date())) / 86400000);
};

/**
 * How a due date should read and colour in the UI.
 * Closed items never show as overdue — the work is done.
 */
export const dueMeta = (dueDate, status) => {
  const days = daysUntilDue(dueDate);
  if (days === null) return null;

  if (status === "closed") {
    return { label: `Due ${formatDate(dueDate)}`, colorScheme: "gray", overdue: false };
  }

  if (days < 0) {
    const n = Math.abs(days);
    return {
      label: `Overdue by ${n} day${n === 1 ? "" : "s"}`,
      colorScheme: "red",
      overdue: true,
    };
  }

  if (days === 0) return { label: "Due today", colorScheme: "orange", overdue: false };
  if (days === 1) return { label: "Due tomorrow", colorScheme: "orange", overdue: false };
  if (days <= 7) return { label: `Due in ${days} days`, colorScheme: "blue", overdue: false };

  return { label: `Due ${formatDate(dueDate)}`, colorScheme: "gray", overdue: false };
};

export const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${String(date.getFullYear()).slice(-2)}`;
};

export const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = date.getHours() >= 12 ? "PM" : "AM";
  return `${formatDate(value)}, ${hours}:${minutes} ${ampm}`;
};

/** "just now" / "4h ago" / "12/08/25" — for comment and activity timestamps. */
export const formatRelative = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(value);
};

/** Today as YYYY-MM-DD, for date input defaults. */
export const todayISO = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** Human summary of a recurrence rule, e.g. "Every 2 weeks on Monday". */
export const describeRecurrence = (recurrence) => {
  if (!recurrence) return "";

  const every = Number(recurrence.interval_value) || 1;
  const unit = { daily: "day", weekly: "week", monthly: "month" }[
    recurrence.frequency
  ];
  if (!unit) return "";

  const cadence = every === 1 ? `Every ${unit}` : `Every ${every} ${unit}s`;

  if (recurrence.frequency === "weekly" && recurrence.day_of_week !== null) {
    const day = WEEKDAYS.find(
      (d) => String(d.id) === String(recurrence.day_of_week)
    );
    if (day) return `${cadence} on ${day.value}`;
  }

  if (recurrence.frequency === "monthly" && recurrence.day_of_month) {
    return `${cadence} on day ${recurrence.day_of_month}`;
  }

  return cadence;
};
