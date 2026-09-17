/**
 * Telegram Group Mapping screens. Phase 3A.
 *
 *   node --test components/master/telegramGroupMapping.test.js
 *
 * Two halves, as `telegramGroupRegistry.test.js` splits them:
 *
 *   the RULES in util/telegramGroupMapping.js are EXECUTED - the four types,
 *   the payload, the scope wording, the three target states
 *
 *   the SCREENS are read as source, because no component renderer is wired
 *   up in this repo. What is defended there is the approved shape: Map as a
 *   fourth registry action, exactly four mapping types, no target selector
 *   for All Employees, the six safe columns, and - above all - that no
 *   Join / Invite / Add Member / Remove Member control exists anywhere.
 */
const test = require("node:test");
const { describe, it } = test;
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
/** JSX text is content, not code - `strip` must not be trusted to remove it. */
const exists = (rel) => fs.existsSync(path.join(__dirname, "..", "..", rel));

const mapPage = strip(read("pages/master/telegram-groups/map.jsx"));
const listPage = strip(read("pages/master/telegram-groups/index.jsx"));
const mapModal = strip(read("components/master/MapTelegramGroupEmployees.jsx"));
const employeesModal = strip(read("components/master/TelegramGroupMatchedEmployees.jsx"));
const helper = strip(read("helper/telegramGroups.js"));
const hook = strip(read("customHooks/useTelegramGroupMappings.js"));
const mapPageNow = () => strip(read("pages/master/telegram-groups/map.jsx"));

/* The rules module is ESM; evaluate its exports without a bundler. */
const rules = (() => {
  const cjs = read("util/telegramGroupMapping.js")
    .replace(/export const /g, "const ")
    .replace(/export function /g, "function ");
  const names = [
    "ALL_EMPLOYEES_LABEL",
    "TARGET_STATE",
    "MAPPING_MESSAGES",
    "RULE_DIMENSIONS",
    "ANY_LABEL",
    "BULK_GRANT_MAX",
    "RULE_ACTION",
    "rulePayload",
    "narrowedCount",
    "canSaveRule",
    "saveBlockedReason",
    "ruleLabel",
    "dimensionCell",
    "dimensionState",
    "canAddSelected",
    "addSelectedBlockedReason",
    "pruneInvalidDimensions",
    "dimensionsWerePruned",
    "matchesEmployeeSearch",
    "visibleEmployees",
    "retainSelection",
    "toggleAllShown",
    "allShownSelected",
    "rowSeverity",
    "ruleDimensionStates",
    "targetWarning",
    "targetStatusLabel",
    "targetIsBroken",
    "scopeSummary",
    "countsScopeNotice",
    "groupCountSummary",
    "emptyMatchedMessage",
    "isBranchScoped",
    "isCountsUnavailable",
    "matchedCountCell",
    "matchedCountHeader",
    "COUNTS_SCOPE",
    "COUNTS_UNAVAILABLE",
    "telegramConnectedLabel",
    "canManageMappings",
  ];
  // eslint-disable-next-line no-new-func
  return new Function(`${cjs}\nreturn { ${names.join(", ")} };`)();
})();

/* =============================================================== rules */

describe("the three rule dimensions", () => {
  it("are exactly three, in cascade order", () => {
    assert.deepStrictEqual(
      rules.RULE_DIMENSIONS.map((d) => d.key),
      ["OUTLET", "DEPARTMENT", "DESIGNATION"]
    );
    assert.deepStrictEqual(
      rules.RULE_DIMENSIONS.map((d) => d.field),
      ["outlet_id", "department_id", "designation_id"]
    );
  });

  it("each picks from a master list, so nobody ever types an id", () => {
    for (const dimension of rules.RULE_DIMENSIONS) {
      assert.ok(dimension.selector, `${dimension.key} must name the master it picks from`);
      assert.ok(dimension.label, `${dimension.key} must have a label`);
    }
  });

  it("offer no rule builder and no hand-picked employee dimension", () => {
    const keys = rules.RULE_DIMENSIONS.map((d) => d.key);
    for (const forbidden of ["SELECTED_EMPLOYEES", "MANUAL", "ROLE", "USER", "CATEGORY", "EXPRESSION"]) {
      assert.ok(!keys.includes(forbidden), `${forbidden} must not be a dimension`);
    }
  });

  it("the single-dimension vocabulary is GONE, not merely unused", () => {
    // A helper that can still build `{mapping_type, target_id}` is a helper
    // a screen can still call, and the server REFUSES that body rather than
    // ignoring it - so the rule would silently be saved as All Employees.
    for (const removed of ["MAPPING_TYPES", "MAPPING_TYPE", "needsTarget", "mappingPayload", "canSubmitMapping", "mappingTargetLabel"]) {
      assert.strictEqual(rules[removed], undefined, `${removed} must no longer exist`);
    }
    const source = read("util/telegramGroupMapping.js");
    assert.ok(!/mapping_type/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "no code may still name mapping_type");
  });
});

describe("the submitted rule payload", () => {
  it("omits every dimension left on All", () => {
    assert.deepStrictEqual(rules.rulePayload({}), {});
    assert.deepStrictEqual(rules.rulePayload({ outlet_id: "", department_id: null, designation_id: undefined }), {});
  });

  it("sends the dimensions that were chosen, as numbers", () => {
    assert.deepStrictEqual(rules.rulePayload({ outlet_id: "5", designation_id: 7 }), {
      outlet_id: 5,
      designation_id: 7,
    });
  });

  it("never sends a sentinel of its own for All", () => {
    // The server owns the 0. A client inventing one would be writing a value
    // it does not own.
    const body = rules.rulePayload({ outlet_id: 5 });
    assert.ok(!("department_id" in body));
    assert.ok(!("designation_id" in body));
    assert.ok(!JSON.stringify(body).includes(":0"));
  });

  it("drops junk rather than sending it", () => {
    assert.deepStrictEqual(rules.rulePayload({ outlet_id: "abc", department_id: -3, designation_id: 0 }), {});
  });

  it("never carries a mapping_type", () => {
    const body = rules.rulePayload({ outlet_id: 5, mapping_type: "OUTLET" });
    assert.ok(!("mapping_type" in body));
  });

  it("counts how many dimensions a form narrows", () => {
    assert.strictEqual(rules.narrowedCount({}), 0);
    assert.strictEqual(rules.narrowedCount({ outlet_id: 5 }), 1);
    assert.strictEqual(rules.narrowedCount({ outlet_id: 5, designation_id: 7 }), 2);
    assert.strictEqual(rules.narrowedCount({ outlet_id: 5, department_id: 3, designation_id: 7 }), 3);
  });
});

