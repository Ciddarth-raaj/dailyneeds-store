/**
 * Telegram Group Registry screens.
 *
 *   node --test components/master/telegramGroupRegistry.test.js
 *
 * Two halves, the way `components/attendance/attendanceScreens.test.js` and
 * `util/attendanceRaw.test.js` are split:
 *
 *   the RULES in util/telegramGroup.js are executed - valid ids, positive
 *   ids, zero, letters, the derived type and the two warnings
 *
 *   the SCREENS are read as source, because no component renderer is wired
 *   up in this repo. What is defended there is the approved shape: no group
 *   type field, both warnings visible in the list, neither warning blocking
 *   a save, server-side search and category filter, and the permission keys
 *   on every screen.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const listPage = strip(read("pages/master/telegram-groups/index.jsx"));
const formPage = strip(read("pages/master/telegram-groups/[mode].jsx"));
const helper = strip(read("helper/telegramGroups.js"));
const listHook = strip(read("customHooks/useTelegramGroups.js"));
const menus = read("constants/menus.js");
const permissions = read("constants/permissions.js");

/* The rules module is ESM; evaluate its exports without a bundler. */
const rulesSource = read("util/telegramGroup.js");
const rules = (() => {
  const cjs = rulesSource
    .replace(/export const /g, "const ")
    .replace(/export function /g, "function ");
  const names = [
    "TELEGRAM_GROUP_CATEGORIES",
    "GROUP_TYPE",
    "TELEGRAM_GROUP_MESSAGES",
    "isValidGroupChatId",
    "deriveGroupType",
    "isBasicGroup",
    "chatIdError",
    "telegramGroupWarnings",
    "displayOutlet",
    "rowStatus",
    "STATUS_OPTIONS",
    "BOT_ADMIN_OPTIONS",
    "OUTLET_FILTER_NONE",
  ];
  // eslint-disable-next-line no-new-func
  return new Function(`${cjs}\nreturn { ${names.join(", ")} };`)();
})();

const SUPERGROUP = "-1001234567890";
const BASIC = "-4800060153";

/* ==================================================== the Chat ID rules == */

test("a -100… Chat ID is valid and shows as a Supergroup", () => {
  assert.strictEqual(rules.isValidGroupChatId(SUPERGROUP), true);
  assert.strictEqual(rules.deriveGroupType(SUPERGROUP), rules.GROUP_TYPE.SUPERGROUP);
  assert.strictEqual(rules.chatIdError(SUPERGROUP), null);
});

test("another negative Chat ID is valid and shows as a Basic Group", () => {
  assert.strictEqual(rules.isValidGroupChatId(BASIC), true);
  assert.strictEqual(rules.deriveGroupType(BASIC), rules.GROUP_TYPE.BASIC_GROUP);
  assert.strictEqual(rules.chatIdError(BASIC), null);
});

test("a POSITIVE Chat ID is refused, and told it is an individual user", () => {
  for (const positive of ["1234567890", "+1234567890", "1"]) {
    assert.strictEqual(rules.isValidGroupChatId(positive), false, positive);
    assert.strictEqual(rules.chatIdError(positive), rules.TELEGRAM_GROUP_MESSAGES.CHAT_ID_POSITIVE);
  }
  assert.match(rules.TELEGRAM_GROUP_MESSAGES.CHAT_ID_POSITIVE, /individual user, not a group/);
});

test("zero is refused, signed or not", () => {
  for (const zero of ["0", "-0", "-000", "+0"]) {
    assert.strictEqual(rules.isValidGroupChatId(zero), false, zero);
    assert.notStrictEqual(rules.chatIdError(zero), null, zero);
  }
});

test("letters, mixed strings, spaces and decimals are refused", () => {
  for (const bad of ["abc", "-100abc", "chat-100123", "-100 123", "-1001234.5", "-1.5", "-", ""]) {
    assert.strictEqual(rules.isValidGroupChatId(bad), false, bad);
    assert.notStrictEqual(rules.chatIdError(bad), null, bad);
  }
  assert.strictEqual(rules.deriveGroupType("-100abc"), null, "no confident type for rubbish");
});

