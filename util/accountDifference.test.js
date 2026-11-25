/**
 * Account Sheet - Total Difference.
 *
 *   node --test util/accountDifference.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  toPaise,
  getTotalCashHandover,
  getAccountDifference,
  getAccountDifferencePaise,
  getDifferenceStatus,
} = require("./accountDifference");

const PAYMENT = 1;
const RECEIPT = 2;

// 226 x 500 + 200 + 2 x 100 + 50 + 20 + 10 + 5 = 1,13,485
const SCREENSHOT_NOTES = {
  cash_handover_500: "226",
  cash_handover_200: "1",
  cash_handover_100: "2",
  cash_handover_50: "1",
  cash_handover_20: "1",
  cash_handover_10: "1",
  cash_handover_5: "1",
  cash_handover_2: 0,
  cash_handover_1: 0,
};

// The sheet in the bug report, as the form holds it: inputs give strings.
const screenshotForm = () => ({
  no_of_bills: "618",
  total_sales: "316801.98",
  card_sales: "196057.10",
  loyalty: "701.00",
  sales_return: "388.75",
  ...SCREENSHOT_NOTES,
  accounts: [
    { person_type: "1", payment_type: "1", person_id: "9", description: "162", amount: "1764" },
    { person_type: "1", payment_type: "1", person_id: "9", description: "161", amount: "4666" },
  ],
});

test("the screenshot sheet is -259.87, not -260.85", () => {
  const values = screenshotForm();
  assert.equal(getTotalCashHandover(values), 113485);
  assert.equal(getAccountDifference(values), -259.87);
  assert.equal(getDifferenceStatus(getAccountDifference(values)), "EXCESS");
});

test("the old formula truncated Total Sales - the 0.98 is what went missing", () => {
  const values = screenshotForm();
  const oldResult =
    parseInt(values.total_sales) -
    (113485 + 196057.1 + 701 + 388.75 + 1764 + 4666);
  assert.equal(Math.round(oldResult * 100) / 100, -260.85);
  assert.equal(
    Math.round((getAccountDifference(values) - oldResult) * 100) / 100,
    0.98
  );
});

test("paise are kept on every amount", () => {
  assert.equal(getAccountDifference({ total_sales: "0.98" }), 0.98);
  assert.equal(getAccountDifference({ total_sales: "100.98", card_sales: "100" }), 0.98);
  assert.equal(getAccountDifference({ total_sales: 100, card_sales: "0.98" }), 99.02);
  assert.equal(getAccountDifference({ total_sales: 100, loyalty: "0.01" }), 99.99);
  assert.equal(getAccountDifference({ total_sales: 100, sales_return: "99.99" }), 0.01);
  assert.equal(
    getAccountDifference({
      total_sales: 0,
      accounts: [{ payment_type: RECEIPT, amount: "0.98" }],
    }),
    0.98
  );
});

test("no floating-point drift: 0.1 + 0.2 style sums land on the paisa", () => {
  const values = {
    total_sales: "0.30",
    card_sales: "0.10",
    loyalty: "0.20",
  };
  assert.equal(getAccountDifferencePaise(values), 0);
  assert.equal(getAccountDifference(values), 0);
  assert.ok(!Object.is(getAccountDifference(values), -0), "never -0");
});

test("adding a payment or receipt row moves the difference immediately", () => {
  const values = screenshotForm();
  values.accounts.push({ payment_type: PAYMENT, amount: "100.50" });
  assert.equal(getAccountDifference(values), -360.37);

  const receipt = screenshotForm();
  receipt.accounts.push({ payment_type: RECEIPT, amount: "100.50" });
  assert.equal(getAccountDifference(receipt), -159.37);
});

test("a freshly added empty row changes nothing", () => {
  const values = screenshotForm();
  values.accounts.push({ person_type: 0, payment_type: 0, person_id: 0, description: "", amount: 0, receipt: "" });
  assert.equal(getAccountDifference(values), -259.87);
  values.accounts[2].amount = "";
  assert.equal(getAccountDifference(values), -259.87);
});

test("editing a row's amount", () => {
  const values = screenshotForm();
  values.accounts[1].amount = "4406.13";
  assert.equal(getAccountDifference(values), 0);
  values.accounts[1].amount = "4400";
  assert.equal(getAccountDifference(values), 6.13);
});

test("deleting a row", () => {
  const values = screenshotForm();
  values.accounts.splice(0, 1);
  assert.equal(getAccountDifference(values), 1504.13);
  values.accounts.splice(0, 1);
  assert.equal(getAccountDifference(values), 6170.13);
});

test("switching Payment to Receipt and back", () => {
  const values = screenshotForm();
  values.accounts[0].payment_type = "2";
  // 1764 moves from +accounted to -accounted: 2 x 1764 = 3528 swing.
  assert.equal(getAccountDifference(values), 3268.13);
  values.accounts[0].payment_type = "1";
  assert.equal(getAccountDifference(values), -259.87);
});

test("changing Cash Handover notes", () => {
  const values = screenshotForm();
  values.cash_handover_1 = "1";
  assert.equal(getAccountDifference(values), -260.87);
  values.cash_handover_500 = "225";
  assert.equal(getAccountDifference(values), 239.13);
  values.cash_handover_500 = "";
  assert.equal(getTotalCashHandover(values), 486);
});

test("a half-filled form is a number, never NaN", () => {
  const blank = {
    total_sales: null,
    card_sales: null,
    loyalty: null,
    sales_return: null,
    cash_handover_500: "",
    accounts: [{ payment_type: 0, amount: 0 }],
  };
  assert.equal(getAccountDifference(blank), 0);
  assert.equal(getAccountDifference({ ...blank, total_sales: "1500.50" }), 1500.5);
  assert.equal(getAccountDifference({ total_sales: "abc" }), 0);
  assert.equal(getAccountDifference(undefined), 0);
  assert.equal(getTotalCashHandover({}), 0);
});

test("loading a saved sheet: MySQL DECIMAL strings and `sales` rows", () => {
  // GET /accounts/:id returns DECIMAL(10,2) columns as strings and the rows
  // under `sales` (the form copies them to `accounts`).
  const saved = {
    total_sales: "316801.98",
    card_sales: "196057.10",
    loyalty: "701.00",
    sales_return: "388.75",
    cash_handover_500: 226,
    cash_handover_200: 1,
    cash_handover_100: 2,
    cash_handover_50: 1,
    cash_handover_20: 1,
    cash_handover_10: 1,
    cash_handover_5: 1,
    cash_handover_2: 0,
    cash_handover_1: 0,
    sales: [
      { payment_type: 1, amount: "1764.00" },
      { payment_type: 1, amount: "4666.00" },
    ],
  };
  assert.equal(getAccountDifference(saved), -259.87);
  assert.equal(getAccountDifference({ ...saved, accounts: saved.sales }), -259.87);
});

test("save and reopen gives the same difference", () => {
  const form = screenshotForm();
  const before = getAccountDifference(form);

  // What the form posts: rows go out as `sales`, numbers as typed.
  const posted = { ...form, sales: form.accounts };
  delete posted.accounts;

  // What MySQL hands back: DECIMAL(10,2) as 2dp strings, INT counts.
  const dec = (v) => Number(v).toFixed(2);
  const reopened = {
    ...posted,
    total_sales: dec(posted.total_sales),
    card_sales: dec(posted.card_sales),
    loyalty: dec(posted.loyalty),
    sales_return: dec(posted.sales_return),
    sales: posted.sales.map((r) => ({ ...r, payment_type: Number(r.payment_type), amount: dec(r.amount) })),
  };
  reopened.accounts = reopened.sales;

  assert.equal(getAccountDifference(reopened), before);
});

test("zero, positive and negative differences", () => {
  const balanced = screenshotForm();
  balanced.cash_handover_1 = "0";
  balanced.total_sales = "317061.85";
  assert.equal(getAccountDifference(balanced), 0);
  assert.equal(getDifferenceStatus(0), "BALANCED");

  const short = { ...balanced, total_sales: "317062.85" };
  assert.equal(getAccountDifference(short), 1);
  assert.equal(getDifferenceStatus(1), "SHORT");

  const excess = { ...balanced, total_sales: "317060.85" };
  assert.equal(getAccountDifference(excess), -1);
  assert.equal(getDifferenceStatus(-1), "EXCESS");
});

test("toPaise rounds to the nearest paisa", () => {
  assert.equal(toPaise("316801.98"), 31680198);
  assert.equal(toPaise(1.005), 101); // 1.005 * 100 = 100.49999999999999 -> round
  assert.equal(toPaise(-0.5), -50);
  assert.equal(toPaise("-0.005"), -1);
  assert.equal(toPaise("9000000000.99"), 900000000099);
  assert.equal(toPaise(""), 0);
  assert.equal(toPaise(null), 0);
});

test("the form shows the live difference with its sign and Short/Excess", () => {
  const form = fs.readFileSync(
    path.join(__dirname, "../components/accounts/NormalOutletForm/AccountForm.jsx"),
    "utf8"
  );
  // Computed from Formik `values` in render - not from saved data.
  assert.match(form, /const differenceAmount = getAmmountDifference\(values\);/);
  assert.match(form, /getDifferenceStatus\(differenceAmount\)/);
  assert.match(form, /"Short" : "Excess"/);

  const account = fs.readFileSync(path.join(__dirname, "account.js"), "utf8");
  assert.ok(!/parseInt\(total_sales\)/.test(account), "Total Sales must not be truncated");
});