describe("saving a rule, and adding a selection, are different actions", () => {
  it("names them differently on purpose", () => {
    assert.strictEqual(rules.RULE_ACTION.SAVE_RULE, "Save Dynamic Rule");
    assert.strictEqual(rules.RULE_ACTION.ADD_SELECTED, "Add Selected Employees");
    assert.notStrictEqual(rules.RULE_ACTION.SAVE_RULE, rules.RULE_ACTION.ADD_SELECTED);
  });

  it("explains what each one keeps doing afterwards", () => {
    assert.match(rules.MAPPING_MESSAGES.SAVE_RULE_HELP, /automatically/);
    assert.match(rules.MAPPING_MESSAGES.ADD_SELECTED_HELP, /writes no rule/i);
  });

  it("a rule with nothing narrowed may be saved, and is warned about", () => {
    // It IS "All Employees" - a real choice, not an incomplete form. But it
    // is the largest population there is, so the screen says so.
    assert.strictEqual(rules.canSaveRule({ form: {} }), true);
    assert.match(rules.MAPPING_MESSAGES.RULE_IS_ALL_EMPLOYEES, /every employee/i);
  });

  it("refuses to save a rule the group already has", () => {
    const blocked = { form: { outlet_id: 5 }, preview: { duplicate_rule: true } };
    assert.strictEqual(rules.canSaveRule(blocked), false);
    assert.strictEqual(rules.saveBlockedReason(blocked), rules.MAPPING_MESSAGES.DUPLICATE_RULE);
  });

  it("refuses to save while a request is already in flight", () => {
    assert.strictEqual(rules.canSaveRule({ form: {}, saving: "rule" }), false);
  });

  it("will not add an empty selection", () => {
    assert.strictEqual(rules.canAddSelected([]), false);
    assert.strictEqual(rules.addSelectedBlockedReason([]), rules.MAPPING_MESSAGES.NO_EMPLOYEES_SELECTED);
    assert.strictEqual(rules.canAddSelected(), false);
  });

  it("will not add more than the server accepts in one transaction", () => {
    const tooMany = Array.from({ length: rules.BULK_GRANT_MAX + 1 }, (_, i) => i + 1);
    assert.strictEqual(rules.canAddSelected(tooMany), false);
    assert.strictEqual(rules.addSelectedBlockedReason(tooMany), rules.MAPPING_MESSAGES.TOO_MANY_EMPLOYEES);
    assert.strictEqual(rules.canAddSelected(tooMany.slice(0, rules.BULK_GRANT_MAX)), true);
  });

  it("the bound matches the backend's BULK_GRANT_MAX exactly", () => {
    // Two numbers that must agree: the screen disables the button, the
    // server refuses the request. A drift means a selection the screen
    // allowed and the server rejected.
    const backend = fs.readFileSync(
      path.join(__dirname, "..", "..", "..", "dailyneeds-store-backend", "constants", "telegram_group_mapping.js"),
      "utf8"
    );
    const declared = Number(backend.match(/const BULK_GRANT_MAX = (\d+)/)[1]);
    assert.strictEqual(rules.BULK_GRANT_MAX, declared);
    assert.match(rules.MAPPING_MESSAGES.TOO_MANY_EMPLOYEES, new RegExp(String(declared)));
  });
});

describe("a rule reads back as a sentence, and as three cells", () => {
  const row = {
    rule: { outlet_id: 5, department_id: null, designation_id: 7 },
    rule_dimensions: [
      { dimension: "OUTLET", id: 5, name: "ECR", state: "ACTIVE" },
      { dimension: "DEPARTMENT", id: null, name: "All", state: "NOT_APPLICABLE" },
      { dimension: "DESIGNATION", id: 7, name: "Cashier", state: "ACTIVE" },
    ],
    rule_label: "Outlet: ECR + Designation: Cashier",
  };

  it("prefers the server's label, which resolved the names", () => {
    assert.strictEqual(rules.ruleLabel(row), "Outlet: ECR + Designation: Cashier");
  });

  it("falls back to local names for a rule not yet saved", () => {
    assert.strictEqual(
      rules.ruleLabel({ rule: { outlet_id: 5, designation_id: 7 } }, { outlet_id: { 5: "ECR" }, designation_id: { 7: "Cashier" } }),
      "Outlet: ECR + Designation: Cashier"
    );
  });

  it("a rule narrowing nothing reads as All Employees", () => {
    assert.strictEqual(rules.ruleLabel({ rule: {} }, {}), "All Employees");
    assert.strictEqual(rules.ALL_EMPLOYEES_LABEL, "All Employees");
  });

  it("an unnamed target still shows its id", () => {
    assert.strictEqual(rules.ruleLabel({ rule: { outlet_id: 14 } }, {}), "Outlet: #14");
  });

  it("each dimension gets its own cell, and All is a real value", () => {
    assert.strictEqual(rules.dimensionCell(row, "OUTLET"), "ECR");
    assert.strictEqual(rules.dimensionCell(row, "DEPARTMENT"), "All");
    assert.strictEqual(rules.dimensionCell(row, "DESIGNATION"), "Cashier");
    assert.strictEqual(rules.ANY_LABEL, "All");
  });

  it("a MISSING target shows its id in its own cell", () => {
    const broken = { rule_dimensions: [{ dimension: "OUTLET", id: 14, name: null, state: "MISSING" }] };
    assert.strictEqual(rules.dimensionCell(broken, "OUTLET"), "#14");
    assert.strictEqual(rules.dimensionState(broken, "OUTLET"), "MISSING");
  });

  it("an absent dimension is All, not a broken one", () => {
    assert.strictEqual(rules.dimensionCell({}, "OUTLET"), "All");
    assert.strictEqual(rules.dimensionState({}, "OUTLET"), "NOT_APPLICABLE");
  });
});

