import API from "../util/api";

/**
 * Telegram Group Registry API - `routes/telegram_group_registry.js`.
 * Base path: /telegram-groups
 *
 *   list    view_telegram_groups
 *   read    view_telegram_groups
 *   write   manage_telegram_groups
 *
 * A refusal - a 403, a duplicate Chat ID, an unsupported category - arrives
 * as `{ code, msg }` and is thrown as an Error carrying the server's own
 * sentence, because the server's message is the one worth showing: it names
 * the group the Chat ID is already registered to, and it is the message the
 * user must act on. Shaped like `helper/remarksMaster.js`.
 */

const fail = (res, fallback) => {
  throw new Error((res && res.data && res.data.msg) || fallback);
};

export const getTelegramGroups = (params = {}) =>
  API.get("/telegram-groups", { params }).then((res) => {
    if (res.data?.code === 200) return res.data;
    return fail(res, "Failed to fetch Telegram groups");
  });

export const getTelegramGroupById = (id) =>
  API.get(`/telegram-groups/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    return fail(res, "Failed to fetch the Telegram group");
  });

/**
 * Groups that sent `/setup` and are not yet registered.
 *
 * Behind `manage_telegram_groups`, so a view-only user gets the ordinary
 * 403 here rather than a list of groups they cannot register.
 */
export const getDetectedTelegramGroups = () =>
  API.get("/telegram-groups/detected").then((res) => {
    if (res.data?.code === 200) return Array.isArray(res.data.data) ? res.data.data : [];
    return fail(res, "Could not check for detected Telegram groups");
  });

export const createTelegramGroup = (body) =>
  API.post("/telegram-groups", body).then((res) => {
    if (res.data?.code === 200) return res.data;
    return fail(res, "Failed to create the Telegram group");
  });

export const updateTelegramGroup = (id, body) =>
  API.put(`/telegram-groups/${id}`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    return fail(res, "Failed to update the Telegram group");
  });

export const deleteTelegramGroup = (id) =>
  API.delete(`/telegram-groups/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    return fail(res, "Failed to delete the Telegram group");
  });

/* ------------------------------------------- Phase 3A: group mapping ---- */

/**
 * WHO SHOULD BELONG TO A GROUP. Configuration only.
 *
 * None of these adds, removes, invites or bans anybody on Telegram - there
 * is no endpoint here that could. Reads need `view_telegram_groups`, writes
 * need `manage_telegram_groups`; there is no third key.
 */
export const getTelegramGroupMappings = (id) =>
  API.get(`/telegram-groups/${id}/mappings`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    return fail(res, "Failed to fetch the group's mappings");
  });

/**
 * `body` is `{ mapping_type }` for All Employees and
 * `{ mapping_type, target_id }` for the other three - `util/telegramGroupMapping#mappingPayload`
 * builds it. The server's refusal is thrown verbatim, because "That mapping
 * is already on this group" and "That outlet no longer exists" are the exact
 * sentences the user has to act on.
 */
export const addTelegramGroupMapping = (id, body) =>
  API.post(`/telegram-groups/${id}/mappings`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    return fail(res, "Failed to add the mapping");
  });

export const deleteTelegramGroupMapping = (id, mappingId) =>
  API.delete(`/telegram-groups/${id}/mappings/${mappingId}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    return fail(res, "Failed to remove the mapping");
  });

/**
 * The people a group's rules resolve to.
 *
 * NO BRANCH IS SENT, and none may be: the server resolves the caller's scope
 * from its own live lookup and refuses a request that names one. Omitting
 * `mappingId` asks for the deduplicated union of every rule.
 */
export const getTelegramGroupMatchedEmployees = (id, mappingId) =>
  API.get(`/telegram-groups/${id}/matched-employees`, {
    params: mappingId ? { mapping_id: mappingId } : {},
  }).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    return fail(res, "Failed to fetch the matched employees");
  });
