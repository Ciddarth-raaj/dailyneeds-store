import currencyFormatter from "./currencyFormatter";

export function getCashSales(accountData) {
  const { total_sales, card_sales, loyalty } = accountData;
  const totalSales = parseFloat(total_sales);
  const cardSales = parseFloat(card_sales);
  const parsedLoyalty = parseFloat(loyalty);

  return totalSales - cardSales - parsedLoyalty;
}

export function getTotals(accounts) {
  const totals = accounts.reduce(
    (acc, item) => {
      return {
        total_sales: acc.total_sales + parseFloat(item.total_sales || 0),
        card_sales: acc.card_sales + parseFloat(item.card_sales || 0),
        sales_return: acc.sales_return + parseFloat(item.sales_return || 0),
        loyalty: acc.loyalty + parseFloat(item.loyalty || 0),
        cash_sales: acc.cash_sales + getCashSales(item),
      };
    },
    {
      total_sales: 0,
      card_sales: 0,
      sales_return: 0,
      loyalty: 0,
      cash_sales: 0,
    }
  );

  // Format all values
  return {
    total_sales: (
      <b style={{ color: "var(--chakra-colors-purple-500)" }}>
        {currencyFormatter(totals.total_sales)}
      </b>
    ),
    card_sales: <b>{currencyFormatter(totals.card_sales)}</b>,
    sales_return: <b>{currencyFormatter(totals.sales_return)}</b>,
    loyalty: <b>{currencyFormatter(totals.loyalty)}</b>,
    cash_sales: <b>{currencyFormatter(totals.cash_sales)}</b>,
  };
}

export function getDenominations(accounts) {
  // Define all possible denominations
  const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];

  // Calculate totals for each denomination
  const denominationRows = denominations.map((denom) => {
    const count = accounts.reduce((sum, account) => {
      const handoverKey = `cash_handover_${denom}`;
      return sum + (parseInt(account[handoverKey]) || 0);
    }, 0);

    return {
      denomination: currencyFormatter(denom, { minimumFractionDigits: 0 }),
      count: count,
      total: currencyFormatter(denom * count),
      rawTotal: denom * count, // Add raw value for sum calculation
    };
  });

  // Calculate grand total
  const grandTotal = denominationRows.reduce(
    (sum, row) => sum + row.rawTotal,
    0
  );

  // Add total row
  denominationRows.push({
    count: <b>Total</b>,
    total: (
      <b style={{ color: "var(--chakra-colors-purple-500)" }}>
        {currencyFormatter(grandTotal)}
      </b>
    ),
  });

  return denominationRows;
}
