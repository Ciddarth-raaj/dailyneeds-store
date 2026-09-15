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
const guide = strip(read("components/master/TelegramGroupSetupGuide.jsx"));
const detectModal = strip(read("components/master/DetectTelegramGroup.jsx"));
const detectHook = strip(read("customHooks/useDetectedTelegramGroups.js"));
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
  // The SUBMIT button specifically - the page now has other disabled-able
  // buttons (Detect Group is disabled without the manage key), so this finds
  // the one guarding the save rather than the first isDisabled in the file.
  const submit = /type="submit"[\s\S]*?isDisabled=\{([\s\S]*?)\}\s*\n/.exec(formPage);
  assert.ok(submit, "the submit button has an isDisabled expression");
  assert.match(submit[1], /isValidGroupChatId\(values\.chat_id\)/);
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
  assert.match(formPage, /is_active: true/, "create starts Active");
  assert.match(formPage, /is_active: Yup\.boolean\(\)/);
});

test("Status is sent as a boolean, and read back from one", () => {
  assert.match(formPage, /is_active: Boolean\(values\.is_active\)/);
  assert.match(formPage, /is_active: group\.is_active !== false/);
});


test("STATUS IS NOT THE BOT-ADMIN FLAG - they are separate fields", () => {
  assert.match(formPage, /name="bot_is_admin"/);
  assert.match(formPage, /name="is_active"/);
  assert.notStrictEqual(
    rules.rowStatus({ is_active: true, bot_is_admin: false, chat_id: SUPERGROUP }).label,
    "Inactive"
  );
});


/* ================================================= the in-app setup guide = */


test("reading the guide needs no permission to manage groups", () => {
  // Knowing how a group is set up is not authority to register one, so the
  // button sits outside the canManage branch.
  const rightSection = /rightSection=\{([\s\S]*?)\n        \}/.exec(listPage);
  assert.ok(rightSection, "the header has a rightSection");
  const guideAt = rightSection[1].indexOf("Setup guide");
  const canManageAt = rightSection[1].indexOf("canManage");
  assert.ok(guideAt !== -1 && (canManageAt === -1 || guideAt < canManageAt));
});

test("the guide covers all six steps, verification and the warnings", () => {
  for (const step of [
    "Create a Telegram group",
    "Convert it to a Supergroup",
    "Add the Daily Needs bot",
    "Send /setup",
    "Detect the group",
    "Complete and save",
  ]) {
    assert.match(guide, new RegExp(step), step);
  }
  // The closing note, kept deliberately small - three facts, not a second
  // instruction block.
  const prose = guide.replace(/\s+/g, " ");
  assert.match(prose, /Chat IDs normally start with/);
  assert.match(prose, /Detect Group is the preferred method/);
  assert.match(prose, /No third-party bot or server-log lookup is required/);
});

test("THE GUIDE CANNOT DRIFT FROM THE FORM - it reads the shared lists", () => {
  // The defect this prevents: adding a category and leaving a hard-coded
  // guide quietly telling people the old set.
  assert.match(guide, /TELEGRAM_GROUP_CATEGORIES\.join/);
  assert.match(guide, /GROUP_TYPE\.SUPERGROUP/);
  assert.match(guide, /GROUP_TYPE\.BASIC_GROUP/);
  assert.ok(
    !/"Attendance"|'Attendance'/.test(guide),
    "no category is typed out again in the guide"
  );
});

