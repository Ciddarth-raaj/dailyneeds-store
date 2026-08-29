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

/**
 * Best-effort normalization of a free-text offer type (e.g. from an import
 * file) to one of OFFER_TYPES. Falls back to the raw trimmed/lowercased
 * value if it doesn't match a known alias.
 */
export function normalizeOfferType(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (OFFER_TYPES.includes(s)) return s;
  if (["%", "percent", "percentage off", "pct"].includes(s)) return "percentage";
  if (["flat off", "amount", "flat discount"].includes(s)) return "flat";
  if (["fixed", "fixed price", "sell price", "selling price"].includes(s))
    return "fixed_price";
  return s;
}
