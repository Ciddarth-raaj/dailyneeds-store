import currencyFormatter from "./currencyFormatter";

export function getCashSales(accountData) {
  const { total_sales, card_sales, loyalty } = accountData;
  const totalSales = parseFloat(total_sales);
  const cardSales = parseFloat(card_sales);
  const parsedLoyalty = parseFloat(loyalty);

  return totalSales - cardSales - parsedLoyalty;
}
