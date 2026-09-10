import API from "../util/api";

/**
 * The /work-shift API surface, as `routes/work_shift.js` actually defines it.
 *
 * THIS IS NOT `helper/shift.js`. That one belongs to the legacy `shift_master`
 * table behind /shift, which the live system and `new_employee.shift_id` still
 * use; it is untouched and is not repointed here. The two masters coexist on
 * purpose during Phase 1.
 *
 * Reads are guarded by `view_shift` and writes by `add_shifts` on the server —
 * the same keys that guard the legacy shift master, so whoever maintains
 * shifts today maintains work shifts.
 *
 * Every method resolves `res.data` like the other helpers in this repo, which
 * means a caller can receive `{ code: 403, msg }` or `{ code: 422, msg }`
 * instead of the happy shape. That is deliberate — see `util/apiList.js` — and
 * the screens unwrap it rather than assuming success.
 */
const workShift = {
  /**
   * GET /work-shift — every work shift, configuration only: `{ code, data }`.
   *
   * `{ active: true }` narrows to active shifts, for a dropdown that must
   * offer only those. Called with nothing, the answer is unchanged - the Work
   * Shift Master list needs the inactive ones too, since the switch in its
   * Status column is the only way to bring one back.
   */
  getWorkShifts: ({ active } = {}) =>
    new Promise((resolve, reject) => {
      const params = active === undefined ? undefined : { active: active ? 1 : 0 };
      API.get("/work-shift", params ? { params } : undefined)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * GET /work-shift/details — one shift's configuration AND its 7-day
   * schedule, in a single read: `{ code, data: { ...config, weekly_schedule } }`.
   * The edit screen wants both, and asking twice would let them disagree.
   */
  getWorkShiftDetails: (workShiftId) =>
    new Promise((resolve, reject) => {
      API.get("/work-shift/details", { params: { work_shift_id: workShiftId } })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** GET /work-shift/weekly-schedule — the seven rows on their own. */
  getWeeklySchedule: (workShiftId) =>
    new Promise((resolve, reject) => {
      API.get("/work-shift/weekly-schedule", { params: { work_shift_id: workShiftId } })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /work-shift/create — configuration flat in the body, with
   * `weekly_schedule` alongside it. The schedule is mandatory: the shift and
   * its seven days are written in one transaction, so a new shift cannot land
   * half defined.
   */
  createWorkShift: (payload) =>
    new Promise((resolve, reject) => {
      API.post("/work-shift/create", payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /work-shift/update — `{ work_shift_id, work_shift_details,
   * weekly_schedule }`. Both halves save atomically; a schedule that IS sent
   * is always the complete week.
   */
  updateWorkShift: (payload) =>
    new Promise((resolve, reject) => {
      API.post("/work-shift/update", payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /work-shift/weekly-schedule — all seven days, or the save is refused. */
  saveWeeklySchedule: (workShiftId, weeklySchedule) =>
    new Promise((resolve, reject) => {
      API.post("/work-shift/weekly-schedule", {
        work_shift_id: workShiftId,
        weekly_schedule: weeklySchedule,
      })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /work-shift/update-status — active 1/0.
   *
   * THERE IS NO DELETE, on the server or here. A work shift that stops being
   * used goes inactive: deleting one would take its weekly schedule with it
   * (ON DELETE CASCADE) and leave anything that referenced it pointing at
   * nothing.
   */
  updateStatus: (workShiftId, active) =>
    new Promise((resolve, reject) => {
      API.post("/work-shift/update-status", {
        work_shift_id: workShiftId,
        active: active ? 1 : 0,
      })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),
};

export default workShift;
