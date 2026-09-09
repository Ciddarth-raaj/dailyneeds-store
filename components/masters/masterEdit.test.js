/**
 * Department and Designation master — editing name and status.
 *
 *   node --test components/masters/masterEdit.test.js
 *
 * =================================== WHAT WAS BROKEN, PER SCREEN ==========
 *
 * DEPARTMENT had no Action column at all - the whole block was commented out -
 * so nothing in the UI reached /department/:id. That detail page was already a
 * working edit form, but it had no status field either, and the backend's
 * update schema had `status` commented out, so even a hand-typed URL could
 * rename a department and never retire one.
 *
 * DESIGNATION had a View action, and View opened /designation/:id, which is an
 * edit form rather than a viewer - so the NAME was always editable. The STATUS
 * was not: that form hardcoded `status: 1` in its initial values and offered no
 * control, so saving any designation set it Active. Editing an inactive
 * designation silently reactivated it.
 *
 * There is no component renderer wired up in this repo, so these read the
 * sources. That suits what needs proving: most of these are about a value
 * coming from the record rather than from a literal, and about an action being
 * present or absent - neither of which a single render assertion demonstrates.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const modal = read("components/masters/MasterEditModal.jsx");
const modalCode = strip(modal);
const deptList = read("pages/department/index.js");
const deptListCode = strip(deptList);
const desigList = read("pages/designation/index.jsx");
const desigListCode = strip(desigList);
const deptForm = read("pages/department/[id].js");
const desigForm = read("pages/designation/[id].js");

const SCREENS = [
  {
    noun: "Department",
    list: deptListCode,
    listRaw: deptList,
    form: strip(deptForm),
    idField: "department_id",
    nameField: "department_name",
    permission: "add_department",
    helper: "updateDepartment",
  },
  {
    noun: "Designation",
    list: desigListCode,
    listRaw: desigList,
    form: strip(desigForm),
    idField: "designation_id",
    nameField: "designation_name",
    permission: "add_designation",
    helper: "updateDesignation",
  },
];

/* ================================= the Edit action exists, and is gated == */

for (const s of SCREENS) {
  test(`${s.noun}: THE ACTION COLUMN OFFERS VIEW AND EDIT`, () => {
    const column = s.list.slice(s.list.indexOf('headerName: "Action"'));
    assert.match(column, /label: "View"/, `${s.noun} must keep View`);
    assert.match(column, /iconType: "view"/);
    assert.match(column, /label: "Edit"/, `${s.noun} must offer Edit`);
    assert.match(column, /iconType: "edit"/);
    // Rendered, not commented out - which is what Department's was.
    assert.ok(
      !/\/\/\s*headerName: "Action"/.test(s.listRaw),
      `${s.noun}'s action column must not be commented out`
    );
  });

  test(`${s.noun}: EDIT IS OFFERED ONLY TO SOMEBODY WHO MAY SAVE`, () => {
    // The same key the backend's update route already requires, so the action
    // is not there to be clicked in vain - and no new permission is invented.
    assert.match(s.list, new RegExp(`usePermissions\\(\\["${s.permission}"\\]\\)`));
    const column = s.list.slice(s.list.indexOf('headerName: "Action"'));
    assert.match(column, /if \(canManage\) \{/, `${s.noun}: Edit must be conditional`);
    // View is not gated by it - looking is unchanged.
    const beforeGuard = column.slice(0, column.indexOf("if (canManage)"));
    assert.match(beforeGuard, /label: "View"/);
  });

  test(`${s.noun}: no hard-coded identity anywhere in the guard`, () => {
    for (const bad of [/user_id\s*===/, /designation_id\s*===\s*\d/, /isAdmin\s*=\s*true/]) {
      assert.ok(!bad.test(s.list), `${s.noun}: hard-coded identity ${bad}`);
    }
  });
}

/* ============================================ the dialog prefills ======== */

test("THE DIALOG PREFILLS NAME AND STATUS FROM THE RECORD", () => {
  assert.match(modalCode, /setName\(record\.name \?\? ""\)/);
  assert.match(modalCode, /setStatus\(\s*Number\(record\.status\) === STATUS\.INACTIVE/);
});

test("AN INACTIVE RECORD PREFILLS AS INACTIVE, AN ACTIVE ONE AS ACTIVE", () => {
  // The exact reading the rest of the application uses: 1 is Active, anything
  // else is Inactive. A record with no status at all is Active, matching the
  // column default.
  assert.match(modalCode, /STATUS = \{ ACTIVE: 1, INACTIVE: 0 \}/);
  const effect = modalCode.slice(modalCode.indexOf("useEffect("), modalCode.indexOf("const submit"));
  assert.match(effect, /=== STATUS\.INACTIVE\s*\?\s*STATUS\.INACTIVE\s*:\s*STATUS\.ACTIVE/);
});

test("REOPENING ON A DIFFERENT ROW REPREFILLS", () => {
  // Without `record` in the dependency list, opening a second row would show
  // the first row's values - which is how the wrong master gets renamed.
  const effect = modalCode.slice(modalCode.indexOf("useEffect("));
  assert.match(effect.slice(0, 600), /\}, \[isOpen, record\]\);/);
});

