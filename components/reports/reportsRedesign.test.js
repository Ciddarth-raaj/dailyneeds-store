/**
 * Reports — the redesigned screens.
 *
 *   node --test components/reports/reportsRedesign.test.js
 *
 * ================================================== WHAT CHANGED, AND WHY ==
 *
 * One screen used to hold the saved list, the column builder, the filters and
 * the results. Choosing a report meant scrolling past the machinery for
 * building one. It is now three screens: a catalogue, a report, and a builder
 * - with the column picker behind a drawer, because choosing columns is
 * occasional and reading the report is not.
 *
 * The behaviour worth protecting is the new rule underneath it: A SELECTED
 * COLUMN IS A FILTER, and removing the column removes the filter. `pruneFilters`
 * is pure, so that rule is RUN here rather than asserted about; the rest is
 * read as source, since this repo has no component renderer.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const saved = read("pages/reports/employee-master/index.jsx");
const view = read("pages/reports/employee-master/[templateId].jsx");
const create = read("pages/reports/employee-master/new.jsx");
const bench = strip(read("components/reports/ReportWorkbench.jsx"));
const drawer = strip(read("components/reports/ColumnsDrawer.jsx"));
const picker = strip(read("components/reports/FieldPicker.jsx"));
const filtersUi = strip(read("components/reports/ReportFilters.jsx"));

const { pruneFilters, isEmptyFilter } = require("../../util/reportFilterRules");

/* ======================= 1-5. Saved Reports ============================= */

test("THE SAVED REPORTS PAGE SHOWS REPORTS, NOT EMPLOYEES", () => {
  // The whole point of splitting the screen. No result table, no row, no
  // employee field, no count of people.
  const code = strip(saved);
  for (const forbidden of [
    "matching_count",
    "preview",
    "rows",
    "<Thead",
    "<Tbody",
    "employees found",
  ]) {
    assert.ok(!code.includes(forbidden), `the catalogue must not render ${forbidden}`);
  }
  assert.ok(!/ReportHelper\.preview/.test(code), "and must never run a report");
});

test("nor does it permanently render the column builder", () => {
  const code = strip(saved);
  for (const forbidden of ["FieldPicker", "ColumnsDrawer", "field_keys:", "Available"]) {
    assert.ok(!code.includes(forbidden), `the catalogue must not build columns: ${forbidden}`);
  }
});

test("it lists the reports, with the built-in ones marked", () => {
  assert.match(saved, /ReportHelper\.listTemplates\(\)/);
  assert.match(saved, /template\.is_system \?/);
  assert.match(saved, /Built-in/);
  // Search, Open and Save a Copy - the three actions the catalogue needs.
  assert.match(saved, /Search reports\.\.\./);
  assert.match(saved, />\s*Open\s*</);
  assert.match(saved, />\s*Save a Copy\s*</);
});

test("OPEN ROUTES TO THE REPORT'S OWN SCREEN", () => {
  assert.match(
    strip(saved),
    /router\.push\(`\/reports\/employee-master\/\$\{template\.template_id\}`\)/
  );
  // And Create Report has a screen of its own too.
  assert.match(strip(saved), /router\.push\("\/reports\/employee-master\/new"\)/);
});