describe("a composite row's status, reduced from THREE dimension states", () => {
  /** `dims` in cascade order: outlet, department, designation. */
  const row = (...states) => ({
    rule_dimensions: [
      { dimension: "OUTLET", id: states[0] === "NOT_APPLICABLE" ? null : 5, name: "ECR", state: states[0] },
      { dimension: "DEPARTMENT", id: states[1] === "NOT_APPLICABLE" ? null : 3, name: "Ops", state: states[1] },
      { dimension: "DESIGNATION", id: states[2] === "NOT_APPLICABLE" ? null : 7, name: "Cashier", state: states[2] },
    ],
  });
  const ALL = "NOT_APPLICABLE";

  it("Active + All + All -> Active", () => {
    // THE REGRESSION THIS BLOCK EXISTS FOR. A perfectly healthy saved rule
    // used to fall through to "—" because the old single `target_state` is
    // simply absent on a composite row - and a valid rule that looks like it
    // has no state is a rule somebody deletes.
    const r = row("ACTIVE", ALL, ALL);
    assert.strictEqual(rules.targetStatusLabel(r), "Active");
    assert.strictEqual(rules.targetWarning(r), null);
    assert.strictEqual(rules.targetIsBroken(r), false);
    assert.strictEqual(rules.rowSeverity(r), "ACTIVE");
  });

  it("Active + Active + Active -> Active", () => {
    assert.strictEqual(rules.targetStatusLabel(row("ACTIVE", "ACTIVE", "ACTIVE")), "Active");
  });

  it("Active + Inactive + All -> Inactive", () => {
    const r = row("ACTIVE", "INACTIVE", ALL);
    assert.strictEqual(rules.targetStatusLabel(r), "Inactive");
    assert.strictEqual(rules.targetWarning(r), "Mapped target is inactive");
    assert.strictEqual(rules.rowSeverity(r), "INACTIVE");
  });

  it("Active + Missing + Inactive -> Missing, the most actionable state", () => {
    // MISSING must not hide behind a sibling that is merely retired.
    const r = row("ACTIVE", "MISSING", "INACTIVE");
    assert.strictEqual(rules.targetStatusLabel(r), "Missing");
    assert.strictEqual(rules.targetWarning(r), "Mapped target no longer exists");
    assert.strictEqual(rules.rowSeverity(r), "MISSING");
  });

  it("All + All + All -> the em dash, and nothing is broken", () => {
    const r = row(ALL, ALL, ALL);
    assert.strictEqual(rules.targetStatusLabel(r), "—");
    assert.strictEqual(rules.targetWarning(r), null);
    assert.strictEqual(rules.targetIsBroken(r), false);
    assert.strictEqual(rules.rowSeverity(r), "NOT_APPLICABLE");
  });

  it("the warning names the HIGHEST-SEVERITY dimension, matching the badge", () => {
    // If they disagreed, the colour would describe one dimension and the
    // words another.
    const r = row("INACTIVE", "MISSING", ALL);
    assert.strictEqual(rules.rowSeverity(r), "MISSING");
    assert.strictEqual(rules.targetWarning(r), "Mapped target no longer exists");
  });

  it("prefers the server's own warning text over the local fallback", () => {
    const r = {
      rule_dimensions: [{ dimension: "OUTLET", id: 5, state: "INACTIVE", warning: "Something the server said" }],
    };
    assert.strictEqual(rules.targetWarning(r), "Something the server said");
  });

  it("A VALID MAPPING MATCHING NOBODY IS NOT BROKEN", () => {
    // The distinction the whole screen turns on: 0 is a count, not a fault.
    const r = { ...row("ACTIVE", ALL, ALL), matched_employees: 0 };
    assert.strictEqual(rules.targetWarning(r), null);
    assert.strictEqual(rules.targetIsBroken(r), false);
    assert.strictEqual(rules.targetStatusLabel(r), "Active");
  });

  it("the legacy single target_state is NOT consulted, even as a fallback", () => {
    // Reading it would let a row be described by a field that no longer
    // reflects two of its three dimensions.
    const stale = { target_state: "ACTIVE", target_warning: "stale", rule_dimensions: [] };
    assert.strictEqual(rules.targetStatusLabel(stale), "—");
    assert.strictEqual(rules.targetWarning(stale), null);
    const source = read("util/telegramGroupMapping.js").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/row\.target_state/.test(source), "no code may read the legacy field");
  });

  it("a row with no rule_dimensions at all is the em dash, not a crash", () => {
    for (const r of [undefined, null, {}, { rule_dimensions: null }]) {
      assert.strictEqual(rules.targetStatusLabel(r), "—");
      assert.strictEqual(rules.targetWarning(r), null);
    }
  });

  it("a MISSING target still shows its id, so somebody can work out which", () => {
    const broken = { rule_dimensions: [{ dimension: "OUTLET", id: 14, name: null, state: "MISSING" }] };
    assert.strictEqual(rules.dimensionCell(broken, "OUTLET"), "#14");
  });

  it("the page colours the badge from the SAME derivation as the label", () => {
    assert.match(mapPage, /rowSeverity\(row\) === TARGET_STATE\.MISSING/);
    assert.ok(!/row\.target_state/.test(mapPage), "never the legacy field");
  });
});

describe("the cascade resets what it no longer offers", () => {
  const options = {
    outlet_id: [{ id: 5, name: "ECR" }, { id: 6, name: "Anna Nagar" }],
    department_id: [{ id: 3, name: "Operations" }, { id: 4, name: "Billing" }],
    designation_id: [{ id: 7, name: "Cashier" }],
  };

  it("keeps a value the cascade still offers", () => {
    const form = { outlet_id: 5, department_id: 3, designation_id: 7 };
    assert.deepStrictEqual(rules.pruneInvalidDimensions(form, options), form);
    assert.strictEqual(rules.dimensionsWerePruned(form, rules.pruneInvalidDimensions(form, options)), false);
  });

  it("changing Outlet clears a Department that is no longer valid", () => {
    // Department 9 exists in the master but nobody at the new outlet is in
    // it, so it is not on offer any more.
    const form = { outlet_id: 5, department_id: 9 };
    const pruned = rules.pruneInvalidDimensions(form, options);
    assert.strictEqual(pruned.department_id, "");
    assert.strictEqual(pruned.outlet_id, 5, "the level the operator just chose stays");
    assert.strictEqual(rules.dimensionsWerePruned(form, pruned), true);
  });

  it("changing Outlet clears a Designation that is no longer valid", () => {
    const pruned = rules.pruneInvalidDimensions({ outlet_id: 5, designation_id: 10 }, options);
    assert.strictEqual(pruned.designation_id, "");
  });

  it("changing Department clears a Designation that is no longer valid", () => {
    const narrower = { ...options, designation_id: [{ id: 7, name: "Cashier" }] };
    const pruned = rules.pruneInvalidDimensions({ outlet_id: 5, department_id: 4, designation_id: 8 }, narrower);
    assert.strictEqual(pruned.designation_id, "", "Packer is not in Billing at ECR");
    assert.strictEqual(pruned.department_id, 4);
  });

  it("clears BOTH downstream levels when both went invalid", () => {
    const pruned = rules.pruneInvalidDimensions({ outlet_id: 6, department_id: 99, designation_id: 99 }, options);
    assert.strictEqual(pruned.department_id, "");
    assert.strictEqual(pruned.designation_id, "");
  });

  it("never retains a hidden invalid value", () => {
    // The property, stated directly: after pruning, every set dimension is
    // one the dropdown is actually showing.
    const pruned = rules.pruneInvalidDimensions({ outlet_id: 77, department_id: 9, designation_id: 10 }, options);
    for (const dimension of rules.RULE_DIMENSIONS) {
      const value = pruned[dimension.field];
      if (value === "" || value === undefined) continue;
      assert.ok(
        options[dimension.field].some((o) => Number(o.id) === Number(value)),
        `${dimension.field} kept a value that is not on offer`
      );
    }
  });

  it("All is never pruned - the absence of a restriction is always valid", () => {
    const form = { outlet_id: "", department_id: "", designation_id: "" };
    assert.deepStrictEqual(rules.pruneInvalidDimensions(form, options), form);
  });

  it("a level with NO options yet clears nothing", () => {
    // An empty list means the preview has not answered, or the caller may
    // see nobody. Treating that as "everything is invalid" would wipe the
    // operator's form while it loaded.
    const form = { outlet_id: 5, department_id: 3 };
    assert.deepStrictEqual(rules.pruneInvalidDimensions(form, {}), form);
    assert.deepStrictEqual(rules.pruneInvalidDimensions(form, { department_id: [] }), form);
  });

  it("compares by value, so a string id from a <select> still matches", () => {
    const pruned = rules.pruneInvalidDimensions({ outlet_id: "5", department_id: "3" }, options);
    assert.strictEqual(pruned.outlet_id, "5");
    assert.strictEqual(pruned.department_id, "3");
  });
});