test("the status control offers exactly Active and Inactive", () => {
  assert.match(modal, /<option value=\{String\(STATUS\.ACTIVE\)\}>Active<\/option>/);
  assert.match(modal, /<option value=\{String\(STATUS\.INACTIVE\)\}>Inactive<\/option>/);
});

test("STATUS IS SUBMITTED AS A NUMBER, NEVER A STRING", () => {
  // `"0"` is truthy, and every list in the app tests `status === 1`. A string
  // would render as Inactive but compare wrong wherever it is read strictly.
  assert.match(modalCode, /status: Number\(status\)/);
});

test("an empty name is refused before a request is made", () => {
  assert.match(modalCode, /if \(!trimmed\) \{/);
  assert.match(modalCode, /cannot be empty/);
});

/* ========================================= saving uses the existing id === */

for (const s of SCREENS) {
  test(`${s.noun}: SAVE IS KEYED BY THE EXISTING ID, SO IT NEVER CREATES`, () => {
    assert.match(s.list, new RegExp(`${s.idField}: Number\\(id\\)`));
    assert.match(s.list, new RegExp(`${s.helper}\\(`));
    // No create call on the list screen at all.
    assert.ok(
      !new RegExp(`create${s.noun}\\(`).test(s.list),
      `${s.noun} list must not create`
    );
  });

  test(`${s.noun}: both fields are sent, and the list is refetched`, () => {
    const save = s.list.slice(s.list.indexOf("const save"));
    assert.match(save, new RegExp(`${s.nameField}: name`));
    assert.match(save, /status: Number\(status\)/);
    // Refetched rather than patched in place, so the row shows what was
    // actually stored.
    assert.match(save, /get(Department|Designation)Data\(\)/);
  });

  test(`${s.noun}: the row is passed to the dialog from the grid row`, () => {
    const column = s.list.slice(s.list.indexOf('headerName: "Action"'));
    assert.match(column, new RegExp(`id: props\\.data\\.${s.idField}`));
    assert.match(column, new RegExp(`name: props\\.data\\.${s.nameField}`));
    assert.match(column, /status: props\.data\.status/);
  });
}

/* ============ designation: a name edit must not revoke permissions ====== */

test("DESIGNATION: THE LIST EDIT SENDS NO PERMISSIONS ARRAY", () => {
  // The backend deletes and recreates the whole permission set whenever that
  // array is present. Sending one from a screen that never loaded it would
  // revoke everything the designation can do; omitting it leaves the set alone.
  const save = desigListCode.slice(desigListCode.indexOf("const saveDesignation"));
  const body = save.slice(0, save.indexOf("const colDefs"));
  assert.ok(!/permissions/.test(body), "the list edit must not send permissions");
});

test("DESIGNATION: online_portal and login_access are sent back unchanged", () => {
  // Both are `required` on the backend and are written by `UPDATE ... SET ?`.
  // Omitting them is a 422; guessing them silently changes what the
  // designation can reach.
  const save = desigListCode.slice(desigListCode.indexOf("const saveDesignation"));
  assert.match(save, /online_portal: Number\(row\.online_portal\)/);
  assert.match(save, /login_access: Number\(row\.login_access\)/);
  assert.match(save, /designations\.find\(/);
});

/* ================================ the detail forms no longer hardcode ==== */

test("DESIGNATION FORM: status IS NO LONGER HARDCODED TO 1", () => {
  // This was `status: 1`, so saving any designation reactivated it.
  const initial = desigForm.slice(desigForm.indexOf("initialValues={{"));
  const block = initial.slice(0, initial.indexOf("}}"));
  assert.ok(!/status:\s*1,/.test(block), "status must not be a literal 1");
  assert.match(block, /this\.state\.data\[0\]\?\.status/);
  // A new designation still starts Active.
  assert.match(block, /this\.state\.id === null\s*\?\s*1/);
});

test("DEPARTMENT FORM: status is read from the record", () => {
  const initial = deptForm.slice(deptForm.indexOf("initialValues={{"));
  const block = initial.slice(0, initial.indexOf("}}"));
  assert.match(block, /this\.state\.data\[0\]\?\.status/);
  assert.match(block, /this\.state\.id === null\s*\n?\s*\?\s*1/);
});

for (const [noun, form] of [["Department", deptForm], ["Designation", desigForm]]) {
  test(`${noun} FORM: a status control exists, and only when editing`, () => {
    // A record being created is Active by definition, and neither create
    // endpoint takes a status.
    assert.match(form, /label="Status"/);
    assert.match(form, /name="status"/);
    assert.match(form, /\{id !== null && \(/);
    assert.match(form, /value: "Active"/);
    assert.match(form, /value: "Inactive"/);
  });
}

test("DEPARTMENT CREATE STILL SENDS ONLY THE NAME", () => {
  // `POST /department/create` validates with Joi, which rejects unknown keys,
  // and its schema is `{ department_name }` alone - so passing the form's new
  // `status` straight through would turn every creation into a 422.
  assert.match(
    strip(deptForm),
    /createDepartment\(\{ department_name: values\.department_name \}\)/
  );
});

/* ================================================== regression guards ==== */

for (const s of SCREENS) {
  test(`${s.noun}: viewing, the columns and the badge are unchanged`, () => {
    assert.match(s.list, new RegExp(`field: "${s.idField}"[\\s\\S]{0,60}headerName: "ID"`));
    assert.match(s.list, new RegExp(`field: "${s.nameField}"[\\s\\S]{0,80}headerName: "Name"`));
    assert.match(s.list, /headerName: "Status"[\s\S]{0,120}badge-column/);
    assert.match(s.list, /label: "Active", colorScheme: "green"/);
    assert.match(s.list, /label: "Inactive", colorScheme: "red"/);
    // Still the same grid, so sort/filter/pagination behaviour is untouched.
    assert.match(s.list, /<AgGrid rowData=\{[a-zA-Z]+\} colDefs=\{colDefs\} \/>/);
  });

  test(`${s.noun}: editing happens in a dialog, so the grid state survives`, () => {
    // Navigating away and back would lose sort, filter and scroll position -
    // which is the whole reason this is a modal and not a page.
    assert.match(s.list, /<MasterEditModal/);
    assert.match(s.list, /isOpen=\{Boolean\(editing\)\}/);
    assert.ok(!/router\.push/.test(s.list.slice(s.list.indexOf("const save"))), "no navigation on save");
  });
}

test("THE MASTER EDIT TOUCHES NOTHING OUTSIDE THE TWO MASTERS", () => {
  // Scope guard: no employee, lifecycle or Reports code is involved.
  for (const [name, src] of [
    ["modal", modal],
    ["department list", deptList],
    ["designation list", desigList],
  ]) {
    for (const foreign of [/new_employee/i, /employee_id/i, /\/hr\/employee/, /report/i]) {
      assert.ok(!foreign.test(src), `${name} must not reference ${foreign}`);
    }
  }
});
