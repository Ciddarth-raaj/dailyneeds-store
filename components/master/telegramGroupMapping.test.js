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
const addModal = strip(read("components/master/AddTelegramGroupMapping.jsx"));
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
    "MAPPING_TYPE",
    "MAPPING_TYPES",
    "MAPPING_TYPE_LABEL",
    "TARGET_STATE",
    "TARGET_SELECTOR",
    "MAPPING_MESSAGES",
    "needsTarget",
    "mappingTypeLabel",
    "mappingTargetLabel",
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
    "canSubmitMapping",
    "mappingPayload",
  ];
  // eslint-disable-next-line no-new-func
  return new Function(`${cjs}\nreturn { ${names.join(", ")} };`)();
})();

/* =============================================================== rules */

describe("the four mapping types", () => {
  it("are exactly four, in the approved order", () => {
    assert.deepStrictEqual(rules.MAPPING_TYPES, [
      "ALL_EMPLOYEES",
      "OUTLET",
      "DESIGNATION",
      "DEPARTMENT",
    ]);
  });

  it("include no rule builder and no hand-picked employee list", () => {
    for (const forbidden of ["SELECTED_EMPLOYEES", "MANUAL", "ROLE", "USER", "STORE_MANAGER", "CATEGORY"]) {
      assert.ok(!rules.MAPPING_TYPES.includes(forbidden), `${forbidden} must not be offered`);
    }
  });

  it("ALL EMPLOYEES has no target selector; the other three do", () => {
    assert.strictEqual(rules.needsTarget("ALL_EMPLOYEES"), false);
    assert.strictEqual(rules.TARGET_SELECTOR.ALL_EMPLOYEES, null);
    assert.strictEqual(rules.needsTarget("OUTLET"), true);
    assert.strictEqual(rules.needsTarget("DESIGNATION"), true);
    assert.strictEqual(rules.needsTarget("DEPARTMENT"), true);
  });
});

describe("the submitted payload", () => {
  it("sends NO target for All Employees - the sentinel is the server's", () => {
    assert.deepStrictEqual(rules.mappingPayload({ mapping_type: "ALL_EMPLOYEES" }), {
      mapping_type: "ALL_EMPLOYEES",
    });
    assert.ok(!("target_id" in rules.mappingPayload({ mapping_type: "ALL_EMPLOYEES" })));
  });

  it("sends a numeric target for the other three", () => {
    assert.deepStrictEqual(rules.mappingPayload({ mapping_type: "OUTLET", target_id: "5" }), {
      mapping_type: "OUTLET",
      target_id: 5,
    });
  });

  it("will not submit an incomplete form", () => {
    assert.strictEqual(rules.canSubmitMapping({ mapping_type: "ALL_EMPLOYEES" }), true);
    assert.strictEqual(rules.canSubmitMapping({ mapping_type: "OUTLET" }), false);
    assert.strictEqual(rules.canSubmitMapping({ mapping_type: "OUTLET", target_id: "" }), false);
    assert.strictEqual(rules.canSubmitMapping({ mapping_type: "OUTLET", target_id: 0 }), false);
    assert.strictEqual(rules.canSubmitMapping({ mapping_type: "OUTLET", target_id: -3 }), false);
    assert.strictEqual(rules.canSubmitMapping({ mapping_type: "OUTLET", target_id: 5 }), true);
    assert.strictEqual(rules.canSubmitMapping({ mapping_type: "NONSENSE", target_id: 5 }), false);
    assert.strictEqual(rules.canSubmitMapping({}), false);
  });
});

