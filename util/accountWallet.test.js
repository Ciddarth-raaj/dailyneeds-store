/**
 * Account Sheet - Wallet Transactions.
 *
 *   node --test util/accountWallet.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  isValidWalletAmount,
  getNetWalletMovement,
  getWalletTotals,
} = require("./accountWallet");
const { getAccountDifference, getTotalCashHandover } = require("./accountDifference");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

// The 11/10/2026 sheet as the form holds it.
const form = (extra = {}) => ({
  total_sales: "316801.98",
  card_sales: "196057.10",
  loyalty: "701.00",
  sales_return: "388.75",
  cash_handover_500: "226",
  cash_handover_200: "1",
  cash_handover_100: "2",
  cash_handover_50: "1",
  cash_handover_20: "1",
  cash_handover_10: "1",
  cash_handover_5: "1",
  wallet_receipt: "0.00",
  wallet_payment: "0.00",
  accounts: [
    { payment_type: "1", amount: "1764" },
    { payment_type: "1", amount: "4666" },
  ],
  ...extra,
});

test("1. no wallet entries: net is 0.00", () => {
  assert.equal(getNetWalletMovement(form()), 0);
  assert.equal(getNetWalletMovement({ wallet_receipt: "", wallet_payment: "" }), 0);
});

test("2-4. receipt only, payment only, both", () => {
  assert.equal(getNetWalletMovement(form({ wallet_receipt: "1500.50" })), 1500.5);
  assert.equal(getNetWalletMovement(form({ wallet_payment: "250.25" })), -250.25);
  assert.equal(
    getNetWalletMovement(form({ wallet_receipt: "1000.10", wallet_payment: "400.20" })),
    599.9
  );
});

test("5. editing a wallet amount updates the net", () => {
  const values = form({ wallet_receipt: "100.00", wallet_payment: "40.00" });
  assert.equal(getNetWalletMovement(values), 60);
  values.wallet_payment = "40.01";
  assert.equal(getNetWalletMovement(values), 59.99);
  values.wallet_receipt = "";
  assert.equal(getNetWalletMovement(values), -40.01);
});

test("6. an old sheet without wallet values reads 0", () => {
  const old = { total_sales: "100.00", card_sales: "100.00" };
  assert.equal(getNetWalletMovement(old), 0);
  assert.deepEqual(getWalletTotals([old]), { wallet_receipt: 0, wallet_payment: 0, net_wallet: 0 });

  const loader = read("components/accounts/NormalOutletForm/index.jsx");
  assert.match(loader, /data\.wallet_receipt = data\.wallet_receipt \?\? "0\.00"/);
  assert.match(loader, /data\.wallet_payment = data\.wallet_payment \?\? "0\.00"/);
  assert.match(loader, /wallet_receipt: "0\.00",\s*wallet_payment: "0\.00",/);
});

test("7. payment above receipt is a negative net", () => {
  assert.equal(getNetWalletMovement(form({ wallet_receipt: "100.00", wallet_payment: "350.75" })), -250.75);
});

test("8. save and reload keeps the amounts; totals sum per sheet", () => {
  // What the form posts (`...values`) and what MySQL DECIMAL(12,2) returns.
  const posted = { ...form({ wallet_receipt: "1234.5", wallet_payment: "0.1" }) };
  const reloaded = {
    ...posted,
    wallet_receipt: Number(posted.wallet_receipt).toFixed(2),
    wallet_payment: Number(posted.wallet_payment).toFixed(2),
  };
  assert.equal(getNetWalletMovement(reloaded), getNetWalletMovement(posted));
  assert.equal(getNetWalletMovement(reloaded), 1234.4);

  assert.deepEqual(
    getWalletTotals([
      { wallet_receipt: "0.10", wallet_payment: "0.00" },
      { wallet_receipt: "0.20", wallet_payment: "1.00" },
      { wallet_receipt: null, wallet_payment: undefined },
    ]),
    { wallet_receipt: 0.3, wallet_payment: 1, net_wallet: -0.7 }
  );
});

test("9. wallet amounts change no cash figure or the Total Difference", () => {
  const plain = form();
  const withWallet = form({ wallet_receipt: "5000.00", wallet_payment: "12000.00" });
  assert.equal(getAccountDifference(plain), -259.87);
  assert.equal(getAccountDifference(withWallet), -259.87);
  assert.equal(getTotalCashHandover(withWallet), getTotalCashHandover(plain));

  const difference = read("util/accountDifference.js");
  assert.ok(!/wallet/.test(difference.replace(/\/\*[\s\S]*?\*\//g, "")), "the difference rule never reads wallet fields");
});

test("10. no Receipt/Payment row is created for wallet amounts", () => {
  const values = form({ wallet_receipt: "500.00", wallet_payment: "200.00" });
  assert.equal(values.accounts.length, 2);
  const formSrc = read("components/accounts/NormalOutletForm/index.jsx");
  // The posted rows are exactly the form's own Receipt/Payment rows.
  assert.match(formSrc, /for \(const item of values\.accounts\)/);
  assert.ok(!/wallet[\s\S]{0,80}sales\.push|sales\.push\([^)]*wallet/.test(formSrc));
});

test("valid amounts: optional, non-negative, at most two decimals", () => {
  for (const ok of [undefined, null, "", "0", "0.00", 0, "12.5", "12.34", 9999999999.99]) {
    assert.equal(isValidWalletAmount(ok), true, String(ok));
  }
  for (const bad of ["-1", -0.01, "12.345", "abc", "10000000000", NaN]) {
    assert.equal(isValidWalletAmount(bad), false, String(bad));
  }
});

test("the form, list and export show wallet amounts on their own", () => {
  const accountForm = read("components/accounts/NormalOutletForm/AccountForm.jsx");
  assert.match(accountForm, /Wallet Transactions/);
  assert.match(accountForm, /name="wallet_receipt"/);
  assert.match(accountForm, /name="wallet_payment"/);
  assert.match(accountForm, /Net Wallet Movement/);
  // The section sits after Cash Handover and before the Receipt/Payment rows.
  const handover = accountForm.indexOf("Cash Handover</label>");
  const wallet = accountForm.indexOf("Wallet Transactions");
  const rows = accountForm.indexOf('name="accounts"');
  assert.ok(handover < wallet && wallet < rows);

  const validation = read("validations/accounts.js");
  assert.match(validation, /wallet_receipt: walletAmount\(\)/);
  assert.match(validation, /wallet_payment: walletAmount\(\)/);

  const view = read("components/accounts/NormalOutletView.jsx");
  assert.match(view, /wallet_receipt: "Wallet Receipt"/);
  assert.match(view, /net_wallet: "Net Wallet"/);
  assert.match(view, /\["Journal", "Cash", "Bank", "Wallet"\]/);
});
