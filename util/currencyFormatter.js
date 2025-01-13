export default function currencyFormatter(value) {
  let formatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
  });

  return formatter.format(value);
}
