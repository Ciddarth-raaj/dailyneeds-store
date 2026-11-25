import API from "../util/api";

/**
 * The /staff-budget API surface, as `routes/staff_budget.js` actually defines
 * it.
 *
 * THIS IS NOT `helper/budget.js`. That one belongs to the legacy `budget`
 * table behind /budget and the old /store-budget "Employee Count" screen,
 * which is untouched by this feature and is not migrated here.
 *
 * Reads are guarded by `view_staff_budget` and writes by `edit_staff_budget`
 * on the server. Those guards — not the menu, not this file — are what refuse
 * a request.
 *
 * Every method resolves `res.data` like the other helpers in this repo, which
 * means a caller can receive `{ code: 403, msg }` or `{ code: 422, msg }`
 * instead of the happy shape. That is deliberate — see `util/apiList.js` — and
 * the screen unwraps it rather than assuming success.
 */
const staffBudget = {
  /**
   * GET /staff-budget — the whole plan as `{ code, data: { checkpoints,
   * locations } }`, with every total and every Opening/Peak/Closing figure
   * already computed server-side.
   *
   * `outletId` narrows it to one location; omitted, every location comes back.
   */
  getBudget: (outletId) =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await API.get("/staff-budget", {
          params: outletId ? { outlet_id: outletId } : {},
        });
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    }),

  /** GET /staff-budget/masters — the active locations, departments,
   *  designations and shifts the pickers offer. */
  getMasters: () =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await API.get("/staff-budget/masters");
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    }),

  /** GET /staff-budget/rates — the configured monthly rates. */
  getRates: () =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await API.get("/staff-budget/rates");
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    }),

  /** GET /staff-budget/history — what one approved headcount used to be. */
  getHistory: (staffBudgetId) =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await API.get("/staff-budget/history", {
          params: { staff_budget_id: staffBudgetId },
        });
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    }),

  /** POST /staff-budget — the approved headcount for one combination. */
  saveBudget: (payload) =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await API.post("/staff-budget", payload);
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    }),

  /** POST /staff-budget/bulk — a designation's whole shift grid at once. */
  saveBudgetBulk: (payload) =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await API.post("/staff-budget/bulk", payload);
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    }),

  /** POST /staff-budget/remove — take a combination out of the plan. The row
   *  and its history stay; only its status changes. */
  removeBudget: (staffBudgetId) =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await API.post("/staff-budget/remove", {
          staff_budget_id: staffBudgetId,
        });
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    }),

  /**
   * POST /staff-budget/rates — one monthly rate, by designation and work
   * shift.
   *
   * The only way a rate is written. There is no endpoint that finds a
   * designation by name or a shift by its timings and prices it: the screen
   * shows the live masters, a person picks, and the payload carries the ids
   * they picked.
   */
  saveRate: (payload) =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await API.post("/staff-budget/rates", payload);
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    }),
};

export default staffBudget;
