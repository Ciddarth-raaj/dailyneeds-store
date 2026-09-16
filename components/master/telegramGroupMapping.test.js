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

describe("the global-vs-visible wording", () => {
  it("names both numbers when the viewer sees a subset", () => {
    const text = rules.scopeSummary({ total_matched: 34, visible_count: 12, scope_limited: true });
    assert.match(text, /34 employees match this mapping/);
    assert.match(text, /12 are visible in your branch scope/);
  });

  it("states the total even when nothing is hidden", () => {
    const text = rules.scopeSummary({ total_matched: 34, visible_count: 34, scope_limited: false });
    assert.match(text, /34 employees match this mapping/);
    assert.ok(!/visible in your branch scope/.test(text));
  });

  it("never implies the visible subset is the whole population", () => {
    const text = rules.scopeSummary({ total_matched: 34, visible_count: 0, scope_limited: true });
    assert.match(text, /34/, "the company-wide total must always be stated");
  });

  it("reads correctly for one employee", () => {
    assert.match(rules.scopeSummary({ total_matched: 1, visible_count: 1 }), /1 employee matches/);
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
    for (const header of ["Mapping Type", "Mapping To", "Matched Employees", "Status", "Actions"]) {
      assert.match(mapPage, new RegExp(`headerName: "${header}"`));
    }
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

  it("states the global total and the visible count", () => {
    assert.match(employeesModal, /scopeSummary\(result\)/);
  });

  it("distinguishes 'none match' from 'none visible to you'", () => {
    assert.match(employeesModal, /result\.total_matched > 0/);
    assert.match(employeesModal, /None of the matched employees is in your branch scope/);
    assert.match(employeesModal, /No currently employed staff match this mapping/);
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