describe("the selection survives the search box", () => {
  const POPULATION = [
    { employee_id: 11, employee_name: "Ravi" },
    { employee_id: 22, employee_name: "Kumar" },
    { employee_id: 33, employee_name: "Selvi" },
  ];

  /**
   * The component's own sequence, run as data: the search narrows what is
   * SHOWN, the selection is only ever pruned against the rule's POPULATION.
   */
  const shownFor = (search) => rules.visibleEmployees(POPULATION, search);

  it("select A, then search hides A - A stays selected", () => {
    // THE BUG THIS BLOCK EXISTS FOR. Pruning against the displayed rows
    // meant the operator granted one person having chosen two, silently.
    let selected = [11];
    const shown = shownFor("Kumar");
    assert.ok(!shown.some((e) => e.employee_id === 11), "Ravi is off screen");
    selected = rules.retainSelection(selected, POPULATION);
    assert.deepStrictEqual(selected, [11]);
  });

  it("select B while A is hidden - both are selected", () => {
    let selected = [11];
    selected = rules.retainSelection(selected, POPULATION);
    selected = [...selected, 22];
    assert.deepStrictEqual(selected.sort((a, b) => a - b), [11, 22]);
  });

  it("clear the search - both are still ticked", () => {
    const selected = rules.retainSelection([11, 22], POPULATION);
    const shown = shownFor("");
    assert.deepStrictEqual(selected.sort((a, b) => a - b), [11, 22]);
    for (const id of selected) {
      assert.ok(shown.some((e) => e.employee_id === id), `${id} is shown again`);
    }
  });

  it("a REAL rule change excluding A does remove A", () => {
    // Somebody who no longer belongs to the rule's population cannot be
    // granted through it, so this removal is correct and must still happen.
    const narrower = POPULATION.filter((e) => e.employee_id !== 11);
    assert.deepStrictEqual(rules.retainSelection([11, 22], narrower), [22]);
  });

  it("an empty population clears the selection entirely", () => {
    assert.deepStrictEqual(rules.retainSelection([11, 22], []), []);
  });

  it("compares by value, so a string id from the DOM still survives", () => {
    assert.deepStrictEqual(rules.retainSelection(["11"], POPULATION), ["11"]);
  });

  it("Select All ticks the SHOWN rows and leaves other selections alone", () => {
    const selected = rules.toggleAllShown([33], shownFor("Kumar"));
    assert.deepStrictEqual(selected.sort((a, b) => a - b), [22, 33], "Selvi is untouched");
  });

  it("Select All un-ticks only the shown rows", () => {
    const selected = rules.toggleAllShown([22, 33], shownFor("Kumar"));
    assert.deepStrictEqual(selected, [33]);
  });

  it("Select All never reaches somebody the operator cannot see", () => {
    const selected = rules.toggleAllShown([], shownFor("Ravi"));
    assert.deepStrictEqual(selected, [11]);
  });

  it("allShownSelected reflects the shown rows, not the whole population", () => {
    assert.strictEqual(rules.allShownSelected([22], shownFor("Kumar")), true);
    assert.strictEqual(rules.allShownSelected([22], shownFor("")), false);
    assert.strictEqual(rules.allShownSelected([], []), false, "nothing shown is not 'all'");
  });

  it("the bulk maximum is unchanged at 200", () => {
    assert.strictEqual(rules.BULK_GRANT_MAX, 200);
  });
});

describe("search matches a name or an employee ID", () => {
  const PEOPLE = [
    { employee_id: 42, employee_name: "Ravi" },
    { employee_id: 1425, employee_name: "Kumar" },
    { employee_id: 7, employee_name: "Ravi Kumar" },
  ];
  const found = (search) => rules.visibleEmployees(PEOPLE, search).map((e) => e.employee_id).sort((a, b) => a - b);

  it("matches the employee NAME, case-insensitively", () => {
    assert.deepStrictEqual(found("ravi"), [7, 42]);
    assert.deepStrictEqual(found("KUMAR"), [7, 1425]);
  });

  it("matches the employee ID", () => {
    assert.deepStrictEqual(found("1425"), [1425]);
    assert.deepStrictEqual(found("7"), [7]);
  });

  it("matches an ID as a substring, like every other search box here", () => {
    assert.deepStrictEqual(found("42"), [42, 1425]);
  });

  it("an empty or blank search shows everybody", () => {
    for (const search of ["", "   ", null, undefined]) {
      assert.strictEqual(found(search).length, 3, JSON.stringify(search));
    }
  });

  it("matches NOTHING else - not a mobile, not an Aadhaar", () => {
    // Matching those would CONFIRM a value the searcher already had, which
    // is a disclosure even though nothing is printed.
    const loaded = [{ employee_id: 3, employee_name: "Raj", mobile: "9876543210", aadhaar_number: "123456789012" }];
    assert.strictEqual(rules.visibleEmployees(loaded, "9876543210").length, 0);
    assert.strictEqual(rules.visibleEmployees(loaded, "123456789012").length, 0);
  });

  it("the frontend and backend search the same two fields", () => {
    const backend = fs.readFileSync(
      path.join(__dirname, "..", "..", "..", "dailyneeds-store-backend", "usecase", "telegram_group_mapping.js"),
      "utf8"
    );
    const matcher = backend.slice(backend.indexOf("static matchesSearch"), backend.indexOf("static matchesSearch") + 400);
    assert.match(matcher, /employee_name/);
    assert.match(matcher, /employee_id/);
    assert.ok(!/mobile|aadhaar|salary/i.test(matcher), "nothing sensitive is searchable");
  });
});

describe("the count wording says WHOSE employees it counts", () => {
  const branch = { total_matched: 12, counts_scope: "BRANCH" };
  const all = { total_matched: 34, counts_scope: "ALL" };

  it("a branch-scoped caller is told the count is theirs", () => {
    const text = rules.scopeSummary(branch);
    assert.match(text, /12 employees match this mapping in your branch scope/);
  });

  it("NEVER shows a branch caller a bare number", () => {
    // "12 employees match this mapping" is false as labelled for a rule that
    // may cover a hundred people, and a manager who believes it deletes the
    // rule.
    const text = rules.scopeSummary(branch);
    assert.ok(/your branch scope/.test(text), "the scope must be in the sentence itself");
  });

  it("an all-branches caller gets the plain company sentence", () => {
    const text = rules.scopeSummary(all);
    assert.match(text, /34 employees match this mapping\./);
    assert.ok(!/branch scope/.test(text), "an all-branches caller is not branch-scoped");
  });

  it("NO stale '34 match, 12 visible' wording survives anywhere", () => {
    // The old sentence needed a company-wide total, which is exactly the
    // figure the backend no longer computes for a scoped caller.
    for (const source of [
      read("util/telegramGroupMapping.js"),
      read("components/master/TelegramGroupMatchedEmployees.jsx"),
      read("pages/master/telegram-groups/map.jsx"),
    ]) {
      assert.ok(
        !/are visible in your branch scope/.test(source),
        "the old two-number wording must be gone"
      );
      assert.ok(!/visible_count/.test(source), "visible_count is not a field any more");
    }
  });

  it("the notice states BOTH facts: counts are yours, rules are everyone's", () => {
    const notice = rules.countsScopeNotice(branch);
    assert.match(notice, /limited to your branch scope/i);
    assert.match(notice, /company-wide/i, "a scoped count must not read as a branch-only rule");
  });

  it("shows no notice at all to an all-branches caller", () => {
    assert.strictEqual(rules.countsScopeNotice(all), null);
    // `{}` is NOT silent any more: a response with no counts_scope is
    // unavailable rather than company-wide, and says so.
    assert.match(rules.countsScopeNotice({}), /counts cannot be displayed/i);
  });

  it("the group header line carries the scope too", () => {
    assert.match(rules.groupCountSummary(branch), /12 employees in your branch scope/);
    assert.ok(!/in your branch scope/.test(rules.groupCountSummary(all)));
  });

  it("the empty state never claims NOBODY matches, to a scoped caller", () => {
    const scoped = rules.emptyMatchedMessage({ total_matched: 0, counts_scope: "BRANCH" });
    assert.match(scoped, /in your branch scope/);
    assert.match(scoped, /may still match employees in other branches/i);

    const global = rules.emptyMatchedMessage({ total_matched: 0, counts_scope: "ALL" });
    assert.match(global, /No currently employed staff match this mapping/);
    assert.ok(!/other branches/.test(global));
  });

  it("reads correctly for one employee", () => {
    assert.match(rules.scopeSummary({ total_matched: 1, counts_scope: "ALL" }), /1 employee matches/);
  });
});

