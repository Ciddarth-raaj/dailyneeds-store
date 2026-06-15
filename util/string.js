export function capitalize(str) {
  if (!str) {
    return "";
  }

  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Indian shorthand: 1k, 1L (lakh), 1Cr (crore). */
export function formatShorthandNumber(value) {
  if (value === null || value === undefined || value === "") return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return "0";

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  const formatUnit = (n, unit) => {
    const rounded = Math.round(n * 100) / 100;
    const text = Number.isInteger(rounded)
      ? String(rounded)
      : String(rounded).replace(/\.?0+$/, "");
    return `${sign}${text}${unit}`;
  };

  if (abs >= 10000000) return formatUnit(abs / 10000000, "Cr");
  if (abs >= 100000) return formatUnit(abs / 100000, "L");
  if (abs >= 1000) return formatUnit(abs / 1000, "k");

  const rounded = Math.round(abs * 100) / 100;
  return `${sign}${Number.isInteger(rounded) ? rounded : rounded}`;
}

export function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
