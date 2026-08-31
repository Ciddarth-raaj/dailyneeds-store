/**
 * Mirrors constants/talker_print.js on the server. The page needs the defaults
 * and the bounds to render controls before any save exists, and the server
 * re-applies both on write - the form is a convenience, not the guard.
 */
export const DEFAULT_PRINT_SETTINGS = {
  card_w_mm: 104,
  card_h_mm: 73,

  show_logo: true,
  logo_w_mm: 26,
  logo_x: 16,
  logo_y: 10,

  title_mm: 4.6,
  title_x: 50,
  title_y: 40,

  lead_mm: 5.2,
  lead_x: 50,
  lead_y: 55,

  big_mm: 18,
  big_x: 50,
  big_y: 71,

  trail_mm: 9,

  subline_mm: 4.4,
  subline_x: 50,
  subline_y: 87,

  brand_color: "#732f8d",
  offer_color: "#f15a22",
  show_border: true,
};

/** The draggable pieces of the card, in the order the editor lists them. */
export const ELEMENTS = [
  { key: "logo", label: "Logo", size: "logo_w_mm" },
  { key: "title", label: "Product / brand name", size: "title_mm" },
  { key: "lead", label: "Lead word (SAVE, SPL PRICE)", size: "lead_mm" },
  { key: "big", label: "The offer number", size: "big_mm" },
  { key: "subline", label: "ON MRP", size: "subline_mm" },
];

export const PRINT_SETTING_LIMITS = {
  card_w_mm: { min: 50, max: 210, step: 1, label: "Card width" },
  card_h_mm: { min: 30, max: 297, step: 1, label: "Card height" },
  logo_w_mm: { min: 8, max: 80, step: 1, label: "Logo width" },
  title_mm: { min: 2, max: 14, step: 0.2, label: "Product / brand name" },
  lead_mm: { min: 2, max: 14, step: 0.2, label: "Lead word (SAVE, SPL PRICE)" },
  big_mm: { min: 4, max: 45, step: 0.5, label: "The offer number" },
  trail_mm: { min: 2, max: 25, step: 0.5, label: "OFF" },
  subline_mm: { min: 2, max: 14, step: 0.2, label: "ON MRP" },
};

/** A4 less the safety margin that stops a sheet spilling a blank page. */
export const SHEET_W_MM = 208;
export const SHEET_H_MM = 292;

export function sheetLayout({ card_w_mm, card_h_mm }) {
  const cols = Math.max(1, Math.floor(SHEET_W_MM / card_w_mm));
  const rows = Math.max(1, Math.floor(SHEET_H_MM / card_h_mm));
  return {
    cols,
    rows,
    per_sheet: cols * rows,
    width_mm: +(cols * card_w_mm).toFixed(2),
    height_mm: +(rows * card_h_mm).toFixed(2),
  };
}