describe("counts_scope NONE - nothing was counted, which is not a zero", () => {
  const none = { total_matched: 0, total_connected: 0, counts_scope: "NONE" };
  const branch = { total_matched: 0, counts_scope: "BRANCH" };
  const all = { total_matched: 0, counts_scope: "ALL" };

  it("says counts are unavailable, and none of the forbidden phrases", () => {
    const text = rules.scopeSummary(none);
    assert.match(text, /unavailable for your account scope/i);
    for (const forbidden of [
      /in your branch/i,
      /0 employees match/i,
      /no employees match/i,
      /nobody matches/i,
    ]) {
      assert.ok(!forbidden.test(text), `must not say ${forbidden}`);
    }
  });

  it("the group summary shows no 0 and no phantom connected count", () => {
    const text = rules.groupCountSummary(none);
    assert.match(text, /unavailable for your account scope/i);
    assert.ok(!/\b0\b/.test(text), "0 connected is not an observed population either");
    assert.ok(!/already connected/.test(text));
  });

  it("the grid cell is an em dash, never 0", () => {
    assert.strictEqual(rules.matchedCountCell({ matched_employees: 0 }, none), "\u2014");
    assert.strictEqual(rules.matchedCountCell({ matched_employees: 7 }, none), "\u2014");
    // A real zero from a real scope IS a number, and stays one.
    assert.strictEqual(rules.matchedCountCell({ matched_employees: 0 }, branch), 0);
    assert.strictEqual(rules.matchedCountCell({ matched_employees: 34 }, all), 34);
  });

  it("the column header stays neutral - no (your branch) over dashes", () => {
    assert.strictEqual(rules.matchedCountHeader(none), "Matched Employees");
    assert.strictEqual(rules.matchedCountHeader(all), "Matched Employees");
    assert.strictEqual(rules.matchedCountHeader(branch), "Matched Employees (your branch)");
  });

  it("the matched-employees modal does not claim nobody matches", () => {
    const text = rules.emptyMatchedMessage(none);
    assert.match(text, /unavailable for your account scope/i);
    assert.ok(!/No currently employed staff/.test(text));
    assert.ok(!/in your branch scope/.test(text));
  });

  it("the notice says the RULES are still real", () => {
    const notice = rules.countsScopeNotice(none);
    assert.match(notice, /mapping rules are still shown/i);
    assert.match(notice, /counts cannot be displayed/i);
  });

  it("an unknown or missing counts_scope fails to the NON-DISCLOSING answer", () => {
    // Never treat an unrecognised scope as company-wide: that would present
    // absent or partial numbers as the company's.
    for (const payload of [{}, null, undefined, { counts_scope: "SOMETHING_NEW" }, { counts_scope: null }]) {
      assert.strictEqual(rules.isCountsUnavailable(payload), true, JSON.stringify(payload));
      assert.match(rules.scopeSummary(payload || {}), /unavailable/i);
      assert.strictEqual(rules.matchedCountHeader(payload), "Matched Employees");
    }
  });

  it("ALL and BRANCH are unchanged by any of this", () => {
    assert.strictEqual(rules.isCountsUnavailable({ counts_scope: "ALL" }), false);
    assert.strictEqual(rules.isCountsUnavailable({ counts_scope: "BRANCH" }), false);
    assert.match(rules.scopeSummary({ total_matched: 34, counts_scope: "ALL" }), /34 employees match this mapping\./);
    assert.match(
      rules.scopeSummary({ total_matched: 12, counts_scope: "BRANCH" }),
      /12 employees match this mapping in your branch scope\./
    );
    assert.strictEqual(rules.countsScopeNotice({ counts_scope: "ALL" }), null);
  });

  it("the three states are distinct everywhere it matters", () => {
    const summaries = [all, branch, none].map((p) => rules.scopeSummary(p));
    assert.strictEqual(new Set(summaries).size, 3, "three states, three sentences");
  });
});

describe("the screens read the scope through the helper, not by hand", () => {
  it("no component compares counts_scope to a string itself", () => {
    for (const rel of [
      "pages/master/telegram-groups/map.jsx",
      "components/master/TelegramGroupMatchedEmployees.jsx",
    ]) {
      const source = strip(read(rel));
      assert.ok(
        !/counts_scope\s*===/.test(source),
        `${rel} must ask the helper, so a future state is handled in one place`
      );
    }
  });

  it("the map screen renders the cell and header through the helpers", () => {
    assert.match(mapPageNow(), /headerName: matchedCountHeader\(data\)/);
    assert.match(mapPageNow(), /matchedCountCell\(params\.data, data\)/);
  });

  it("the modal asks the helper whether counts are unavailable", () => {
    assert.match(strip(read("components/master/TelegramGroupMatchedEmployees.jsx")), /isCountsUnavailable\(result\)/);
  });
});

describe("the replaced scope_limited flag", () => {
  it("is gone from the whole frontend", () => {
    for (const rel of [
      "util/telegramGroupMapping.js",
      "components/master/TelegramGroupMatchedEmployees.jsx",
      "pages/master/telegram-groups/map.jsx",
      "customHooks/useTelegramGroupMappings.js",
      "helper/telegramGroups.js",
    ]) {
      assert.ok(!/scope_limited/.test(read(rel)), `${rel} still references scope_limited`);
    }
  });

  it("is replaced by counts_scope, which needs no forbidden total", () => {
    assert.deepStrictEqual(rules.COUNTS_SCOPE, { ALL: "ALL", BRANCH: "BRANCH", NONE: "NONE" });
    assert.strictEqual(rules.isBranchScoped({ counts_scope: "BRANCH" }), true);
    assert.strictEqual(rules.isBranchScoped({ counts_scope: "ALL" }), false);
    // Absent, unknown or NONE is not branch-scoped - and, separately, is
    // unavailable. The two questions are asked with two helpers so "not a
    // branch" is never mistaken for "the company".
    assert.strictEqual(rules.isBranchScoped({}), false);
    assert.strictEqual(rules.isBranchScoped(null), false);
    assert.strictEqual(rules.isBranchScoped({ counts_scope: "NONE" }), false);
    assert.strictEqual(rules.isCountsUnavailable({ counts_scope: "NONE" }), true);
  });
});

