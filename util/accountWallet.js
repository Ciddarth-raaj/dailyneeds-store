/**
 * Account Sheet - Wallet Transactions (wallet_receipt / wallet_payment).
 *
 * Two optional amounts per sheet: money received into and paid out of the
 * store's digital wallet. They are recorded and shown only; they take no
 * part in Total Sales, Cash Sales, Cash Handover or the Total Difference.
 * The backend applies the same rules in utils/account_wallet.js.
 *
 *   Net Wallet Movement = Wallet Receipt - Wallet Payment
 */
const { toPaise } = require("./accountDifference");

// DECIMAL(12,2)
const WALLET_MAX = 9999999999.99;

/** Blank is fine (it means 0); otherwise >= 0, <= max, at most 2 decimals. */
function isValidWalletAmount(value) {
  if (value === undefined || value === null || value === "") return true;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > WALLET_MAX) return false;
  return toPaise(n) === Math.round(n * 1e6) / 1e4;
}

/** Net Wallet Movement in rupees, exact to the paisa. */
function getNetWalletMovement(values) {
  if (!values) return 0;
  return (toPaise(values.wallet_receipt) - toPaise(values.wallet_payment)) / 100 + 0;
}

/** Wallet totals of several sheets, kept apart from sales and cash totals. */
function getWalletTotals(sheets) {
  let receipt = 0;
  let payment = 0;
  (sheets || []).forEach((sheet) => {
    receipt += toPaise(sheet && sheet.wallet_receipt);
    payment += toPaise(sheet && sheet.wallet_payment);
  });
  return {
    wallet_receipt: receipt / 100 + 0,
    wallet_payment: payment / 100 + 0,
    net_wallet: (receipt - payment) / 100 + 0,
  };
}

module.exports = {
  WALLET_MAX,
  isValidWalletAmount,
  getNetWalletMovement,
  getWalletTotals,
};