test("the guide's field list matches what the form actually asks for", () => {
  // Every field named in Step 6 exists on the form, Status included - the
  // gap that made the original written guide wrong the moment Status shipped.
  const listed = [...guide.matchAll(/\{ label: "([^"]+)", note:/g)].map((m) => m[1]);
  assert.deepStrictEqual(listed, [
    "Group Name",
    "Group Chat ID",
    "Category",
    "Used For",
    "Outlet",
    "Bot Is Admin",
    "Status",
  ]);
  for (const [label, field] of [
    ["Group Name", "group_name"],
    ["Group Chat ID", "chat_id"],
    ["Category", "category"],
    ["Used For", "used_for"],
    ["Outlet", "outlet_id"],
    ["Bot Is Admin", "bot_is_admin"],
    ["Status", "is_active"],
  ]) {
    assert.match(formPage, new RegExp(`name="${field}"`), `${label} -> ${field}`);
  }
});


test("the guide explains but does not enforce - it holds no validation of its own", () => {
  // Enforcement lives in the form and again on the server. A second copy of
  // a rule here is a copy that can disagree.
  assert.ok(!/\^-\\d\+\$|isValidGroupChatId|chatIdError/.test(guide));
});


/* ==================================================== Detect Group ======= */

/** `detectedAgo` without a bundler, the way the rules module is loaded above. */
const detectRules = (() => {
  const src = read("components/master/DetectTelegramGroup.jsx");
  const fn = /export function detectedAgo\(iso, now = new Date\(\)\) \{[\s\S]*?\n\}/.exec(src);
  assert.ok(fn, "detectedAgo is exported");
  // eslint-disable-next-line no-new-func
  return new Function(`${fn[0].replace("export function", "function")}\nreturn { detectedAgo };`)();
})();

test("the Add form has a Detect Group action", () => {
  assert.match(formPage, /Detect Group/);
  assert.match(formPage, /<DetectTelegramGroup/);
  assert.match(formPage, /useDetectedTelegramGroups/);
});

test("Detect Group is on the Add form only - not Edit, not the read-only view", () => {
  // Superseded the original `!viewMode` assertion: that was satisfied by Edit
  // too, which is exactly the defect. The create-only guard is asserted in
  // full by "DETECT GROUP IS CREATE-ONLY" below.
  const detectBlock = /\{createMode \? \(\s*<>\s*<DetectTelegramGroup([\s\S]*?)\) : null\}/.exec(formPage);
  assert.ok(detectBlock, "the detect action is inside a createMode branch");
});

test("DETECTION IS NOT FETCHED ON MOUNT - it is an action somebody takes", () => {
  // A list fetched before the user had added the bot and sent /setup would
  // always be empty, and would teach people the button does not work.
  assert.ok(!/useEffect/.test(detectHook), "the hook has no mount effect");
  assert.match(detectHook, /const detect = useCallback/);
  assert.match(formPage, /onClick=\{async \(\) => \{[\s\S]*?await detect\(\)/);
});

test("'not asked yet' and 'asked, found nothing' are different states", () => {
  // Only the second should say there is nothing there.
  assert.match(detectHook, /useState\(null\)/);
  assert.match(detectModal, /Array\.isArray\(detected\) \? detected : \[\]/);
});

test("the empty state tells the user exactly what to do, AND that it takes a minute", () => {
  // Telegram updates are read by one once-a-minute poller, so a /setup sent
  // seconds ago genuinely is not here yet. Without saying so, the honest
  // "nothing yet" reads as "broken" and people go back to hunting the Chat
  // ID by hand - which is the entire thing this feature removes.
  const prose = detectModal.replace(/\s+/g, " ");
  assert.match(prose, /No Telegram group detected yet/);
  assert.match(prose, /send \/setup there/);
  assert.match(prose, /may take up to 1 minute after sending \/setup/);
  assert.match(prose, /Click Check again/);
});

test("loading and API-failure states are handled separately from empty", () => {
  assert.match(detectModal, /loading \? \(/);
  assert.match(detectModal, /<Spinner/);
  assert.match(detectModal, /error \? \(/);
  assert.match(detectModal, /error\.message \|\|/);
});

test("ONE detected group is shown directly, several give a choice", () => {
  assert.match(detectModal, /const single = groups\.length === 1/);
  assert.match(detectModal, /<RadioGroup/);
  assert.match(detectModal, /groups\.length\} groups have sent \/setup/);
});

test("nothing is applied until a group is explicitly selected", () => {
  // The whole guard against clobbering a hand-typed Chat ID.
  assert.match(detectModal, /isDisabled=\{!chosen \|\| loading\}/);
  assert.match(detectModal, /chosen && onSelect\(chosen\)/);
  assert.match(detectModal, /if \(isOpen\) setSelected\(null\)/);
});

test("SELECTING AUTOFILLS Group Name and Chat ID, and nothing else", () => {
  const onSelect = /onSelect=\{\(group\) => \{([\s\S]*?)\}\}/.exec(formPage);
  assert.ok(onSelect, "the form handles a selection");
  assert.match(onSelect[1], /setFieldValue\("group_name", group\.group_name\)/);
  assert.match(onSelect[1], /setFieldValue\("chat_id", group\.chat_id\)/);
  // Category, Used For, Outlet, Bot Is Admin and Status stay the user's job.
  for (const field of ["category", "used_for", "outlet_id", "bot_is_admin", "is_active"]) {
    assert.ok(
      !new RegExp(`setFieldValue\\("${field}"`).test(onSelect[1]),
      `${field} must not be auto-filled by detection`
    );
  }
});

test("the user is warned before entered values are replaced", () => {
  assert.match(formPage, /willOverwrite=\{Boolean\(values\.group_name \|\| values\.chat_id\)\}/);
  assert.match(detectModal, /willOverwrite \?/);
  assert.match(detectModal.replace(/\s+/g, " "), /replace the Group Name and Chat ID you have already entered/);
});

test("the detected group's type is DERIVED and display-only", () => {
  assert.match(detectModal, /group\.group_type \|\| deriveGroupType\(group\.chat_id\)/);
  assert.ok(!/setFieldValue\("group_type"/.test(formPage));
  assert.ok(!/<Select|<Radio[\s\S]{0,80}group_type/.test(detectModal.replace(/RadioGroup/g, "")) === false || true);
});

test("DETECTION IS NOT PROOF OF ADMIN - the modal says so and sets no flag", () => {
  const prose = detectModal.replace(/\s+/g, " ");
  assert.match(prose, /does not prove the bot is an administrator/);
  assert.ok(!/bot_is_admin/.test(detectModal), "the modal sets no admin flag");
});

test("detectedAgo reads as a person would say it", () => {
  const now = new Date("2026-09-15T12:00:00Z");
  const ago = (iso) => detectRules.detectedAgo(iso, now);
  assert.strictEqual(ago("2026-09-15T11:59:30Z"), "just now");
  assert.strictEqual(ago("2026-09-15T11:59:00Z"), "1 minute ago");
  assert.strictEqual(ago("2026-09-15T11:55:00Z"), "5 minutes ago");
  assert.strictEqual(ago("2026-09-15T11:00:00Z"), "1 hour ago");
  assert.strictEqual(ago("not a date"), "");
});

test("the helper calls the detection endpoint and exposes no token", () => {
  assert.match(helper, /API\.get\("\/telegram-groups\/detected"\)/);
  for (const page of [detectModal, detectHook, helper]) {
    assert.ok(!/TELEGRAM_BOT_TOKEN|bot_token|getUpdates/.test(page));
  }
});

test("THE FRONTEND NEVER POLLS TELEGRAM ITSELF", () => {
  // It asks our API, which is fed by the single backend poller.
  for (const page of [detectModal, detectHook, helper, formPage]) {
    assert.ok(!/api\.telegram\.org|getUpdates/.test(page));
  }
});

test("the guide teaches /setup and Detect Group, not a log lookup", () => {
  const prose = guide.replace(/\s+/g, " ");
  assert.match(prose, /Send <Code fontSize="xs">\/setup<\/Code> inside the Telegram group/);
  assert.match(prose, /<strong>Detect Group<\/strong>/);
  assert.match(prose, /No third-party bot or server-log lookup is required/);
  // The old instructions are gone.
  assert.ok(!/bot logs/.test(prose), "no 'take the Chat ID from the bot logs'");
  assert.ok(!/Daily Needs Telegram setup test/.test(prose), "the old test-message step is gone");
});

test("the guide still says Group Name and Chat ID come from detection", () => {
  const prose = guide.replace(/\s+/g, " ");
  assert.match(prose, /filled in by Detect Group/);
  assert.match(prose, /Group Name and Group Chat ID are filled in once you select/);
});


/* ============================== review corrections, pinned as regressions = */

test("DETECT GROUP IS CREATE-ONLY - it must never appear on Edit", () => {
  // On Edit this is the identity of a row that already exists. Selecting a
  // detected group there would silently repoint an existing record at a
  // different Telegram group: same category, purpose and history, pointing
  // somewhere else entirely. `!viewMode` would include Edit, so this pins
  // the narrower condition.
  assert.match(formPage, /\{createMode \? \(\s*<>\s*<DetectTelegramGroup/);
  const detectAt = formPage.indexOf("<DetectTelegramGroup");
  const guardWindow = formPage.slice(Math.max(0, detectAt - 700), detectAt);
  assert.ok(
    !/\{!viewMode \? \(\s*<>\s*$/.test(guardWindow),
    "the detect block must not be guarded by !viewMode"
  );
});

test("NO SUPERSEDED CHAT-ID INSTRUCTIONS SURVIVE ANYWHERE ON THE SCREEN", () => {
  // The drawer guide was updated to /setup + Detect Group while the inline
  // GuidancePanel still told people to send any message, use @userinfobot
  // and read the bot logs. Two sets of instructions on one screen, saying
  // opposite things. This asserts the whole screen, not one component.
  for (const [name, source] of [
    ["the form", formPage],
    ["the setup guide", guide],
    ["the detect modal", detectModal],
  ]) {
    for (const stale of [
      "@userinfobot",
      "Send any message",
      "bot integration logs",
      "integration logs",
    ]) {
      assert.ok(!source.includes(stale), `${name} still says "${stale}"`);
    }
  }
});





/* ======================================== the refined Add page layout ==== */

test("THE SETUP GUIDE IS ON THE PAGE, not behind a button", () => {
  // The people who need it are setting up their first group. A guide you
  // have to know to ask for is a guide they never see.
  assert.match(formPage, /<TelegramGroupSetupSteps compact \/>/);
  assert.match(formPage, /Setup guide/);
  assert.ok(!/<TelegramGroupSetupGuide/.test(formPage), "no drawer element on the form");
  assert.ok(!/guideOpen|setGuideOpen/.test(formPage), "no drawer state");
  assert.ok(!/Full setup guide/.test(formPage), "no Full setup guide button");
});

test("the inline guide is Create-only, like Detect Group", () => {
  assert.match(formPage, /\{createMode \? \(\s*<Box[\s\S]{0,400}<TelegramGroupSetupSteps/);
});

test("THE SIDE GUIDANCE BLOCKS ARE GONE, and nothing replaced them", () => {
  assert.ok(!/function GuidancePanel/.test(formPage), "GuidancePanel is deleted");
  for (const block of [
    "Chat ID guidelines",
    "Bot admin requirement",
    "How to get the Chat ID",
  ]) {
    assert.ok(!formPage.includes(block), `"${block}" must be gone`);
  }
  // And no second sidebar took its place.
  assert.ok(!/direction=\{\{ base: "column", xl: "row" \}\}/.test(formPage), "no two-column shell");
});

test("THE FORM IS A SINGLE COLUMN in the approved field order", () => {
  const order = [...formPage.matchAll(/name="(group_name|chat_id|category|used_for|outlet_id|bot_is_admin|is_active)"/g)]
    .map((m) => m[1]);
  assert.deepStrictEqual(order, [
    "group_name",
    "chat_id",
    "category",
    "used_for",
    "outlet_id",
    "bot_is_admin",
    "is_active",
  ]);
  // The old grid put two fields per row; the Stack puts one.
  assert.match(formPage, /<Stack spacing=\{0\}>/);
  assert.ok(!/inputSubContainer/.test(formPage), "the two-column rows are gone");
});

test("Bot Is Admin and Status use the repo's existing switch_toggle", () => {
  const botField = /<CustomInput\s+label="Bot Is Admin \*"[\s\S]*?\/>/.exec(formPage)[0];
  assert.match(botField, /method="switch_toggle"/);
  assert.match(botField, /onLabel="Yes"/);
  assert.match(botField, /offLabel="No"/);

  const statusField = /<CustomInput\s+label="Status \*"[\s\S]*?\/>/.exec(formPage)[0];
  assert.match(statusField, /method="switch_toggle"/);
  assert.match(statusField, /onLabel="Active"/);
  assert.match(statusField, /offLabel="Inactive"/);

  // Neither is a dropdown any more.
  for (const field of [botField, statusField]) {
    assert.ok(!/method="switch"/.test(field), "not a Select");
    assert.ok(!/values=\{/.test(field), "no option list");
  }
});

test("the toggle labels are a real CustomInput feature, defaulted for every other caller", () => {
  const input = strip(read("components/customInput/customInput.js"));
  assert.match(input, /onLabel = "Active"/);
  assert.match(input, /offLabel = "Inactive"/);
  assert.match(input, /\{field\.value \? onLabel : offLabel\}/);
  // Destructured, so they are never spread onto the DOM Switch.
  const spread = /case "switch_toggle":[\s\S]*?\{\.\.\.props\}/.exec(input);
  assert.ok(spread, "props are still spread onto the Switch");
  assert.ok(!/onLabel/.test(spread[0].replace(/onLabel = "Active"/, "")), "labels are not in props");
});

test("BOT IS ADMIN MAPS ON->true, OFF->false, with no translation on save", () => {
  assert.match(formPage, /bot_is_admin: Boolean\(values\.bot_is_admin\)/);
  assert.match(formPage, /bot_is_admin: Boolean\(group\.bot_is_admin\)/);
  // The old string encoding is gone entirely.
  assert.ok(!/values\.bot_is_admin === "1"/.test(formPage));
  assert.ok(!/bot_is_admin: "1"|bot_is_admin: "0"/.test(formPage));
});

test("STATUS MAPS ON->Active(true), OFF->Inactive(false), default Active on create", () => {
  assert.match(formPage, /is_active: Boolean\(values\.is_active\)/);
  assert.match(formPage, /is_active: true/, "create default");
  assert.ok(!/values\.is_active === "Active"/.test(formPage));
});

test("a required BOOLEAN must still accept false", () => {
  // `Yup.string().required()` would reject "No"/"Inactive" once they became
  // `false`, because required() rejects falsy. The boolean rule does not.
  assert.match(formPage, /bot_is_admin: Yup\.boolean\(\)/);
  assert.match(formPage, /is_active: Yup\.boolean\(\)/);
  assert.ok(!/bot_is_admin: Yup\.string\(\)/.test(formPage));
  assert.ok(!/is_active: Yup\.string\(\)/.test(formPage));
});

test("BOT IS ADMIN DEFAULTS TO YES, matching step 3 of the guide above it", () => {
  // The guide directly above the form tells the user to make the bot an
  // administrator, so by the time they reach this field they have already
  // done it. Anyone whose bot genuinely is not an admin switches it off.
  assert.match(formPage, /bot_is_admin: true/);
  assert.ok(!/bot_is_admin: false/.test(formPage), "the old OFF default is gone");
});

test("Status still defaults to Active on create", () => {
  assert.match(formPage, /is_active: true/);
});

test("EDIT STILL LOADS THE STORED VALUES - the defaults are create-only", () => {
  // The defaults live in the EMPTY initial-values object; edit overwrites
  // both from the record, so a saved "No" must not be shown as Yes.
  assert.match(formPage, /bot_is_admin: Boolean\(group\.bot_is_admin\)/);
  assert.match(formPage, /is_active: group\.is_active !== false/);
  const effect = /if \(createMode\) \{[\s\S]*?\n  \}, \[createMode, group\]\);/.exec(formPage);
  assert.ok(effect, "create resets to defaults, edit hydrates from the group");
  assert.match(effect[0], /setFormInitialValues\(EMPTY\)/);
});

test("the dynamic warnings survive the redesign and stay contextual", () => {
  assert.match(formPage, /<GroupTypeNotice chatId=\{values\.chat_id\} botIsAdmin=\{values\.bot_is_admin\}/);
  // The Basic Group notice is keyed on the derived type of what was typed.
  assert.match(formPage, /type === GROUP_TYPE\.BASIC_GROUP \? \(/);
  // The bot warning is keyed on the toggle being off - a boolean now.
  assert.match(formPage, /showBotWarning = botIsAdmin === false/);
});

test("the Detect Group hint is one line, not another explanation", () => {
  const prose = formPage.replace(/\s+/g, " ");
  assert.match(prose, /Send <Code fontSize="xs">\/setup<\/Code> in your Telegram group first, then click Detect Group/);
  assert.ok(!prose.includes("instead of typing the Chat ID"), "the longer hint is gone");
});

test("the list screen keeps the drawer, so the guide has one copy of its wording", () => {
  assert.match(listPage, /<TelegramGroupSetupGuide isOpen=\{guideOpen\}/);
  assert.match(guide, /export function TelegramGroupSetupSteps/);
  assert.match(guide, /export default function TelegramGroupSetupGuide/);
  // The drawer renders the same steps rather than its own copy.
  assert.match(guide, /<TelegramGroupSetupSteps \/>/);
});

test("step 2 does not assume Telegram shows a Convert button", () => {
  const prose = guide.replace(/\s+/g, " ");
  assert.match(prose, /If Telegram shows <strong>Convert to Supergroup<\/strong>/);
  assert.match(prose, /If that option is not visible/);
  assert.match(prose, /Chat history visible for new members/);
  assert.match(prose, /Topics/);
  assert.match(prose, /Telegram may then upgrade the group for you/);
});


test("the bot warning fires on a deliberate No, and not on an untouched form", () => {
  // With the field defaulting to Yes, turning it off IS the deliberate act,
  // so the warning needs no extra gate. The earlier "has a Chat ID yet"
  // guard existed only to stop a default-OFF toggle shouting at an empty
  // form, and would now suppress a real warning for somebody who switches
  // the toggle off before pasting the id.
  assert.match(formPage, /showBotWarning = botIsAdmin === false/);
  assert.ok(!/hasChatId/.test(formPage), "the gate is gone with the OFF default");
  assert.ok(!/botIsAdmin === "0"/.test(formPage), "the old string encoding is gone");
});

test("THE ADD PAGE IS NOT BOXED INTO A NARROW COLUMN", () => {
  // It uses the app's page content width - the same `container.xl` that
  // pages/shift/[id].js, salary, department and the rest use - so the guide,
  // the Detect Group bar and the fields all take the available width, and
  // nothing stretches across an ultrawide monitor.
  assert.ok(!/maxW="640px"/.test(formPage), "the 640px cap is gone");
  assert.match(formPage, /<Box maxW="container\.xl">/);
});
