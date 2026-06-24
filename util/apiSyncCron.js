import moment from "moment";

export const BULK_CRON_WINDOW_MINUTES = 10;
const IST_OFFSET_MINUTES = 330;

export function momentIst(value) {
  return moment.utc(value).utcOffset(IST_OFFSET_MINUTES);
}

export function parseCronDailyTime(cronExpression) {
  if (!cronExpression) return null;
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const [minuteField, hourField] = parts;
  if (!/^\d+$/.test(minuteField) || !/^\d+$/.test(hourField)) return null;
  const minute = Number(minuteField);
  const hour = Number(hourField);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatCronTimeLabel(cronExpression) {
  const parsed = parseCronDailyTime(cronExpression);
  if (!parsed) return null;
  return `${String(parsed.hour).padStart(2, "0")}:${String(
    parsed.minute
  ).padStart(2, "0")}`;
}

export function formatBulkSlotLabel(slot, cronExpression) {
  const cronTime = formatCronTimeLabel(cronExpression);
  const dateLabel = momentIst(slot.expected_at).format("DD MMM");
  if (cronTime) return `${dateLabel} · ${cronTime}`;
  return `${dateLabel} · ${momentIst(slot.expected_at).format("HH:mm")}`;
}

export function formatBulkDateTime(value, cronExpression) {
  if (!value) return "-";
  const cronTime = formatCronTimeLabel(cronExpression);
  const dateLabel = momentIst(value).format("DD MMM");
  if (cronTime) return `${dateLabel} · ${cronTime}`;
  return `${dateLabel} · ${momentIst(value).format("HH:mm")}`;
}

export function isWithinBulkCronWindow(
  createdAt,
  cronExpression,
  toleranceMin = BULK_CRON_WINDOW_MINUTES
) {
  const parsed = parseCronDailyTime(cronExpression);
  if (!parsed || !createdAt) return false;

  const logIst = momentIst(createdAt);
  const expectedRun = logIst
    .clone()
    .startOf("day")
    .hour(parsed.hour)
    .minute(parsed.minute)
    .second(0)
    .millisecond(0);

  return Math.abs(logIst.diff(expectedRun, "minutes")) <= toleranceMin;
}

export function formatIstShortDateTime(value) {
  if (!value) return "-";
  const m = momentIst(value);
  return `${m.format("DD MMM")} · ${m.format("HH:mm")}`;
}

export function formatIstDateTime(value) {
  if (!value) return "-";
  return momentIst(value).format("DD/MM/YYYY • hh:mm A");
}

export function resolveCronSource(log, cronExpression) {
  if (isWithinBulkCronWindow(log?.created_at, cronExpression)) return "cron";
  return "manual";
}

/** @deprecated use resolveCronSource */
export const resolveBulkSource = resolveCronSource;