describe("Telegram Connected", () => {
  it("is Yes or No, and nothing else", () => {
    assert.strictEqual(rules.telegramConnectedLabel({ telegram_connected: true }), "Yes");
    assert.strictEqual(rules.telegramConnectedLabel({ telegram_connected: false }), "No");
    assert.strictEqual(rules.telegramConnectedLabel({}), "No");
    assert.strictEqual(rules.telegramConnectedLabel(null), "No");
  });
});

describe("permissions", () => {
  it("both write actions need the manage key, and there is no third key", () => {
    assert.strictEqual(rules.canManageMappings({ manage_telegram_groups: true }), true);
    assert.strictEqual(rules.canManageMappings({ view_telegram_groups: true }), false);
    assert.strictEqual(rules.canManageMappings({}), false);
  });
});

/* ============================================================== screens */

describe("the Registry gains Map Employees as a fourth action", () => {
  it("lists View, Map Employees, Edit and Delete", () => {
    assert.match(listPage, /label: "View"/);
    assert.match(listPage, /label: "Map Employees"/);
    assert.match(listPage, /label: "Edit"/);
    assert.match(listPage, /label: "Delete"/);
  });

  it("points Map at the group it belongs to", () => {
    assert.match(listPage, /\/master\/telegram-groups\/map\?id=\$\{id\}/);
  });

  it("gives Map Employees a DISTINCT icon, never a second pencil", () => {
    // Two identical pencils on one row make the more consequential action -
    // the one deciding who belongs in a real Telegram group - look like
    // editing a group's name, and a person picks whichever they land on.
    const actionsBlock = listPage.slice(listPage.indexOf("const actions = ["), listPage.indexOf("return actions;"));
    const mapAction = actionsBlock.slice(actionsBlock.indexOf('label: "Map Employees"'));
    const iconType = mapAction.match(/iconType: "(\w+)"/)[1];
    assert.strictEqual(iconType, "map");
    assert.notStrictEqual(iconType, "edit", "never the pencil Edit uses");

    // And the icon it resolves to is a people/hierarchy glyph, not a pen.
    const grid = read("components/AgGrid/index.jsx");
    const icons = grid.slice(grid.indexOf("const ICON_TYPES = {"), grid.indexOf("};", grid.indexOf("const ICON_TYPES = {")));
    const glyph = icons.match(/map: "([^"]+)"/)[1];
    assert.match(glyph, /sitemap|users|people|diagram/, glyph);
    assert.ok(!/fa-pen|fa-pencil|fa-edit/.test(glyph), "the Map glyph must not be a pencil");
  });

  it("the tooltip reads Map Employees", () => {
    // The action-icon renderer uses `label` as the Tooltip text.
    assert.match(listPage, /label: "Map Employees"/);
    const grid = read("components/AgGrid/index.jsx");
    assert.match(grid, /<Tooltip label=\{item\.label\}/);
  });

  it("puts Map Employees behind the VIEW key, with Edit and Delete still behind manage", () => {
    // Map is readable configuration; the write controls are inside it.
    const actionsBlock = listPage.slice(listPage.indexOf('const actions = ['), listPage.indexOf('return actions;'));
    const mapIndex = actionsBlock.indexOf('label: "Map Employees"');
    const manageIndex = actionsBlock.indexOf('if (canManage)');
    assert.ok(mapIndex > -1 && manageIndex > -1);
    assert.ok(mapIndex < manageIndex, "Map must sit outside the canManage branch");
    assert.ok(actionsBlock.indexOf('label: "Edit"') > manageIndex, "Edit stays behind manage");
    assert.ok(actionsBlock.indexOf('label: "Delete"') > manageIndex, "Delete stays behind manage");
  });

  it("adds no new main-menu item and no second registry screen", () => {
    const menus = read("constants/menus.js");
    assert.ok(!/telegram-groups\/map/.test(menus), "Map is an action on a row, not a menu entry");
    assert.strictEqual(
      fs.readdirSync(path.join(__dirname, "..", "..", "pages/master/telegram-groups")).sort().join(","),
      "[mode].jsx,index.jsx,map.jsx"
    );
  });
});

describe("the mapping RULE is never scoped", () => {
  it("the rule label is built from the rule, not from any count", () => {
    // A manager sees "Outlet: ECR" even when ECR's staff are not theirs to
    // count. Configuration is not somebody's employees.
    const row = { rule_dimensions: [{ dimension: "OUTLET", id: 5, name: "ECR", state: "ACTIVE" }] };
    assert.strictEqual(rules.dimensionCell(row, "OUTLET"), "ECR");
    assert.strictEqual(rules.ruleLabel({ rule: {} }, {}), "All Employees");
  });

  it("nothing in the label helpers reads counts_scope", () => {
    const source = read("util/telegramGroupMapping.js");
    const label = source.slice(source.indexOf("function mappingTargetLabel"), source.indexOf("function targetWarning"));
    assert.ok(!/counts_scope|branchScoped|isBranchScoped/.test(label));
  });
});

