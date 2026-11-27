/**
 * The season every Stock Audit request works on: `?period=<season code>`.
 * A request that names its own period keeps it; with nothing selected the
 * server uses the current season (running today, else the latest started).
 */
export const withSeason = (selected, params) => (selected && (!params || params.period === undefined || params.period === null) ? { ...(params || {}), period: selected } : params);

/** The season to show: the one chosen earlier if it still exists, else the server's current one, else the newest. */
export function pickSeason(meta, chosen) {
  const list = (meta && meta.seasons) || [];
  if (chosen && list.some((x) => x.period_code === chosen)) return chosen;
  if (meta && meta.current_period && list.some((x) => x.period_code === meta.current_period)) return meta.current_period;
  return list[0] ? list[0].period_code : null;
}
