/**
 * Telegram Group Registry - the pure rules the screens need.
 *
 * Free of React and of the API so it can be tested with
 * `node --test components/master/telegramGroupRegistry.test.js`, the way
 * `util/attendanceRaw.js` is.
 *
 * THIS IS THE FEEDBACK, NOT THE GUARANTEE. Every rule here exists again in
 * `constants/telegram_group_registry.js` and `usecase/telegram_group_registry.js`
 * on the server, which is what actually refuses a request and does not care
 * what this returned. The copy is here so the form can say what is wrong
 * while somebody is still typing, and the two must stay worded the same -
 * the test asserts the shared sentences character for character.
 */

/**
 * The only categories a group may carry. ORDER HERE IS DISPLAY ORDER: the
 * schema appends "Marketing" last because appending an ENUM value rewrites
 * no row, while "Other" reads last in a dropdown. The two orders differ on
 * purpose and the backend compares them as a set.
 */
export const TELEGRAM_GROUP_CATEGORIES = [
  "Attendance",
  "Maintenance",
  "HR",
  "Marketing",
  "Other",
];

/** The Bot Admin and Status filters, and the Yes/No and Active/Inactive fields. */
export const BOT_ADMIN_OPTIONS = [
  { id: "Yes", value: "Bot is admin" },
  { id: "No", value: "Bot is not admin" },
];

export const STATUS_OPTIONS = [
  { id: "Active", value: "Active" },
  { id: "Inactive", value: "Inactive" },
];

/** The outlet filter's one value an outlet id cannot express. */
export const OUTLET_FILTER_NONE = "none";

export const GROUP_TYPE = {
  SUPERGROUP: "Supergroup",
  BASIC_GROUP: "Basic Group",
};

export const TELEGRAM_GROUP_MESSAGES = {
  CHAT_ID_REQUIRED: "Group Chat ID is required",
  CHAT_ID_POSITIVE:
    "A positive Telegram ID belongs to an individual user, not a group. Enter the group's Chat ID, which begins with a minus - for example -1001234567890.",
  CHAT_ID_FORMAT:
    "Group Chat ID must be a negative whole number such as -1001234567890 - digits only, with a leading minus and no spaces or decimals.",
  BASIC_GROUP_WARNING:
    "This is a Basic Telegram Group. Invite-link and member-removal functionality will require the group to be converted to a Supergroup.",
  BOT_NOT_ADMIN_WARNING:
    "Bot is not an admin in this group. Member-removal functionality will not work.",
};

/**
 * A leading minus and digits, NOTHING ELSE - applied to the value exactly as
 * it was typed or pasted, never to a trimmed copy.
 *
 * `" -1001234567890 "` does not satisfy this rule. Trimming before checking
 * would turn a value the rule refuses into one it accepts, the form would
 * pass judgement on a string the user never entered, and the field would
 * disagree with the server, which refuses the padded value.
 */
const GROUP_CHAT_ID_RE = /^-\d+$/;
/** `-0`, `-00`, … pass the rule by shape but are zero with a sign, not a chat. */
const ALL_ZEROS_RE = /^-0+$/;
const SUPERGROUP_PREFIX = "-100";

const text = (value) => String(value === undefined || value === null ? "" : value);

export function isValidGroupChatId(value) {
  const chatId = text(value);
  return GROUP_CHAT_ID_RE.test(chatId) && !ALL_ZEROS_RE.test(chatId);
}

/**
 * 'Supergroup' | 'Basic Group' | null.
 *
 * Nobody picks this. It is a function of the Chat ID, here and on the server,
 * and there is no field for it on the form.
 */
export function deriveGroupType(chatId) {
  const value = text(chatId);
  if (!isValidGroupChatId(value)) return null;
  return value.startsWith(SUPERGROUP_PREFIX) ? GROUP_TYPE.SUPERGROUP : GROUP_TYPE.BASIC_GROUP;
}

export function isBasicGroup(chatId) {
  return deriveGroupType(chatId) === GROUP_TYPE.BASIC_GROUP;
}

/**
 * The message for a Chat ID that cannot be saved, or null when it is fine.
 *
 * A POSITIVE id gets its own sentence. It is the likeliest mistake - people
 * copy their own user id out of a bot response - and "that is not a valid
 * group id" would send them looking at the group instead of at what they
 * pasted.
 */
export function chatIdError(value) {
  // `text` no longer trims, so whitespace reaches the format check and is
  // refused there rather than being silently removed. A whitespace-only
  // value is malformed, not absent, and is told so.
  const chatId = text(value);
  if (!chatId) return TELEGRAM_GROUP_MESSAGES.CHAT_ID_REQUIRED;
  if (/^\+?\d+$/.test(chatId)) return TELEGRAM_GROUP_MESSAGES.CHAT_ID_POSITIVE;
  if (!isValidGroupChatId(chatId)) return TELEGRAM_GROUP_MESSAGES.CHAT_ID_FORMAT;
  return null;
}

/**
 * The advisory warnings a row carries. NEITHER ONE BLOCKS A SAVE: a Basic
 * Group is a legitimate entry, and so is a group the bot does not administer.
 * They are shown so nobody is surprised later by a feature that cannot work.
 */
export function telegramGroupWarnings({ chat_id, bot_is_admin }) {
  const warnings = [];
  if (isBasicGroup(chat_id)) warnings.push(TELEGRAM_GROUP_MESSAGES.BASIC_GROUP_WARNING);
  if (!bot_is_admin) warnings.push(TELEGRAM_GROUP_MESSAGES.BOT_NOT_ADMIN_WARNING);
  return warnings;
}

/**
 * The Status column.
 *
 * THREE STATES, NOT TWO, and the third is why this is a function rather than
 * a boolean read. A retired group is Inactive. An active group that carries a
 * warning - a non-admin bot, or a Basic Group - reads "Warning", because the
 * whole point of the registry is that those rows are visible at a glance
 * without opening anything. Everything else is Active.
 *
 * Inactive WINS over a warning: a group nobody uses any more does not need
 * chasing, and showing it as a problem would bury the ones that do.
 */
export function rowStatus(row) {
  if (row && row.is_active === false) {
    return { label: "Inactive", colorScheme: "gray" };
  }
  if (telegramGroupWarnings(row || {}).length > 0) {
    return { label: "Warning", colorScheme: "orange" };
  }
  return { label: "Active", colorScheme: "green" };
}

/** The registry never shows a blank cell for a group with no outlet. */
export function displayOutlet(row) {
  return (row && row.outlet_name) || "All Outlets";
}
