export default function currencyFormatter(value) {
  let formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  });

  return formatter.format(value);
}
