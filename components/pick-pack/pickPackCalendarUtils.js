import moment from "moment";

export function hasPickPackReason(row) {
  const rid = row?.remark_id;
  if (rid != null && rid !== "") return true;
  const s = row?.remark_str;
  return s != null && String(s).trim() !== "";
}

export function aggregatePickPackDaysByReason(recordsList = []) {
  const map = {};
  recordsList.forEach((row) => {
    if (!row?.date) return;
    const d = moment(row.date).format("YYYY-MM-DD");
    if (!map[d]) map[d] = { total: 0, filled: 0 };
    map[d].total += 1;
    if (hasPickPackReason(row)) map[d].filled += 1;
  });
  return map;
}

export function getPickPackDayVisual(agg) {
  if (!agg || agg.total === 0) {
    return {
      kind: "empty",
      bg: "red.50",
      border: "red.200",
      text: "red.600",
      hint: "No records",
    };
  }
  if (agg.filled >= agg.total) {
    return {
      kind: "filled",
      bg: "green.50",
      border: "green.200",
      text: "green.600",
      hint: `All reasons filled (${agg.filled}/${agg.total})`,
    };
  }
  const unfilled = agg.total - agg.filled;
  return {
    kind: "unfilled",
    bg: "yellow.50",
    border: "yellow.300",
    text: "yellow.800",
    hint: `Unfilled (${unfilled}/${agg.total})`,
  };
}
