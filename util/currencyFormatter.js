export default function currencyFormatter(value, minFractionDigits = 0) {
  let formatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
  });

  return formatter.format(value);
}