describe("the three target states", () => {
  it("ACTIVE carries no warning", () => {
    const row = { mapping_type: "OUTLET", target_state: "ACTIVE", target_name: "ECR" };
    assert.strictEqual(rules.targetWarning(row), null);
    assert.strictEqual(rules.targetStatusLabel(row), "Active");
    assert.strictEqual(rules.targetIsBroken(row), false);
  });

  it("INACTIVE warns, and is not the same warning as MISSING", () => {
    const inactive = { mapping_type: "OUTLET", target_state: "INACTIVE", target_name: "ECR" };
    const missing = { mapping_type: "OUTLET", target_state: "MISSING", target_id: 14 };
    assert.strictEqual(rules.targetWarning(inactive), "Mapped target is inactive");
    assert.strictEqual(rules.targetWarning(missing), "Mapped target no longer exists");
    assert.notStrictEqual(rules.targetWarning(inactive), rules.targetWarning(missing));
    assert.strictEqual(rules.targetStatusLabel(inactive), "Inactive");
    assert.strictEqual(rules.targetStatusLabel(missing), "Missing");
  });

  it("A VALID MAPPING MATCHING NOBODY IS NOT BROKEN", () => {
    // The distinction the whole screen turns on: 0 is a count, not a fault.
    const row = {
      mapping_type: "OUTLET",
      target_state: "ACTIVE",
      target_name: "ECR",
      matched_employees: 0,
    };
    assert.strictEqual(rules.targetWarning(row), null);
    assert.strictEqual(rules.targetIsBroken(row), false);
  });

  it("prefers the server's own warning text over the local fallback", () => {
    const row = { target_state: "INACTIVE", target_warning: "Something the server said" };
    assert.strictEqual(rules.targetWarning(row), "Something the server said");
  });

  it("ALL_EMPLOYEES has no target to break", () => {
    const row = { mapping_type: "ALL_EMPLOYEES", target_state: "NOT_APPLICABLE" };
    assert.strictEqual(rules.targetWarning(row), null);
    assert.strictEqual(rules.targetStatusLabel(row), "—");
  });

  it("a MISSING target still shows its id, so somebody can work out which", () => {
    assert.strictEqual(
      rules.mappingTargetLabel({ mapping_type: "OUTLET", target_id: 14, target_name: null }),
      "Outlet #14"
    );
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

describe("the Registry gains Map as a fourth action", () => {
  it("lists View, Map, Edit and Delete", () => {
    assert.match(listPage, /label: "View"/);
    assert.match(listPage, /label: "Map"/);
    assert.match(listPage, /label: "Edit"/);
    assert.match(listPage, /label: "Delete"/);
  });

  it("points Map at the group it belongs to", () => {
    assert.match(listPage, /\/master\/telegram-groups\/map\?id=\$\{id\}/);
  });

  it("puts Map behind the VIEW key, with Edit and Delete still behind manage", () => {
    // Map is readable configuration; the write controls are inside it.
    const actionsBlock = listPage.slice(listPage.indexOf('const actions = ['), listPage.indexOf('return actions;'));
    const mapIndex = actionsBlock.indexOf('label: "Map"');
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
  it("the rule label is built from the type and target, not from any count", () => {
    // A manager sees "Outlet · ECR" even when ECR's staff are not theirs to
    // count. Configuration is not somebody's employees.
    assert.strictEqual(
      rules.mappingTargetLabel({ mapping_type: "OUTLET", target_name: "ECR", target_id: 5 }),
      "ECR"
    );
    assert.strictEqual(
      rules.mappingTargetLabel({ mapping_type: "ALL_EMPLOYEES" }),
      "All Employees"
    );
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

  it("has the approved mapping columns", () => {
    for (const header of ["Mapping Type", "Mapping To", "Status", "Actions"]) {
      assert.match(mapPage, new RegExp(`headerName: "${header}"`));
    }
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

describe("Add Mapping", () => {
  it("offers exactly the four types from the shared list", () => {
    assert.match(addModal, /MAPPING_TYPES\.map/);
    assert.ok(!/SELECTED_EMPLOYEES|employee_ids|Pick employees/i.test(addModal));
  });

  it("shows no target selector for All Employees", () => {
    assert.match(addModal, /needsTarget\(mappingType\) && \(/);
    assert.match(addModal, /mappingType === MAPPING_TYPE\.ALL_EMPLOYEES && \(/);
  });

  it("uses the existing master hooks rather than new endpoints", () => {
    assert.match(addModal, /useOutlets/);
    assert.match(addModal, /useDesignations/);
    assert.match(addModal, /useDepartments/);
    assert.ok(!/API\.get|fetch\(/.test(addModal), "no bespoke master fetching");
  });

  it("never asks anybody to type a numeric id", () => {
    assert.ok(!/type="number"/.test(addModal));
    assert.match(addModal, /<Select/, "targets are chosen from a list");
  });

  it("clears the target when the type changes", () => {
    // A designation id carried into an outlet field points at a different row.
    assert.match(addModal, /setMappingType\(value\);[\s\S]{0,200}setTargetId\(""\)/);
  });

  it("shows the server's validation message verbatim", () => {
    assert.match(addModal, /setError\(\(err && err\.message\)/);
  });

  it("cannot submit until the form is complete", () => {
    assert.match(addModal, /isDisabled=\{!ready \|\| submitting\}/);
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

describe("NO MEMBERSHIP ACTION EXISTS ANYWHERE IN THE 3A UI", () => {
  const screens = {
    "map.jsx": read("pages/master/telegram-groups/map.jsx"),
    "AddTelegramGroupMapping.jsx": read("components/master/AddTelegramGroupMapping.jsx"),
    "TelegramGroupMatchedEmployees.jsx": read("components/master/TelegramGroupMatchedEmployees.jsx"),
    "useTelegramGroupMappings.js": read("customHooks/useTelegramGroupMappings.js"),
    "util/telegramGroupMapping.js": read("util/telegramGroupMapping.js"),
  };

  it("offers no Join, Invite, Add Member, Remove Member or Sync control", () => {
    // COMMENTS ARE STRIPPED, JSX TEXT IS NOT. The distinction matters both
    // ways: a button's label is JSX text and must be scanned, while these
    // files' own headers say IN PROSE that no invite or member control
    // exists - scanning those would fail on the documentation of the very
    // property being asserted.
    for (const [name, raw] of Object.entries(screens)) {
      const source = strip(raw);
      for (const label of [
        "Join Group",
        "Invite",
        "Add Member",
        "Remove Member",
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

  it("calls only the four configuration endpoints", () => {
    const calls = [...helper.matchAll(/API\.(get|post|put|delete)\(`?\/telegram-groups([^`)]*)/g)].map(
      (m) => `${m[1]} ${m[2]}`
    );
    for (const call of calls) {
      assert.ok(
        !/invite|join|member(?!s\b)|ban|kick|sync/i.test(call) ||
          /matched-employees/.test(call),
        `unexpected Telegram call: ${call}`
      );
    }
    assert.match(helper, /getTelegramGroupMappings/);
    assert.match(helper, /addTelegramGroupMapping/);
    assert.match(helper, /deleteTelegramGroupMapping/);
    assert.match(helper, /getTelegramGroupMatchedEmployees/);
  });

  it("sends no branch of its own to matched-employees", () => {
    const fn = helper.slice(helper.indexOf("getTelegramGroupMatchedEmployees"));
    assert.ok(!/store_id|store_ids|branch/.test(fn), "the server resolves the scope, not the client");
  });
});