test("LEADING OR TRAILING WHITESPACE IS REFUSED - never trimmed into a valid id", () => {
  // The approved rule is `^-\d+$` applied to the value as typed. Trimming
  // first would accept a string the rule refuses, and the form would then
  // disagree with the server, which refuses the padded value.
  for (const padded of [
    " -1001234567890",
    "-1001234567890 ",
    " -1001234567890 ",
    "\t-1001234567890",
    "-1001234567890\n",
    " -4800060153 ",
  ]) {
    assert.strictEqual(rules.isValidGroupChatId(padded), false, JSON.stringify(padded));
    assert.strictEqual(
      rules.chatIdError(padded),
      rules.TELEGRAM_GROUP_MESSAGES.CHAT_ID_FORMAT,
      JSON.stringify(padded)
    );
    assert.strictEqual(rules.deriveGroupType(padded), null, "no type is derived for a padded id");
  }
});

test("whitespace INSIDE the id is refused", () => {
  for (const spaced of ["-100 1234567890", "-100\t1234567890"]) {
    assert.strictEqual(rules.isValidGroupChatId(spaced), false, spaced);
    assert.strictEqual(rules.chatIdError(spaced), rules.TELEGRAM_GROUP_MESSAGES.CHAT_ID_FORMAT);
  }
});

test("a whitespace-only Chat ID is malformed, not missing", () => {
  assert.strictEqual(rules.chatIdError("   "), rules.TELEGRAM_GROUP_MESSAGES.CHAT_ID_FORMAT);
});

test("a padded Chat ID keeps Save disabled, because the button asks the same rule", () => {
  assert.match(formPage, /isDisabled=\{[^}]*isValidGroupChatId\(values\.chat_id\)/);
  assert.strictEqual(rules.isValidGroupChatId(" -1001234567890 "), false);
});

test("THE CHAT ID IS SENT EXACTLY AS VALIDATED - the form does not trim it", () => {
  assert.match(formPage, /chat_id: String\(values\.chat_id\),/);
  assert.ok(
    !/chat_id: String\(values\.chat_id\)\.trim\(\)/.test(formPage),
    "trimming here would repair a value the rule refuses"
  );
});

test("the rules module never trims a Chat ID", () => {
  // Cheap guard against the trim coming back: the shared `text` helper feeds
  // every Chat ID check, and a `.trim()` on it would re-open the whole gap.
  assert.ok(
    !/const text = \(value\)[^;]*\.trim\(\)/.test(rulesSource),
    "the Chat ID helper must not trim"
  );
});

test("an empty Chat ID asks for one rather than calling it malformed", () => {
  assert.strictEqual(rules.chatIdError(""), rules.TELEGRAM_GROUP_MESSAGES.CHAT_ID_REQUIRED);
  assert.strictEqual(rules.chatIdError(null), rules.TELEGRAM_GROUP_MESSAGES.CHAT_ID_REQUIRED);
});

/* ======================================================== category ======= */

test("the approved categories, and only those, are offered", () => {
  // Display order, which is deliberately not the schema's: the ENUM appends
  // Marketing last (appending rewrites no row), while "Other" reads last in
  // a dropdown. The backend compares the two as a set.
  assert.deepStrictEqual(rules.TELEGRAM_GROUP_CATEGORIES, [
    "Attendance",
    "Maintenance",
    "HR",
    "Marketing",
    "Other",
  ]);
});

