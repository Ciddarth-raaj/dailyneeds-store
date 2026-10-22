/**
 * Article Store Master page: where it is, who sees it, what it calls.
 *
 *   node --test util/articleStoreMaster.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("in the Master menu beside All Products, behind the same key", () => {
  const menus = read("constants/menus.js");
  assert.match(menus, /view_article_store_master: \{\s*title: "Article Store Master",\s*permission: "view_products",\s*selected: false,\s*location: "\/products\/article-store-master",/);
  assert.match(read("pages/products/article-store-master.jsx"), /const PERMISSION_KEY = \["view_products"\];[\s\S]*permissionKey=\{PERMISSION_KEY\}/);
});

test("the page downloads the morning file and can rebuild it", () => {
  const page = read("pages/products/article-store-master.jsx");
  assert.match(page, />\s*Download Excel\s*</);
  assert.match(page, />\s*Refresh now\s*</);
  assert.match(page, /if \(s\?\.running\) \{\s*watch\(\);/, "a running build is followed until it ends");
  const helper = read("helper/articleStoreMaster.js");
  assert.match(helper, /API\.get\("\/article-store-master\/status"\)/);
  assert.match(helper, /API\.post\("\/article-store-master\/refresh"\)/);
  assert.match(helper, /url: "\/article-store-master\/download",\s*responseType: "blob",\s*transformResponse: \[\(data\) => data\],/);
  assert.match(helper, /String\(blob\.type\)\.includes\("json"\)/, "a refusal is shown, not saved as a broken .xlsx");
});
