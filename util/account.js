import currencyFormatter from "./currencyFormatter";

export function getCashSales(accountData) {
  const { total_sales, card_sales, loyalty } = accountData;
  const totalSales = parseFloat(total_sales);
  const cardSales = parseFloat(card_sales);
  const parsedLoyalty = parseFloat(loyalty);

  return totalSales - cardSales - parsedLoyalty;
}

export function getTotals(accounts, noFormat = false) {
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

  if (noFormat) {
    return totals;
  }

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

export const getTotalCashHandover = (values, noFormat = false) => {
  const {
    cash_handover_1,
    cash_handover_2,
    cash_handover_5,
    cash_handover_10,
    cash_handover_20,
    cash_handover_50,
    cash_handover_100,
    cash_handover_200,
    cash_handover_500,
  } = values;
  let totalCashHandover = 0;

  totalCashHandover += parseInt(cash_handover_1) * 1;
  totalCashHandover += parseInt(cash_handover_2) * 2;
  totalCashHandover += parseInt(cash_handover_5) * 5;
  totalCashHandover += parseInt(cash_handover_10) * 10;
  totalCashHandover += parseInt(cash_handover_20) * 20;
  totalCashHandover += parseInt(cash_handover_50) * 50;
  totalCashHandover += parseInt(cash_handover_100) * 100;
  totalCashHandover += parseInt(cash_handover_200) * 200;
  totalCashHandover += parseInt(cash_handover_500) * 500;

  if (noFormat) {
    return totalCashHandover;
  }

  return currencyFormatter(totalCashHandover);
};

export const getAmmountDifference = (values) => {
  try {
    const { total_sales, card_sales, loyalty, sales_return, accounts, sales } =
      values;

    let calculated_sales =
      getTotalCashHandover(values, true) +
      (card_sales ? parseFloat(card_sales) : 0) +
      (loyalty ? parseFloat(loyalty) : 0) +
      (sales_return ? parseFloat(sales_return) : 0);

    if (accounts || sales) {
      (accounts ?? sales).forEach((item) => {
        if (item.payment_type == 1) {
          // Payment
          calculated_sales += item.amount ? parseFloat(item.amount) : 0;
        } else {
          // Receipt
          calculated_sales -= item.amount ? parseFloat(item.amount) : 0;
        }
      });
    }

    return total_sales - calculated_sales;
  } catch (err) {
    console.log(err);
    return "Invalid!";
  }
};

export function getCashBook(accounts) {
  const totals = getTotals(accounts, true);
  const rows = [];

  rows.push({
    particulars: "Cash Sales",
    narration: "",
    debit: totals.cash_sales + totals.loyalty - totals.sales_return,
    credit: "",
    rank: 1,
  });

  rows.push({
    particulars: "Loyalty",
    narration: "",
    debit: "",
    credit: totals.loyalty,
    rank: 1,
  });

  accounts.forEach((item) => {
    if (item.sales) {
      item.sales.forEach((item) => {
        rows.push({
          particulars: item.person_name,
          narration: item.description,
          debit: item.payment_type === 2 ? item.amount : "",
          credit: item.payment_type === 1 ? item.amount : "",
          rank: item.payment_type + 2,
        });
      });
    }
  });

  let difference = 0;
  let totalCashHandover = 0;
  accounts.forEach((item) => {
    difference += getAmmountDifference(item);
    totalCashHandover += getTotalCashHandover(item, true);

    const individualDifference = getAmmountDifference(item);

    if (individualDifference < 0) {
      rows.push({
        particulars: item.cashier_name,
        narration: "",
        debit: "",
        credit: Math.abs(individualDifference),
        rank: 5,
      });
    }
  });

  if (difference > 0) {
    rows.push({
      particulars: "Cash Excess",
      narration: "",
      credit: "",
      debit: difference,
      rank: 4,
    });
  }

  rows.push({
    particulars: "Cash",
    narration: "Handover",
    debit: "",
    credit: totalCashHandover,
    rank: 6,
  });

  rows.sort((a, b) => a.rank - b.rank);

  const calculated = rows.reduce(
    (acc, item) => {
      if (item.debit) {
        acc.debit += item.debit;
        acc.total += item.debit;
      }

      if (item.credit) {
        acc.credit += item.credit;
        acc.total -= item.credit;
      }
      return acc;
    },
    { debit: 0, credit: 0, total: 0 }
  );

  rows.push({
    particulars: "Closing Cash",
    debit: "",
    credit: calculated.total,
    rank: 7,
  });

  rows.push({
    particulars: "",
    debit: calculated.debit,
    credit: calculated.credit + calculated.total,
    rank: 7,
  });

  return rows.map((item) => ({
    ...item,
    debit: item.debit ? currencyFormatter(item.debit) : "",
    credit: item.credit ? currencyFormatter(item.credit) : "",
  }));
}

function getDisplayNameFromKey(key) {
  if (key === "hdur") return "HDFC UPI";
  if (key === "hfpp") return "Card";
  if (key === "sedc") return "Sodexo";
  if (key === "ppbl") return "Paytm";
  return key;
}

export function getEbook(accounts, totals) {
  const modified = [
    {
      particulars: "Card Sales",
      narration: "",
      debit: totals.card_sales,
      credit: "",
      ranking: 1,
    },
  ];

  accounts.forEach((item) => {
    if (item.hdur) {
      modified.push({
        particulars: getDisplayNameFromKey("hdur"),
        narration: item.paytm_tid,
        debit: "",
        credit: item.hdur,
        ranking: 2,
      });
    }

    if (item.hfpp) {
      modified.push({
        particulars: getDisplayNameFromKey("hfpp"),
        narration: item.paytm_tid,
        debit: "",
        credit: item.hfpp,
        ranking: 3,
      });
    }

    if (item.sedc) {
      modified.push({
        particulars: getDisplayNameFromKey("sedc"),
        narration: item.paytm_tid,
        debit: "",
        credit: item.sedc,
        ranking: 4,
      });
    }

    if (item.ppbl) {
      modified.push({
        particulars: getDisplayNameFromKey("ppbl"),
        narration: item.paytm_tid,
        debit: "",
        credit: item.ppbl,
        ranking: 5,
      });
    }
  });

  const calculated = modified.reduce(
    (acc, item) => {
      if (item.debit) {
        acc.debit += item.debit;
        acc.total += item.debit;
      }
      if (item.credit) {
        acc.credit += item.credit;
        acc.total -= item.credit;
      }
      return acc;
    },
    { debit: 0, credit: 0, total: 0 }
  );

  modified.push({
    particulars: "",
    debit: calculated.debit,
    credit: calculated.credit,
    rank: 6,
  });

  modified.sort((a, b) => a.ranking - b.ranking);
  return modified;
}