test("the form offers the categories from the shared list, never a typed-in one", () => {
  assert.match(formPage, /TELEGRAM_GROUP_CATEGORIES\.map/);
  assert.match(formPage, /method="switch"[\s\S]{0,120}values=\{categoryOptions\}/);
  assert.match(formPage, /\.oneOf\(TELEGRAM_GROUP_CATEGORIES/);
});

/* ======================================================== warnings ======= */

test("a Basic Group carries the conversion warning", () => {
  const warnings = rules.telegramGroupWarnings({ chat_id: BASIC, bot_is_admin: true });
  assert.deepStrictEqual(warnings, [rules.TELEGRAM_GROUP_MESSAGES.BASIC_GROUP_WARNING]);
  assert.match(rules.TELEGRAM_GROUP_MESSAGES.BASIC_GROUP_WARNING, /converted to a Supergroup/);
});

test("a Supergroup with an admin bot carries no warning", () => {
  assert.deepStrictEqual(rules.telegramGroupWarnings({ chat_id: SUPERGROUP, bot_is_admin: true }), []);
});

test("a bot that is not an admin is flagged, whatever the group type", () => {
  assert.ok(
    rules
      .telegramGroupWarnings({ chat_id: SUPERGROUP, bot_is_admin: false })
      .includes(rules.TELEGRAM_GROUP_MESSAGES.BOT_NOT_ADMIN_WARNING)
  );
  assert.strictEqual(rules.telegramGroupWarnings({ chat_id: BASIC, bot_is_admin: false }).length, 2);
  assert.match(
    rules.TELEGRAM_GROUP_MESSAGES.BOT_NOT_ADMIN_WARNING,
    /Member-removal functionality will not work/
  );
});

test("NEITHER WARNING BLOCKS SAVING - only an invalid Chat ID disables the button", () => {
  // The whole point of both warnings: the rows are legitimate and must be
  // recordable. A disabled Save on a Basic Group would make the registry
  // unable to record the groups it exists to document.
  const disabled = /isDisabled=\{[^}]*\}/.exec(formPage);
  assert.ok(disabled, "the submit button has an isDisabled expression");
  assert.match(disabled[0], /isValidGroupChatId\(values\.chat_id\)/);
  assert.ok(!/isDisabled[^}]*BASIC_GROUP|isDisabled[^}]*bot_is_admin/.test(formPage));
  assert.match(formPage, /You can still save it/);
});

/* ================================================ the derived group type = */

