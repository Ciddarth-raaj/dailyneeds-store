/**
 * THE LEGACY RESIGNATION SCREENS ARE READ-ONLY.
 *
 *   node --test components/hr/legacyResignation.test.js
 *
 * Employee Master -> Resign / Rejoin is the official workflow. HR no longer
 * sees a way to create, edit or delete a legacy resignation, and nothing in
 * the browser calls the retired endpoints. (The server refuses them too -
 * backend routes/legacy_lifecycle_bypass.test.js.)
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const RETIRED = ["/resignation/create", "/resignation/update-resignation", "/resignation/resignation_id", "/employee/update-status"];

test("no browser code calls a retired legacy write endpoint", () => {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
      if (["node_modules", ".next"].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|jsx)$/.test(e.name) && !/\.test\.js$/.test(e.name)) files.push(p);
    }
  };
  ["pages", "components", "helper", "util", "customHooks", "constants"].forEach(walk);
  for (const f of files) {
    const src = code(read(f));
    for (const url of RETIRED) assert.ok(!src.includes(url), `${f} calls ${url}`);
  }
});

test("the helpers keep only the reads", () => {
  const helper = code(read("helper/resignation.js"));
  for (const gone of ["createResignation", "updateResignation", "deleteResignation"]) assert.ok(!helper.includes(gone), gone);
  for (const kept of ["getResignation", "getResignationById", "getResignationByName"]) assert.ok(helper.includes(kept), kept);
  assert.ok(!code(read("helper/employee.js")).includes("updateStatus"), "EmployeeHelper.updateStatus is gone");
});

test("the list offers no Add or Remove, keeps view and export, and says where exits are recorded", () => {
  const page = code(read("pages/resignation/index.js"));
  assert.ok(!page.includes("/resignation/create"));
  assert.ok(!/Remove|deleteResignation/.test(page));
  assert.match(page, /Export/);
  assert.match(page, /Resign[\s\S]*Rejoin[\s\S]*Employee Master/);
});

test("a record page is a view: no form, no Create / Update", () => {
  const page = code(read("pages/resignation/[id].js"));
  for (const gone of ["Formik", "onSubmit", "createResignation", "updateResignation", '"Create"', '"Update"']) {
    assert.ok(!page.includes(gone), gone);
  }
  assert.match(page, /read-only/);
});
