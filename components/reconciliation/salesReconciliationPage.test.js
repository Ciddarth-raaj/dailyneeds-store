/**
 * Accounts → Reconciliation → Sales, mounted for real (jsdom + react-dom) with
 * only the network and the app chrome stubbed: a Retail Pilot CSV is dropped
 * on the actual upload, parsed by the actual Papa.parse, compared with the
 * DnDS figures `GET /accounts/sales-by-outlet` returns, and saved through the
 * actual `saveReconciliation` - so the payload asserted here is the payload
 * `POST /reconciliation/sales` receives.
 *
 * Skipped on a bare checkout (no node_modules); see test_support/renderJsx.js.
 *
 *   node --test components/reconciliation/salesReconciliationPage.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { mount, unavailable, root } = require("../../test_support/renderJsx");

const skip = unavailable ? `render unavailable: ${unavailable}` : false;
const BACKEND = path.join(root, "..", "dailyneeds-store-backend");
const FIXTURES = path.join(root, "util", "__fixtures__", "retail-pilot");
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// DnDS figures for 2026-10-12, keyed the way the outlet master spells them.
const DNDS_12 = [
  { store_id: 7, outlet_name: "Daily Needs-ECR", total_sales: 343850, loyalty: 235, sales_return: 0 },
  { store_id: 3, outlet_name: "Daily Needs-Kathirkamam", total_sales: 362000, loyalty: 4405, sales_return: 2323.2 },
  { store_id: 5, outlet_name: "Daily Needs-Moolakulam", total_sales: 689960.47, loyalty: 3300, sales_return: 2412.2 },
  { store_id: 6, outlet_name: "Daily Needs-Muthialpet", total_sales: 315739.16, loyalty: 2015, sales_return: 100 },
  { store_id: 4, outlet_name: "Daily Needs-Vallalar Salai", total_sales: 285758.68, loyalty: 838, sales_return: 712 },
].map(({ store_id, outlet_name, ...figures }) => ({
  store_id,
  outlet_name,
  accounts: [{ ...figures, card_sales: 0, sales: [] }],
}));

const api = { gets: [], posts: [], salesByOutlet: () => ({ code: 200, data: DNDS_12 }) };

function stubModules() {
  const stub = (rel, exports) => {
    const filename = path.join(root, rel);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
  };
  stub("components/globalWrapper/globalWrapper.js", {
    __esModule: true,
    default: ({ children }) => children,
  });
  stub("util/api.js", {
    __esModule: true,
    default: {
      get: async (url) => {
        api.gets.push(url);
        if (url.startsWith("/accounts/sales-by-outlet")) {
          const data = api.salesByOutlet(url);
          if (data instanceof Error) throw data;
          return { data };
        }
        return { data: { code: 200, data: [] } };
      },
      post: async (url, body) => {
        api.posts.push({ url, body });
        return { data: { code: 200 } };
      },
    },
  });
}

let page = null;
async function openPage() {
  stubModules();
  page = mount("pages/reconciliation/sales.jsx", {});
  // jsdom exists from mount on; Papa.parse reads a File through these.
  const { act } = require("react-dom/test-utils");
  global.File = window.File;
  global.FileReader = window.FileReader;
  global.Blob = window.Blob;
  await settle(act);
  return act;
}

async function settle(act) {
  for (let i = 0; i < 5; i += 1) {
    // Papa reads the File through FileReader and the API stub resolves on a
    // later tick; give both room before reading the DOM.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

async function upload(act, name, text) {
  const input = page.one('input[type="file"]');
  const file = new window.File([text], name, { type: "text/csv" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await settle(act);
}

const saveButton = () => page.all("button").find((b) => b.textContent.trim() === "Save");
const radio = (label) =>
  page.all("label").find((l) => l.textContent.trim() === label).querySelector("input");
const fixtureText = (name) => fs.readFileSync(path.join(FIXTURES, name), "utf8");

test.afterEach(() => {
  if (page) page.unmount();
  page = null;
  api.gets = [];
  api.posts = [];
  api.salesByOutlet = () => ({ code: 200, data: DNDS_12 });
});

test("Retail Pilot is selected by default with a single CSV upload", { skip }, async () => {
  await openPage();
  const text = page.text().join(" ");
  assert.match(text, /POS format/);
  assert.strictEqual(radio("Retail Pilot").checked, true);
  assert.strictEqual(radio("Gofrugal (Legacy)").checked, false);
  assert.strictEqual(page.all('input[type="file"]').length, 1);
  assert.match(text, /Upload Retail Pilot Sales CSV/);
  assert.doesNotMatch(text, /Loyalty and Total Sales/);
  assert.strictEqual(saveButton().disabled, true);
});

test("a sample file reconciles against DnDS for its own date and saves the old payload", { skip }, async () => {
  const act = await openPage();
  await upload(act, "dailyneeds_2026-10-12.csv", fixtureText("dailyneeds_2026-10-12.csv"));

  const text = page.text();
  const joined = text.join(" | ");
  assert.ok(text.includes("dailyneeds_2026-10-12.csv"), "uploaded filename is shown");
  assert.match(joined, /Reporting date: \| 12-10-2026/);
  // DnDS was asked for the file's date, not today.
  assert.ok(api.gets.some((url) => /from_date=2026-10-12&to_date=2026-10-12/.test(url)), api.gets.join("\n"));
  ["Bill Date", "Outlet Name", "DnDS Total Sales", "DnDS Loyalty", "Retail Pilot Sales Return"].forEach((h) =>
    assert.ok(text.includes(h), `heading ${h}`)
  );
  assert.ok(text.includes("(Daily Needs-Vallalar Salai)"), "matched DnDS outlet is shown");
  assert.doesNotMatch(joined, /not matched/);
  assert.strictEqual(saveButton().disabled, false);

  await act(async () => {
    saveButton().dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await settle(act);

  assert.strictEqual(api.posts.length, 5);
  assert.ok(api.posts.every((p) => p.url === "/reconciliation/sales"));
  const byStore = Object.fromEntries(api.posts.map((p) => [p.body.store_id, p.body]));
  // Exactly the fields, types and date format the Gofrugal flow sent.
  assert.deepStrictEqual(Object.keys(byStore[7]).sort(), [
    "bill_date", "loyalty_diff", "return_diff", "sales_diff", "store_id",
  ]);
  // ECR: 343854.82 - 343850 = 4.82, inside ±₹5 → 0; return 0.0 vs 0 → 0.
  assert.deepStrictEqual(byStore[7], {
    store_id: 7, sales_diff: 0, loyalty_diff: 0, return_diff: 0, bill_date: "2026-10-12 00:00:00",
  });
  // Kathirkamam: 362342.45 - 362000 = 342.45.
  assert.deepStrictEqual(byStore[3], {
    store_id: 3, sales_diff: 342.45, loyalty_diff: 0, return_diff: 0, bill_date: "2026-10-12 00:00:00",
  });
  // Moolakulam: loyalty 3204 - 3300 = -96.
  assert.strictEqual(byStore[5].loyalty_diff, -96);
  // Muthialpet: return 188 - 100 = 88.
  assert.strictEqual(byStore[6].return_diff, 88);
});

test("a failed DnDS fetch blocks Save and says why", { skip }, async () => {
  const act = await openPage();
  api.salesByOutlet = () => new Error("Network Error");
  await upload(act, "dailyneeds_2026-10-11.csv", fixtureText("dailyneeds_2026-10-11.csv"));
  assert.match(page.text().join(" "), /DnDS sales could not be loaded: Network Error/);
  assert.strictEqual(saveButton().disabled, true);
  assert.strictEqual(api.posts.length, 0);
});

test("an unknown outlet is named and blocks the whole save", { skip }, async () => {
  const act = await openPage();
  const csv = fixtureText("dailyneeds_2026-10-12.csv").replace("muthialpet", "lawspet");
  await upload(act, "dailyneeds_2026-10-12.csv", csv);
  const text = page.text().join(" ");
  assert.match(text, /lawspet \(not matched\)/);
  assert.match(text, /No DnDS outlet with sales on this date matches: lawspet\./);
  assert.match(text, /DnDS has sales on this date for outlet\(s\) not in the file: Daily Needs-Muthialpet/);
  assert.strictEqual(saveButton().disabled, true);
});

test("a multi-date file is refused and the previous day's results are cleared", { skip }, async () => {
  const act = await openPage();
  await upload(act, "dailyneeds_2026-10-12.csv", fixtureText("dailyneeds_2026-10-12.csv"));
  assert.ok(page.text().includes("(Daily Needs-ECR)"));

  const mixed = fixtureText("dailyneeds_2026-10-12.csv") + "2026-10-11,ecr,1,0,1\n";
  await upload(act, "mixed.csv", mixed);
  const text = page.text().join(" ");
  assert.match(text, /The file was not imported/);
  assert.match(text, /2 reporting dates \(2026-10-11, 2026-10-12\)/);
  assert.doesNotMatch(text, /Daily Needs-ECR/);
  assert.match(text, /Import data to continue/);
  assert.strictEqual(saveButton().disabled, true);
});

test("switching to Gofrugal restores both legacy uploads and clears the import", { skip }, async () => {
  const act = await openPage();
  await upload(act, "dailyneeds_2026-10-12.csv", fixtureText("dailyneeds_2026-10-12.csv"));
  page.click(radio("Gofrugal (Legacy)"));
  await settle(act);

  let text = page.text().join(" ");
  assert.strictEqual(page.all('input[type="file"]').length, 2);
  assert.match(text, /Loyalty and Total Sales/);
  assert.match(text, /Sales Return file here/);
  assert.doesNotMatch(text, /Upload Retail Pilot Sales CSV/);
  assert.doesNotMatch(text, /dailyneeds_2026-10-12\.csv/);
  assert.match(text, /Import data to continue/);
  // Legacy uploads still take the Gofrugal ZIP exports.
  page.all('input[type="file"]').forEach((input) => assert.match(input.getAttribute("accept"), /application\/zip/));

  page.click(radio("Retail Pilot"));
  await settle(act);
  text = page.text().join(" ");
  assert.strictEqual(page.all('input[type="file"]').length, 1);
  assert.doesNotMatch(text, /dailyneeds_2026-10-12\.csv/);
  assert.match(text, /Import data to continue/);
});

test("the Gofrugal path keeps its parsing: same headers, ZIP reader, verbatim outlet keys", () => {
  const src = codeOf(fs.readFileSync(path.join(root, "pages/reconciliation/sales.jsx"), "utf8"));
  assert.match(src, /const REQUIRED_LOYALTY_HEADERS = \[\s*"Bill Date",\s*"Outlet Name",\s*"Loyalty",\s*"Cash Sales",\s*\]/);
  assert.match(src, /const REQUIRED_SALES_RETURN_HEADERS = \[\s*"Outlet Name",\s*"Tran Date",\s*"Sales Return Amt",\s*\]/);
  assert.match(src, /readZipFile\(file, setParsedData, REQUIRED_LOYALTY_HEADERS\)/);
  assert.match(src, /await importFileToJSON\(file, validateHeaders\)/);
  // Gofrugal outlet names are looked up in the DnDS summary as they are.
  assert.match(src, /: item\["Outlet Name"\];/);
});

test("the save payload is exactly what POST /reconciliation/sales validates", { skip: !fs.existsSync(BACKEND) && "backend not checked out" }, () => {
  const route = fs.readFileSync(path.join(BACKEND, "routes/reconciliation.js"), "utf8");
  const sales = route.slice(route.indexOf('router.post("/sales"'), route.indexOf('router.post("/epayment"'));
  ["bill_date: Joi.date().required()", "store_id: Joi.number().required()", "loyalty_diff: Joi.number().required()",
    "sales_diff: Joi.number().required()", "return_diff: Joi.number().required()"].forEach((rule) =>
    assert.ok(sales.includes(rule), rule)
  );
  const repo = fs.readFileSync(path.join(BACKEND, "repository/reconciliation.js"), "utf8");
  assert.match(repo, /INSERT INTO accounts_reconciliation_sales[\s\S]*ON DUPLICATE KEY UPDATE/);
});

test("the Difference page still reads the saved rows unchanged", () => {
  const diff = codeOf(fs.readFileSync(path.join(root, "pages/reconciliation/difference.jsx"), "utf8"));
  assert.match(diff, /useSalesReconciliation\(filters\)/);
  assert.match(diff, /item\.return_diff != 0 \|\|\s*item\.sales_diff != 0 \|\|\s*item\.loyalty_diff != 0/);
  const helper = codeOf(fs.readFileSync(path.join(root, "helper/reconciliation.js"), "utf8"));
  assert.match(helper, /const url = `\/reconciliation\/sales\$\{/);
});

test("a legacy Gofrugal ZIP pair still imports and saves as before", { skip }, async () => {
  const JSZip = require("jszip");
  const zipOf = async (name, csv) => {
    const zip = new JSZip();
    zip.file(name, csv);
    return zip.generateAsync({ type: "uint8array" });
  };
  const act = await openPage();
  page.click(radio("Gofrugal (Legacy)"));
  await settle(act);

  const drop = async (input, name, bytes) => {
    const file = new window.File([bytes], name, { type: "application/zip" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await act(async () => {
      input.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    await settle(act);
  };
  const [loyaltyInput] = page.all('input[type="file"]');
  await drop(
    loyaltyInput,
    "loyalty.zip",
    await zipOf(
      "loyalty.csv",
      "Loyalty Report\nDaily Needs\nBill Date,Outlet Name,Bill Amt,Loyalty,Cash Sales\n2026-10-12,Daily Needs-Kathirkamam,362342.45,4405,0\n"
    )
  );
  const [, returnInput] = page.all('input[type="file"]');
  await drop(
    returnInput,
    "return.zip",
    await zipOf(
      "return.csv",
      "Sales Return Report\nDaily Needs\nOutlet Name,Tran Date,Sales Return Amt\nDaily Needs-Kathirkamam,2026-10-12,2423.2\n"
    )
  );

  assert.ok(api.gets.some((url) => /from_date=2026-10-12/.test(url)), api.gets.join("\n"));
  const text = page.text();
  ["Total Sales", "Loyalty", "Sales Return"].forEach((h) => assert.ok(text.includes(h), h));
  assert.ok(!text.includes("DnDS Total Sales"));

  await act(async () => {
    saveButton().dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await settle(act);
  assert.deepStrictEqual(api.posts.map((p) => p.body), [
    { store_id: 3, sales_diff: 342.45, loyalty_diff: 0, return_diff: 100, bill_date: "2026-10-12 00:00:00" },
  ]);
});