test("GROUP TYPE IS NEVER A FIELD - it is derived from the Chat ID", () => {
  assert.ok(!/name="group_type"/.test(formPage), "no group type input");
  assert.ok(!/label="Group Type/.test(formPage), "no group type label on an input");
  assert.match(formPage, /deriveGroupType\(chatId\)/);
  assert.match(formPage, /derived from the Chat ID - nothing to choose/);
  // And it is never sent to the server.
  assert.ok(!/group_type:/.test(formPage));
});

test("the list derives the type too, rather than trusting a stored column", () => {
  assert.match(listPage, /row\.group_type \|\| deriveGroupType\(row\.chat_id\)/);
});

/* ==================================================== the registry list == */

test("the list shows every approved column", () => {
  for (const [field, header] of [
    ["group_name", "Group Name"],
    ["chat_id", "Chat ID"],
    ["group_type", "Type"],
    ["category", "Category"],
    ["used_for", "Used For"],
    ["outlet_name", "Outlet"],
    ["bot_is_admin", "Bot Admin"],
    ["actions", "Actions"],
  ]) {
    assert.match(listPage, new RegExp(`field: "${field}"`), field);
    assert.match(listPage, new RegExp(`headerName: "${header}"`), header);
  }
});

test("the list offers View, Edit and Delete, and Delete asks first", () => {
  assert.match(listPage, /label: "View"/);
  assert.match(listPage, /label: "Edit"/);
  assert.match(listPage, /label: "Delete"/);
  assert.match(listPage, /useConfirmDelete/);
  assert.match(listPage, /confirmDelete\(\{/);
  assert.match(listPage, /<ConfirmDeleteDialog \/>/);
});

test("Edit and Delete are hidden without the manage key, View is not", () => {
  assert.match(listPage, /usePermissions\(\["manage_telegram_groups"\]\)/);
  assert.match(listPage, /if \(canManage\) \{\s*actions\.push\(/);
});

test("A BOT THAT IS NOT AN ADMIN IS OBVIOUS IN THE LIST, not only on the view screen", () => {
  assert.match(listPage, /colorScheme="red">[\s\S]{0,120}No/);
  assert.match(listPage, /BOT_NOT_ADMIN_WARNING/);
  assert.match(listPage, /notAdminCount/);
  assert.match(listPage, /fa-triangle-exclamation/);
});

test("Basic Groups are flagged in the list as well", () => {
  assert.match(listPage, /basicGroupCount/);
  assert.match(listPage, /BASIC_GROUP_WARNING/);
});

test("a group with no outlet reads as All Outlets, never as a blank cell", () => {
  assert.strictEqual(rules.displayOutlet({ outlet_name: null }), "All Outlets");
  assert.strictEqual(rules.displayOutlet({ outlet_name: "Peelamedu" }), "Peelamedu");
  assert.match(listPage, /displayOutlet\(params\.data\)/);
});

test("search and the category filter are SERVER-SIDE and debounced", () => {
  assert.match(listPage, /useDebounce\(search, \d+\)/);
  assert.match(listPage, /useTelegramGroups\(\{\s*search: debouncedSearch,\s*category,/);
  assert.match(listHook, /if \(search\) params\.search = search;/);
  assert.match(listHook, /if \(category\) params\.category = category;/);
});

test("the list uses the project's grid rather than a hand-rolled table", () => {
  assert.match(listPage, /import AgGrid from/);
  assert.match(listPage, /tableKey="telegram-group-registry"/);
  assert.ok(!/<table/.test(listPage));
});

/* ====================================================== the view screen == */

test("the view screen shows every field and both warnings", () => {
  assert.match(formPage, /viewMode = mode === "view"/);
  for (const field of ["group_name", "chat_id", "category", "used_for", "outlet_id", "bot_is_admin"]) {
    assert.match(formPage, new RegExp(`name="${field}"`), field);
  }
  assert.match(formPage, /<GroupTypeNotice chatId=\{values\.chat_id\} botIsAdmin=\{values\.bot_is_admin\}/);
  assert.match(formPage, /editable=\{!viewMode\}/);
});

/* ======================================================= the outlet ====== */

test("the outlet comes from the shared outlet directory and is optional", () => {
  assert.match(formPage, /useOutlets\(\{ directory: true \}\)/);
  assert.match(formPage, /All Outlets \(no specific outlet\)/);
  assert.match(formPage, /outlet_id: values\.outlet_id === "" \? null : Number\(values\.outlet_id\)/);
  // No second copy of outlet data anywhere on these screens.
  assert.ok(!/outlets\s*=\s*\[/.test(formPage));
});

/* ======================================================= permissions ===== */

test("every screen names a permission, and the write screens name the manage key", () => {
  assert.match(listPage, /permissionKey=\{\["view_telegram_groups"\]\}/);
  assert.match(formPage, /permissionKey=\{viewMode \? \["view_telegram_groups"\] : \["manage_telegram_groups"\]\}/);
});

test("the keys are in the permission matrix and the menu, so they can be granted and reached", () => {
  assert.match(permissions, /view_telegram_groups: "View Telegram Group Registry"/);
  assert.match(permissions, /manage_telegram_groups: "Manage Telegram Group Registry"/);
  assert.match(menus, /permission: "view_telegram_groups"/);
  assert.match(menus, /location: "\/master\/telegram-groups"/);
});

/* ============================================================ the API ==== */

test("the helper speaks to /telegram-groups and keeps the server's own message", () => {
  assert.match(helper, /API\.get\("\/telegram-groups"/);
  assert.match(helper, /API\.post\("\/telegram-groups"/);
  assert.match(helper, /API\.put\(`\/telegram-groups\/\$\{id\}`/);
  assert.match(helper, /API\.delete\(`\/telegram-groups\/\$\{id\}`/);
  assert.match(helper, /res && res\.data && res\.data\.msg/);
});

test("a duplicate Chat ID is shown as the server worded it, not as a generic failure", () => {
  assert.match(formPage, /setServerError\(message\)/);
  assert.match(formPage, /err\?\.message \|\| "Could not save the Telegram group"/);
});

/* ==================================================== scope control ====== */

test("these screens do not reach into member management or invite links", () => {
  // Scope control, and it is about CAPABILITY, not vocabulary. The approved
  // warnings say the words "invite-link" and "member-removal" out loud -
  // that is the whole point of them - so matching on the words flagged the
  // guidance banner that exists to set expectations. What must be absent is
  // any call that could actually do those things.
  for (const page of [listPage, formPage, helper]) {
    for (const capability of [
      "kickChatMember",
      "banChatMember",
      "unbanChatMember",
      "removeMember",
      "createChatInviteLink",
      "exportChatInviteLink",
      "api.telegram.org",
    ]) {
      assert.ok(!page.includes(capability), `${capability} must not appear`);
    }
  }
  // And the helper talks to this registry's endpoints and nothing else.
  const endpoints = [...helper.matchAll(/API\.\w+\(`?"?([^`",)]+)/g)].map((m) => m[1]);
  for (const endpoint of endpoints) {
    assert.ok(endpoint.startsWith("/telegram-groups"), `unexpected endpoint ${endpoint}`);
  }
});


/* ============================================ status, filters, guidance == */

test("the Status column has THREE states, and a warning row says so", () => {
  // The third state is the point: an active group carrying a warning must be
  // visible in the list without opening anything.
  assert.strictEqual(
    rules.rowStatus({ is_active: true, bot_is_admin: true, chat_id: SUPERGROUP }).label,
    "Active"
  );
  assert.strictEqual(
    rules.rowStatus({ is_active: true, bot_is_admin: false, chat_id: SUPERGROUP }).label,
    "Warning"
  );
  assert.strictEqual(
    rules.rowStatus({ is_active: true, bot_is_admin: true, chat_id: BASIC }).label,
    "Warning"
  );
});

test("Inactive WINS over a warning - a retired group is not a problem to chase", () => {
  assert.strictEqual(
    rules.rowStatus({ is_active: false, bot_is_admin: false, chat_id: BASIC }).label,
    "Inactive"
  );
});

test("a row with no is_active (an older response) reads as Active, not Inactive", () => {
  // Defensive: the column defaults to 1 in the database, so absent must not
  // render as retired.
  assert.strictEqual(rules.rowStatus({ bot_is_admin: true, chat_id: SUPERGROUP }).label, "Active");
});

test("the list shows a Status column and derives it from rowStatus", () => {
  assert.match(listPage, /field: "status"/);
  assert.match(listPage, /headerName: "Status"/);
  assert.match(listPage, /rowStatus\(params\.data\)/);
});

test("the list offers the Outlet, Bot Admin and Status filters, and a Reset", () => {
  for (const label of ["Search", "Category", "Outlet", "Bot Admin", "Status"]) {
    assert.match(listPage, new RegExp(`<FormLabel fontSize="sm">${label}</FormLabel>`), label);
  }
  assert.match(listPage, /resetFilters/);
  assert.match(listPage, /isDisabled=\{!filtersApplied\}/);
});

test("the new filters are SERVER-SIDE, like search and category", () => {
  assert.match(listPage, /outlet_id: outletId/);
  assert.match(listPage, /bot_is_admin: botIsAdmin/);
  assert.match(listPage, /is_active: status/);
  assert.match(listHook, /if \(outlet_id\) params\.outlet_id = outlet_id;/);
  assert.match(listHook, /if \(bot_is_admin\) params\.bot_is_admin = bot_is_admin;/);
  assert.match(listHook, /if \(is_active\) params\.is_active = is_active;/);
  assert.match(listHook, /\[search, category, outlet_id, bot_is_admin, is_active\]/);
});

test("the outlet filter can ask for the groups that belong to no outlet", () => {
  assert.strictEqual(rules.OUTLET_FILTER_NONE, "none");
  assert.match(listPage, /value=\{OUTLET_FILTER_NONE\}/);
});

test("the list carries the Chat ID and Basic Group guidance banners", () => {
  assert.match(listPage, /Chat ID format/);
  assert.match(listPage, /negative numbers/);
  assert.match(listPage, /Basic Groups/);
});

test("the form has a Status field defaulting to Active", () => {
  assert.match(formPage, /name="is_active"/);
  assert.match(formPage, /values=\{STATUS_OPTIONS\}/);
  assert.match(formPage, /is_active: "Active"/);
  assert.match(formPage, /\.oneOf\(\["Active", "Inactive"\]\)/);
});

test("Status is sent as a boolean, and read back from one", () => {
  assert.match(formPage, /is_active: values\.is_active === "Active"/);
  assert.match(formPage, /group\.is_active === false \? "Inactive" : "Active"/);
});

test("the form shows the guidance panel while editing, and not on the read-only view", () => {
  assert.match(formPage, /function GuidancePanel\(\)/);
  assert.match(formPage, /\{!viewMode \? <GuidancePanel \/> : null\}/);
  assert.match(formPage, /Chat ID guidelines/);
  assert.match(formPage, /Bot admin requirement/);
  assert.match(formPage, /How to get the Chat ID/);
});

test("STATUS IS NOT THE BOT-ADMIN FLAG - they are separate fields", () => {
  assert.match(formPage, /name="bot_is_admin"/);
  assert.match(formPage, /name="is_active"/);
  assert.notStrictEqual(
    rules.rowStatus({ is_active: true, bot_is_admin: false, chat_id: SUPERGROUP }).label,
    "Inactive"
  );
});