test("SAVE A COPY CREATES A NEW REPORT AND LEAVES THE BUILT-IN ALONE", () => {
  // From the catalogue, through the server's own copy verb.
  assert.match(strip(saved), /ReportHelper\.copyTemplate\(/);
  // From the report view, as a NEW template built from what is on screen.
  assert.match(strip(view), /ReportHelper\.createTemplate\(/);
  // Neither screen can write back to a template.
  for (const [name, src] of [["saved", strip(saved)], ["view", strip(view)]]) {
    assert.ok(!/updateTemplate/.test(src), `${name} must not update a template`);
  }
});

/* ======================= 6-11. Columns ================================== */

test("THE COLUMNS BUTTON OPENS A DRAWER, AND THE LIST IS NOT ALWAYS ON SCREEN", () => {
  assert.match(bench, /const drawer = useDisclosure\(\)/);
  assert.match(bench, /onClick=\{drawer\.onOpen\}/);
  assert.match(bench, /<ColumnsDrawer/);
  assert.match(drawer, /<Drawer /);
  assert.match(read("components/reports/ColumnsDrawer.jsx"), /Customize Columns/);
  assert.match(
    read("components/reports/ColumnsDrawer.jsx"),
    /Select columns to display and filter in this report\./
  );
});

test("THE GROUPS ARE COLLAPSIBLE, AND NOT ALL OPEN AT ONCE", () => {
  // Thirty columns fully expanded is the crowding this redesign removes.
  assert.match(picker, /aria-expanded=\{isOpen\(group\.group\)\}/);
  assert.match(picker, /display=\{isOpen\(group\.group\) \? "flex" : "none"\}/);
  // Open on arrival only where the report already uses something.
  assert.match(picker, /open\[group\.group\] = group\.fields\.some\(\(f\) => chosen\.includes\(f\.key\)\)/);
  // A selected/total count, so a collapsed group still says what is inside.
  assert.match(picker, /group\.fields\.filter\(\(f\) => chosen\.includes\(f\.key\)\)\.length\}\/\{group\.fields\.length/);
  // And a search that opens whatever matches.
  assert.match(picker, /Search columns\.\.\./);
  assert.match(picker, /const isOpen = \(name\) => \(term \? true : Boolean\(open\[name\]\)\)/);
});

test("THERE IS EXACTLY ONE COLUMN CHOOSER", () => {
  // The drawer wraps the picker rather than reimplementing it, and the create
  // screen uses the same workbench - so selection, ordering and the cap cannot
  // behave differently in two places.
  assert.match(drawer, /import FieldPicker from "\.\/FieldPicker"/);
  assert.match(drawer, /<FieldPicker/);
  for (const [name, src] of [["workbench", bench], ["view", strip(view)], ["create", strip(create)]]) {
    assert.ok(!/<Checkbox/.test(src), `${name} must not grow its own field checkboxes`);
  }
  assert.match(strip(create), /<ReportWorkbench/);
  assert.match(strip(view), /<ReportWorkbench/);
});

test("SELECTING AND REMOVING A COLUMN CHANGES THE RESULT, AND THE ORDER IS THE ARRAY", () => {
  // Applying hands the draft up and re-runs with it, so the table follows.
  assert.match(drawer, /onApply\(draft\);/);
  assert.match(bench, /onApply=\{\(next\) => \{\s*applyColumns\(next\);\s*run\(1,/);
  // Array position IS column position - the picker swaps neighbours and there
  // is no separate sort index anywhere to fall out of step with it.
  assert.match(picker, /\[next\[index\], next\[target\]\] = \[next\[target\], next\[index\]\]/);
  assert.ok(!/sort_index|sortOrder|position:/.test(picker));
});

test("RESET TO DEFAULT RESTORES THE REPORT'S OWN COLUMNS", () => {
  // The saved template's columns, not a global default - which would silently
  // turn one report into another.
  assert.match(drawer, /onClick=\{\(\) => setDraft\(defaultSelected\)\}/);
  assert.match(bench, /defaultSelected=\{defaultColumns\}/);
  assert.match(bench, /const defaultColumns = template \? template\.field_keys : null/);
});

test("nothing is applied until Apply, and Cancel really discards", () => {
  // Applying per tick would re-run the whole query on every checkbox.
  assert.match(drawer, /const \[draft, setDraft\] = useState/);
  assert.match(drawer, /if \(isOpen\) setDraft\(Array\.isArray\(selected\) \? selected : \[\]\)/);
  assert.match(drawer, /onClick=\{onClose\}/);
});

/* ======================= 12-14. columns and filters are joined =========== */

test("REMOVING A COLUMN REMOVES ITS FILTER", () => {
  // Run, not asserted about. A filter still narrowing a column nobody can see
  // is a count that cannot be explained from the screen.
  const filters = [
    { field: "bank_status", value: "VERIFIED" },
    { field: "bank_name", value: "State Bank of India" },
    { field: "department", value: [7] },
  ];

  const kept = pruneFilters(filters, ["employee_id", "bank_status", "department"]);
  assert.deepStrictEqual(
    kept.map((f) => f.field),
    ["bank_status", "department"],
    "bank_name lost its column, so it loses its filter"
  );

  assert.deepStrictEqual(pruneFilters(filters, []), []);
  assert.deepStrictEqual(pruneFilters(filters, ["bank_status", "bank_name", "department"]), filters);
  // Tolerant of nothing at all, since it runs on every column change.
  assert.deepStrictEqual(pruneFilters(undefined, ["a"]), []);
  assert.deepStrictEqual(pruneFilters(filters, undefined), []);
});

test("the pruning is wired into the one place columns change", () => {
  assert.match(bench, /setFieldFilters\(\(current\) => pruneFilters\(current, next\)\)/);
  // And into the request that immediately follows, so the run cannot carry a
  // filter the new column list no longer includes.
  assert.match(bench, /field_filters: pruneFilters\(fieldFilters, next\)/);
});

test("ONLY SELECTED COLUMNS ARE OFFERED AS FILTERS", () => {
  // Eligible = selected AND filterable AND authorized, all three from the
  // server's own description. A field the server did not send cannot be
  // offered, which is what stops the UI requesting something unauthorized.
  assert.match(
    filtersUi,
    /\(selectedKeys \|\| \[\]\)\.map\(\(k\) => byKey\.get\(k\)\)\.filter\(\(f\) => f && f\.filter\)/
  );
  // The catalogue is the server's; there is no field list here.
  assert.match(filtersUi, /groups \|\| \[\]\)\.forEach\(\(g\) => g\.fields\.forEach/);
});

test("a field the server marks unfilterable is never given a control", () => {
  // `account_no` and `aadhaar_last4` are masked, and the server sends them
  // with no `filter`. The `f.filter` guard is the only thing that decides.
  assert.match(filtersUi, /f && f\.filter/);
  assert.ok(!/account_no|aadhaar/.test(filtersUi), "no field is named here at all");
});

/* ======================= 15-21. the filter UI ============================ */

test("THE COMMON FILTERS ARE SHOWN AND THE REST ARE BEHIND MORE FILTERS", () => {
  assert.match(filtersUi, /const COMMON_FIELDS = \["employment_status", "outlet", "department", "designation"\]/);
  assert.match(filtersUi, /\+ More Filters/);
  // A filter WITH A VALUE is never hidden behind "More" - that would be the
  // invisible narrowing this design exists to prevent.
  assert.match(
    filtersUi,
    /eligible\.filter\(\(f\) => COMMON_FIELDS\.includes\(f\.key\) \|\| valueOf\(f\.key\)\)/
  );
  // And nothing is offered twice.
  assert.match(filtersUi, /eligible\.filter\(\(f\) => !commonShown\.includes\(f\)\)/);
});

test("ACTIVE FILTERS ARE VISIBLE, INDIVIDUALLY REMOVABLE, AND CLEARABLE AT ONCE", () => {
  const src = read("components/reports/ReportFilters.jsx");
  assert.match(src, /Active filters:/);
  assert.match(src, /<TagCloseButton/);
  assert.match(filtersUi, /const clear = \(key\) => onChange\(active\.filter\(\(f\) => f\.field !== key\)\)/);
  assert.match(filtersUi, /const clearAll = \(\) => onChange\(\[\]\)/);
  assert.match(src, /Clear All/);
});

test("A CLEARED CONTROL SENDS NO FILTER AT ALL", () => {
  // Otherwise an emptied box becomes `LIKE '%%'`, which still excludes NULLs
  // and quietly changes the result.
  assert.strictEqual(isEmptyFilter({ value: "" }, "text"), true);
  assert.strictEqual(isEmptyFilter({ value: "   " }, "text"), true);
  assert.strictEqual(isEmptyFilter({ value: [] }, "master"), true);
  assert.strictEqual(isEmptyFilter({ from: "", to: "" }, "date"), true);
  assert.strictEqual(isEmptyFilter({ value: "VERIFIED" }, "enum"), false);
  assert.strictEqual(isEmptyFilter({ value: [2] }, "master"), false);
  assert.strictEqual(isEmptyFilter({ from: "2024-01-01", to: "" }, "date"), false);

  assert.match(filtersUi, /if \(isEmptyFilter\(next, field\.filter\.type\)\) \{\s*onChange\(without\);/);
});

test("THE CONTROL IS CHOSEN BY THE SERVER'S TYPE, NOT BY THE FIELD NAME", () => {
  for (const type of ["enum", "master", "date", "id"]) {
    assert.ok(filtersUi.includes(`"${type}"`), `${type} must have a control`);
  }
  // Enum options come from the catalogue; master options from the masters
  // already loaded for the screen. Neither is invented here.
  assert.match(filtersUi, /if \(field\.filter\.type === "enum"\) return field\.filter\.options \|\| \[\]/);
  assert.match(filtersUi, /\(masters && masters\[field\.filter\.master\]\) \|\| \[\]/);
});

test("FILTERING IS SERVER-SIDE, SO THE COUNT AND THE PAGES AGREE", () => {
  // The browser must never narrow the rows it happens to be holding: that
  // would leave the total, the other pages and the export describing a
  // different set of people.
  assert.ok(
    !/rows\.filter|preview\.rows\.filter/.test(bench),
    "the workbench must not filter rows in the browser"
  );
  assert.match(bench, /filters: override \? override\.filters : filters/);
  assert.match(bench, /\{preview\.matching_count\} employees found/);
  // Pagination is the server's too.
  assert.match(bench, /onClick=\{\(\) => run\(preview\.page \+ 1\)\}/);
  assert.match(bench, /Math\.ceil\(preview\.matching_count \/ preview\.page_size\)/);
});

test("APPLY IS WHAT RUNS - NOT A KEYSTROKE", () => {
  // A run is a query over the whole employee master; running per character
  // typed into a text filter would be one query per character.
  assert.match(bench, /onApply=\{\(\) => \{\s*setDirty\(true\);\s*run\(1, \{ field_keys: fieldKeys, filters \}\);/);
  const onChange = filtersUi.slice(filtersUi.indexOf("const setFilter"));
  assert.ok(!/run\(/.test(onChange.slice(0, 600)), "changing a control must not run the report");
});

/* ======================= 26-31. export and saving ======================= */

test("EXPORT USES THE SAME DEFINITION THE TABLE WAS BUILT FROM", () => {
  const exportBody = bench.slice(bench.indexOf("const doExport"), bench.indexOf("const canExport"));
  // Same fields, same order, same filters - so the spreadsheet matches the
  // count on screen and holds no column that is not displayed.
  assert.match(exportBody, /field_keys: fieldKeys/);
  assert.match(exportBody, /filters,/);
  // And resolved the same way as the preview: by id while untouched.
  assert.match(exportBody, /template && !dirty/);
  assert.match(exportBody, /ReportHelper\.exportXlsx : ReportHelper\.exportCsv/);
});

test("SAVING PERSISTS THE COLUMNS, THEIR ORDER AND THE FILTERS", () => {
  // The live definition, not the one loaded a week ago.
  assert.match(bench, /onDefinitionChange\(\{ field_keys: fieldKeys, filters \}\)/);
  for (const [name, src] of [["view", strip(view)], ["create", strip(create)]]) {
    assert.match(src, /field_keys: definition\.current\.field_keys/, name);
    assert.match(src, /filters: definition\.current\.filters/, name);
  }
});

test("REOPENING A SAVED REPORT RESTORES BOTH", () => {
  assert.match(strip(view), /initialFieldKeys=\{template\.field_keys \|\| \[\]\}/);
  assert.match(strip(view), /initialFilters=\{template\.filters \|\| \{\}\}/);
  assert.match(bench, /useState\(initialFieldKeys \|\| \[\]\)/);
  assert.match(bench, /\(initialFilters && initialFilters\.field_filters\) \|\| \[\]/);
  assert.match(bench, /useState\(\(initialFilters && initialFilters\.search\) \|\| ""\)/);
});

/* ======================= scope ========================================== */

test("NOTHING OUTSIDE REPORTS WAS TOUCHED", () => {
  // A query builder, charts, sorting, grouping - each was ruled out, and each
  // is the kind of thing that arrives one helpful addition at a time.
  for (const [name, src] of [["workbench", bench], ["filters", filtersUi], ["drawer", drawer]]) {
    for (const forbidden of ["Chart", "groupBy", "pivot", "aggregate", "operator", "sort_by"]) {
      assert.ok(
        !new RegExp(forbidden, "i").test(src),
        `${name} must not introduce ${forbidden}`
      );
    }
  }
});
