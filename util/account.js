import { WAREHHOUSE_ID } from "../constants";
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

export function getCashBook(accounts, outletData) {
  const totals = getTotals(accounts, true);
  const rows = [];

  rows.push({
    particulars: "Opening Cash",
    narration: "",
    debit: outletData?.opening_cash || 0,
    credit: "",
    rank: 0,
  });

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
    // difference += getAmmountDifference(item);
    totalCashHandover += getTotalCashHandover(item, true);

    const individualDifference = getAmmountDifference(item);

    if (individualDifference < 0) {
      difference += Math.abs(individualDifference);
    } else if (individualDifference > 0) {
      rows.push({
        particulars: item.cashier_name,
        narration: "",
        debit: "",
        credit: individualDifference,
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
    isRed: calculated.debit !== calculated.credit + calculated.total,
    isNotEqual: calculated.debit !== calculated.credit + calculated.total,
  });

  return rows.map((item) => {
    if (item.isRed) {
      return {
        ...item,
        debit:
          item.debit || item.debit === 0 ? (
            <span style={{ color: "red", fontWeight: "600" }}>
              {currencyFormatter(item.debit)}
            </span>
          ) : (
            ""
          ),
        credit:
          item.credit || item.debit === 0 ? (
            <span style={{ color: "red", fontWeight: "600" }}>
              {currencyFormatter(item.credit)}
            </span>
          ) : (
            ""
          ),
      };
    }
    return {
      ...item,
      debit:
        item.debit || item.debit === 0 ? currencyFormatter(item.debit) : "",
      credit:
        item.credit || item.debit === 0 ? currencyFormatter(item.credit) : "",
    };
  });
}

function getDisplayNameFromKey(key) {
  if (key === "hdur") return "HDFC UPI";
  if (key === "hfpp") return "Card";
  if (key === "sedc") return "Sodexo";
  if (key === "ppbl") return "Paytm";
  return key;
}

export function getEbook(accounts, totals) {
  let modified = [
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

  modified = modified.map((item) => ({
    ...item,
    debit: item.debit || item.debit === 0 ? currencyFormatter(item.debit) : "",
    credit:
      item.credit || item.credit === 0 ? currencyFormatter(item.credit) : "",
  }));

  if (calculated.debit !== calculated.credit) {
    modified.push({
      particulars: "",
      debit: (
        <span style={{ color: "red", fontWeight: "600" }}>
          {currencyFormatter(calculated.debit)}
        </span>
      ),
      credit: (
        <span style={{ color: "red", fontWeight: "600" }}>
          {currencyFormatter(calculated.credit)}
        </span>
      ),
      rank: 6,
      isNotEqual: true,
    });
  } else {
    modified.push({
      particulars: "",
      debit: currencyFormatter(calculated.debit),
      credit: currencyFormatter(calculated.credit),
      rank: 6,
    });
  }

  modified.sort((a, b) => a.ranking - b.ranking);
  return modified;
}

const boldWrapper = (shouldBold, isRed, value) => {
  if (shouldBold) {
    return <b>{value}</b>;
  }

  if (isRed) {
    return <span style={{ color: "red", fontWeight: "600" }}>{value}</span>;
  }

  return value;
};

const getTotalDenomination = (denomination) => {
  return (
    denomination.cash_handover_500 * 500 +
    denomination.cash_handover_200 * 200 +
    denomination.cash_handover_100 * 100 +
    denomination.cash_handover_50 * 50 +
    denomination.cash_handover_20 * 20 +
    denomination.cash_handover_10 * 10 +
    denomination.cash_handover_5 * 5 +
    denomination.cash_handover_2 * 2 +
    denomination.cash_handover_1 * 1
  );
};

const getGroupedDenominations = (allDenominations) => {
  return allDenominations.reduce((acc, item) => {
    if (item.store_id == WAREHHOUSE_ID) {
      return acc;
    }

    if (!acc[item.outlet_name]) {
      acc[item.outlet_name] = 0;
    }

    acc[item.outlet_name] += getTotalDenomination(item);
    return acc;
  }, {});
};

function getWarehouseDifference(denomination, sales, groupedDenominations) {
  const totalDenomination = getTotalDenomination(denomination);
  const salesTotal = getSalesTotal(sales);
  console.log("CIDD", totalDenomination, salesTotal, groupedDenominations);
}

function getSalesTotal(sales) {
  return sales.reduce((acc, item) => {
    return (
      acc +
      (item.payment_type === 1
        ? parseFloat(item.amount ?? 0)
        : parseFloat(item.amount ?? 0) * -1)
    );
  }, 0);
}

export function getWarehouseCashbook(
  sales,
  denomination,
  allDenominations,
  startingCash,
  presetOpeningCash
) {
  const modified = [];
  const groupedDenominations = getGroupedDenominations(allDenominations);

  modified.push({
    particulars: "Opening Cash",
    narration: "",
    debit: startingCash ?? presetOpeningCash,
    credit: "",
    rank: 1,
  });

  Object.keys(groupedDenominations).forEach((outlet) => {
    modified.push({
      particulars: outlet,
      narration: "",
      debit: groupedDenominations[outlet],
      credit: "",
      rank: 1,
    });
  });

  if (sales?.length > 0) {
    modified.push({
      particulars: <b>Payments / Receipts</b>,
      narration: "",
      debit: "",
      credit: "",
      rank: 1,
    });

    sales.forEach((item) => {
      modified.push({
        particulars: item.person_name,
        narration: item.description,
        debit: item.payment_type === 2 ? item.amount : "",
        credit: item.payment_type === 1 ? item.amount : "",
        rank: 2,
      });
    });
  }

  if (denomination.cash_denomination_id) {
    const totalCashHandover = getTotalCashHandover(denomination, true);

    modified.push({
      particulars: <b>Closing Cash</b>,
      narration: "",
      debit: "",
      credit: totalCashHandover,
      rank: 6,
      shouldBold: true,
    });
  }

  const calculated = modified.reduce(
    (acc, item) => {
      if (item.debit) {
        acc.debit += parseFloat(item.debit);
        acc.total += parseFloat(item.debit);
      }
      if (item.credit) {
        acc.credit += parseFloat(item.credit);
        acc.total -= parseFloat(item.credit);
      }
      return acc;
    },
    { debit: 0, credit: 0, total: 0 }
  );

  modified.push({
    particulars: "Cash Excess / Short",
    debit: calculated.total < 0 ? Math.abs(calculated.total) : "",
    credit: calculated.total > 0 ? Math.abs(calculated.total) : "",
    rank: 7,
    isClosingCash: true,
  });

  if (calculated.total < 0) {
    calculated.debit += Math.abs(calculated.total);
  } else {
    calculated.credit += Math.abs(calculated.total);
  }

  modified.push({
    narration: "Total",
    debit: calculated.debit,
    credit: calculated.credit,
    rank: 8,
    isRed: calculated.debit !== calculated.credit,
    isNotEqual: calculated.debit !== calculated.credit,
  });

  modified.sort((a, b) => a.ranking - b.ranking);

  return modified.map((item) => ({
    ...item,
    particulars: item.particulars,
    debit:
      item.debit || item.debit === 0
        ? boldWrapper(
            item.shouldBold,
            item.isRed,
            currencyFormatter(item.debit)
          )
        : "",
    credit:
      item.credit || item.credit === 0
        ? boldWrapper(
            item.shouldBold,
            item.isRed,
            currencyFormatter(item.credit)
          )
        : "",
  }));
}

export function getWarehouseDenominations(denomination) {
  if (!denomination) {
    return [];
  }

  const modified = [];
  let total = 0;

  const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  denominations.forEach((denom) => {
    const handoverKey = `cash_handover_${denom}`;
    modified.push({
      denomination: denom.toString(),
      count: denomination[handoverKey] || 0,
      total: currencyFormatter(denomination[handoverKey] * denom),
    });

    total += denomination[handoverKey] * denom;
  });

  modified.push({
    denomination: "",
    count: <b>Total</b>,
    total: (
      <b style={{ color: "var(--chakra-colors-purple-500)" }}>
        {currencyFormatter(total)}
      </b>
    ),
  });

  return modified;
}
