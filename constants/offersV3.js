export const OFFER_TYPES = ["percentage", "flat", "fixed_price"];

export const OFFER_TYPE_LABELS = {
  percentage: "Percentage",
  flat: "Flat",
  fixed_price: "Fixed Price",
};

export const OFFER_TYPE_OPTIONS = OFFER_TYPES.map((type) => ({
  id: type,
  value: OFFER_TYPE_LABELS[type],
}));

export const ITEM_STATUSES = ["active", "inactive"];

export const ITEM_STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
};

export const ITEM_STATUS_COLORS = {
  active: "green",
  inactive: "red",
};

export const BATCH_STATUSES = ["active", "zero_stock_flagged", "batch_zero_ended", "inactive"];

export const BATCH_STATUS_LABELS = {
  active: "Active",
  zero_stock_flagged: "Zero Stock — Flagged",
  batch_zero_ended: "Batch Zero — Ended",
  inactive: "Inactive",
};

export const BATCH_STATUS_COLORS = {
  active: "green",
  zero_stock_flagged: "orange",
  batch_zero_ended: "gray",
  inactive: "red",
};