describe("the Map screen", () => {
  it("exists at the route the Registry links to", () => {
    assert.ok(exists("pages/master/telegram-groups/map.jsx"));
  });

  it("requires the manage key for Add and Delete only", () => {
    assert.match(mapPage, /usePermissions\(\["manage_telegram_groups"\]\)/);
    assert.match(mapPage, /canManage && \(/, "Add Mapping must be gated");
    // Delete is pushed into the action list only when canManage.
    const actions = mapPage.slice(mapPage.indexOf("const actions = ["), mapPage.indexOf("return actions;"));
    assert.ok(actions.indexOf("if (canManage)") < actions.indexOf('label: "Delete"'));
    assert.ok(actions.indexOf('label: "View Employees"') < actions.indexOf("if (canManage)"));
  });

  it("shows the approved group information", () => {
    for (const label of ["Group Name", "Type", "Category", "Outlet", "Status", "Bot Admin"]) {
      assert.ok(mapPage.includes(`>${label}<`), `the header must show ${label}`);
    }
  });

  it("shows NO chat id", () => {
    assert.ok(!/chat_id/.test(mapPage), "the mapping screen is about people, not the chat's id");
  });

  it("has one column per dimension, plus the approved rest", () => {
    // The three dimensions come from the shared list rather than three
    // literals, so a rule narrowing two of them can be SEEN to narrow two.
    assert.match(mapPage, /RULE_DIMENSIONS\.map\(/);
    assert.match(mapPage, /headerName: dimension\.label/);
    for (const header of ["Status", "Actions"]) {
      assert.match(mapPage, new RegExp(`headerName: "${header}"`));
    }
    // And the single-dimension columns are gone.
    assert.ok(!/headerName: "Mapping Type"/.test(mapPage));
    assert.ok(!/headerName: "Mapping To"/.test(mapPage));
    // Matched Employees carries the scope in its header, so the column names
    // the helper rather than a literal; the two spellings live in the helper
    // module and are asserted against it there.
    assert.match(mapPage, /headerName: matchedCountHeader\(data\)/);
    assert.strictEqual(rules.matchedCountHeader({ counts_scope: "BRANCH" }), "Matched Employees (your branch)");
  });

  it("offers View All Matched Employees for the deduplicated union", () => {
    assert.match(mapPage, /View All Matched Employees/);
    // null mapping id means "every rule, deduplicated".
    assert.match(mapPage, /openEmployees\(null, "All Matched Employees"\)/);
  });

  it("says a group with no mappings matches nobody, in words", () => {
    assert.match(rules.MAPPING_MESSAGES.NO_MAPPINGS, /matches nobody/i);
    assert.match(rules.MAPPING_MESSAGES.NO_MAPPINGS, /name never decides/i);
    assert.match(mapPage, /MAPPING_MESSAGES\.NO_MAPPINGS/);
  });

  it("banners an inactive group without disabling anything", () => {
    assert.match(mapPage, /!group\.is_active &&/);
    assert.match(mapPage, /inactive_notice \|\| MAPPING_MESSAGES\.INACTIVE_GROUP/);
    assert.match(rules.MAPPING_MESSAGES.INACTIVE_GROUP, /No Telegram membership action will be performed/);
    // The Add button is gated on canManage ONLY - never on is_active.
    assert.ok(
      !/is_active && canManage|canManage && group\.is_active/.test(mapPage),
      "an inactive group must still be editable"
    );
  });

  it("refetches from the server after a write instead of patching a count", () => {
    assert.match(mapPage, /await refetch\(\)/);
  });

  it("shows the branch-scope notice once, from the server's own flag", () => {
    assert.match(mapPage, /countsScopeNotice\(data\)/);
    assert.equal((mapPage.match(/countsScopeNotice\(data\) &&/g) || []).length, 1, "said once, not per row");
  });

  it("labels the Matched Employees column through the shared helper", () => {
    // A number read on its own - scanning the grid, or in a screenshot -
    // must not be mistaken for the company figure.
    assert.match(mapPage, /headerName: matchedCountHeader\(data\)/);
  });

  it("derives the scope from the response, never from local state", () => {
    assert.match(mapPage, /isCountsUnavailable\(data\)/);
  });
});

describe("Map Employees - the multi-level form", () => {
  it("cascades through the three dimensions from the shared list", () => {
    assert.match(mapModal, /RULE_DIMENSIONS\.map\(/);
    assert.ok(!/SELECTED_EMPLOYEES|mapping_type|Pick a type/i.test(mapModal));
  });

  it("every dimension offers All, which is a real choice and the default", () => {
    // "All" is not a placeholder: a dimension left alone narrows nothing.
    assert.match(mapModal, /<option value="">\{ANY_LABEL\}<\/option>/);
    assert.match(mapModal, /useState\(\{\}\)/, "the form starts with nothing narrowed");
  });

  it("takes its options from the PREVIEW, never from the master lists", () => {
    // Master lists offer combinations that match nobody, and an operator who
    // picks one reads a 0 and cannot tell a mistake from an empty outlet.
    assert.match(mapModal, /preview\.rule_options/);
    for (const hook of ["useOutlets", "useDesignations", "useDepartments"]) {
      assert.ok(!new RegExp(hook).test(mapModal), `${hook} must no longer be the source`);
    }
    assert.ok(!/API\.get|fetch\(/.test(mapModal), "no bespoke master fetching");
  });

  it("re-derives no membership rule of its own in the browser", () => {
    // One rule in this system. A second would disagree eventually, and the
    // screen would be showing a population the server does not.
    assert.ok(!/employedOn|date_of_joining|resignation_date/.test(mapModal));
    assert.ok(!/store_id ===|department_id ===|designation_id ===/.test(mapModal));
  });

  it("clears a downstream value the cascade stopped offering", () => {
    assert.match(mapModal, /pruneInvalidDimensions\(current, data\.rule_options/);
    assert.match(mapModal, /dimensionsWerePruned\(current, pruned\)/);
  });

  it("never asks anybody to type a numeric id", () => {
    assert.ok(!/type="number"/.test(mapModal));
    assert.match(mapModal, /<Select/, "dimensions are chosen from a list");
  });

  it("previews the population live, through the helper", () => {
    assert.match(mapModal, /previewTelegramGroupMapping/);
    assert.match(mapModal, /rulePayload\(form\)/);
  });

  it("re-previews when the RULE changes, and never merely on a keystroke", () => {
    // `search` is deliberately absent from the dependency list AND from the
    // request: the preview must always hold the rule's WHOLE population,
    // which is what makes the selection safe.
    assert.match(mapModal, /\[isOpen, telegramGroupId, form\]/);
    assert.ok(
      !/previewTelegramGroupMapping\([^)]*search/.test(mapModal),
      "search must not be sent - it would filter the population"
    );
  });

  it("drops a preview that arrived after the rule moved on", () => {
    // A slow response for an older rule must not overwrite the list for the
    // current one - the operator would tick people a different rule matched.
    assert.match(mapModal, /let ignore = false/);
    assert.match(mapModal, /if \(ignore\) return/);
  });

  it("measures the selection against the RULE's population, not the search", () => {
    assert.match(mapModal, /retainSelection\(current, data\.employees/);
    // The old bug, pinned as absent: pruning against the displayed rows.
    assert.ok(!/visible\.has\(id\)/.test(mapModal));
  });

  it("filters the table client-side, so search only changes what is shown", () => {
    assert.match(mapModal, /visibleEmployees\(population, search\)/);
    assert.match(mapModal, /const population = \(preview && preview\.employees\)/);
  });

  it("Select All applies to the displayed rows only", () => {
    assert.match(mapModal, /toggleAllShown\(current, shown\)/);
    assert.match(mapModal, /allShownSelected\(selected, shown\)/);
  });

  it("shows Employee ID as a column, before the name", () => {
    const headers = [...mapModal.matchAll(/<Th[^>]*>([^<{]+)<\/Th>/g)].map((m) => m[1].trim());
    assert.deepStrictEqual(headers, [
      "Employee ID",
      "Employee",
      "Outlet",
      "Department",
      "Designation",
      "Telegram",
    ]);
  });

  it("says the search box matches a name OR an employee ID", () => {
    assert.match(mapModal, /placeholder="Search by name or employee ID"/);
  });

  it("warns when the rule narrows nothing at all", () => {
    assert.match(mapModal, /narrowedCount\(form\) === 0/);
    assert.match(mapModal, /MAPPING_MESSAGES\.RULE_IS_ALL_EMPLOYEES/);
  });

  it("says an identical rule already exists BEFORE Save is pressed", () => {
    assert.match(mapModal, /preview\.duplicate_rule/);
    assert.match(mapModal, /MAPPING_MESSAGES\.DUPLICATE_RULE/);
  });

  it("offers the two actions, named apart, with what each one does", () => {
    assert.match(mapModal, /RULE_ACTION\.SAVE_RULE/);
    assert.match(mapModal, /RULE_ACTION\.ADD_SELECTED/);
    assert.match(mapModal, /MAPPING_MESSAGES\.SAVE_RULE_HELP/);
    assert.match(mapModal, /MAPPING_MESSAGES\.ADD_SELECTED_HELP/);
  });

  it("gates each action on its own helper, never on an ad-hoc condition", () => {
    assert.match(mapModal, /isDisabled=\{!canSaveRule\(/);
    assert.match(mapModal, /isDisabled=\{!canAddSelected\(selected\)/);
    assert.match(mapModal, /saveBlockedReason\(/);
    assert.match(mapModal, /addSelectedBlockedReason\(selected\)/);
  });

  it("shows the server's refusal verbatim", () => {
    assert.match(mapModal, /err\.message \|\| "Could not save the rule"/);
    assert.match(mapModal, /err\.message \|\| "Could not add the selected employees"/);
  });

  it("the selection can only contain people the preview returned", () => {
    // The preview is already narrowed to the branches this viewer may see,
    // and the server enforces the same scope again on the grant.
    assert.match(mapModal, /retainSelection\(/);
    assert.ok(!/prompt\(|Enter employee/i.test(mapModal), "no typed employee id");
  });

  it("renders only the six safe employee fields", () => {
    const forbidden = [
      "salary", "aadhaar", "bank", "mobile", "pan_number",
      "telegram_user_id", "telegram_chat_id", "telegram_username", "date_of_birth",
    ];
    for (const field of forbidden) {
      assert.ok(!new RegExp(field, "i").test(mapModal), `${field} must not be rendered`);
    }
    assert.match(mapModal, /telegram_connected/, "a boolean is all that is shown");
  });

  it("says out loud that neither action touches Telegram", () => {
    assert.match(mapModal, /Neither action adds anybody to, or removes anybody from, a Telegram group/);
  });
});

describe("View Employees", () => {
  it("has exactly the six safe columns", () => {
    const headers = [...employeesModal.matchAll(/headerName: "([^"]+)"/g)].map((m) => m[1]);
    assert.deepStrictEqual(headers, [
      "Employee ID",
      "Employee Name",
      "Outlet",
      "Designation",
      "Department",
      "Telegram Connected",
    ]);
  });

  it("renders NO sensitive field", () => {
    // WORD-BOUNDED. A bare /esi/i matches "Designation" and a bare /dob/i
    // would match nothing useful either - a substring scan here reports
    // failures that are about the regex rather than the screen, and a test
    // that cries wolf gets deleted rather than fixed.
    for (const forbidden of [
      "mobile",
      "contact_number",
      "telegram_username",
      "telegram_user_id",
      "chat_id",
      "aadhaar",
      "pan_no",
      "salary",
      "account_no",
      "esi_number",
      "pf_number",
      "permanent_address",
      "residential_address",
      "\\bdob\\b",
      "token_hash",
    ]) {
      assert.ok(
        !new RegExp(forbidden, "i").test(employeesModal),
        `View Employees must not render ${forbidden}`
      );
    }
  });

  it("names no sensitive word in a column header either", () => {
    const headers = [...employeesModal.matchAll(/headerName: "([^"]+)"/g)].map((m) => m[1].toLowerCase());
    for (const header of headers) {
      for (const word of ["mobile", "phone", "salary", "aadhaar", "pan", "bank", "address", "username"]) {
        assert.ok(!header.includes(word), `a column must not be headed "${header}"`);
      }
    }
  });

  it("states the count with its scope", () => {
    assert.match(employeesModal, /scopeSummary\(result\)/);
    assert.match(employeesModal, /countsScopeNotice\(result\)/);
  });

  it("uses the shared empty-state wording, which never overclaims", () => {
    assert.match(employeesModal, /emptyMatchedMessage\(result\)/);
    // The old branch, which asserted something about branches the caller
    // cannot see, is gone.
    assert.ok(!/None of the matched employees is in your branch scope/.test(employeesModal));
  });

  it("loads on demand, not with the page", () => {
    // The mapping list needs counts, which name nobody.
    assert.match(mapPage, /matched\.load\(mappingId\)/);
    assert.ok(!/useEffect\([^)]*matched\.load/.test(mapPage));
  });
});

describe("THE 3A UI STILL PERFORMS NO TELEGRAM ACTION, and 3C's is separate", () => {
  const screens = {
    "map.jsx": read("pages/master/telegram-groups/map.jsx"),
    "MapTelegramGroupEmployees.jsx": read("components/master/MapTelegramGroupEmployees.jsx"),
    "TelegramGroupMatchedEmployees.jsx": read("components/master/TelegramGroupMatchedEmployees.jsx"),
    "useTelegramGroupMappings.js": read("customHooks/useTelegramGroupMappings.js"),
    "util/telegramGroupMapping.js": read("util/telegramGroupMapping.js"),
  };

  it("offers no Join, Invite, Kick, Ban or Sync control", () => {
    // COMMENTS ARE STRIPPED, JSX TEXT IS NOT. The distinction matters both
    // ways: a button's label is JSX text and must be scanned, while these
    // files' own headers say IN PROSE that no invite or member control
    // exists - scanning those would fail on the documentation of the very
    // property being asserted.
    for (const [name, raw] of Object.entries(screens)) {
      const source = strip(raw);
      // PHASE 3C ADDED ONE THING TO THIS SCREEN and it is deliberately not
      // in this list: a managed-membership panel whose "Add Employee" makes
      // a group REQUIRED for somebody. It cannot put anybody in a Telegram
      // group - no bot can - and the panel says so. What must still be
      // absent is anything that claims to act on Telegram directly from a
      // configuration screen.
      for (const label of [
        "Join Group",
        "Invite",
        "Add to Group",
        "Remove from Group",
        "Kick",
        "Ban",
        "Sync Members",
        "Reconcile",
      ]) {
        assert.ok(
          !new RegExp(label.replace(/ /g, "\\s*"), "i").test(source),
          `${name} must not offer "${label}"`
        );
      }
    }
  });

  it("calls the configuration endpoints, plus Phase 3C's managed membership - and nothing else", () => {
    const calls = [...helper.matchAll(/API\.(get|post|put|delete)\(`?\/telegram-groups([^`)]*)/g)].map(
      (m) => `${m[1]} ${m[2]}`
    );
    for (const call of calls) {
      const allowed =
        /matched-employees/.test(call) ||
        // Phase 3C: managed membership under the Group Map, which is where
        // `manage_telegram_groups` lives. Still no invite, join, ban, kick
        // or sync endpoint anywhere on this surface.
        /\/membership/.test(call);
      assert.ok(
        !/invite|join|member(?!s\b)|ban|kick|sync/i.test(call) || allowed,
        `unexpected Telegram call: ${call}`
      );
      assert.ok(!/invite|join|ban|kick|sync/i.test(call), `unexpected Telegram action: ${call}`);
    }
    assert.match(helper, /getTelegramGroupMappings/);
    assert.match(helper, /addTelegramGroupMapping/);
    assert.match(helper, /deleteTelegramGroupMapping/);
    assert.match(helper, /getTelegramGroupMatchedEmployees/);
  });

  it("managed membership is the ONLY write Phase 3C added here, and it is group-scoped", () => {
    assert.match(helper, /grantTelegramGroupMembership/);
    assert.match(helper, /revokeTelegramGroupMembership/);
    // Both name a group in the path: there is no employee-scoped write that
    // could be reached from an employee screen under `employee_edit`.
    const grant = helper.slice(helper.indexOf("export const grantTelegramGroupMembership"));
    assert.match(grant.slice(0, 400), /\/telegram-groups\/\$\{id\}\/membership/);
  });

  it("sends no branch of its own to matched-employees", () => {
    const fn = helper.slice(helper.indexOf("getTelegramGroupMatchedEmployees"));
    assert.ok(!/store_id|store_ids|branch/.test(fn), "the server resolves the scope, not the client");
  });
});
