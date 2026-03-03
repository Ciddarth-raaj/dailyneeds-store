/**
 * Format a Date as YYYY-MM-DD (local date).
 */
export function formatYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Return { date_from, date_to } for the current calendar month.
 */
export function getMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    date_from: formatYYYYMMDD(first),
    date_to: formatYYYYMMDD(last),
  };
}
