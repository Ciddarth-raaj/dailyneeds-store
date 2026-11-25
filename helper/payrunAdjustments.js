import API from "../util/api";
import { parseSpreadsheetFile } from "../util/parseSpreadsheetFile";
import { exportErrorMessage } from "../util/employeeBulkUpdate";

/**
 * Payrun Adjustments V1 - the browser's side of /payrun/adjustments.
 *
 * SEVEN CALLS, MATCHING THE SEVEN ENDPOINTS EXACTLY. Nothing here invents a
 * route and nothing here decides anything: the component list, the labels, the
 * three states, the counts and the net effect of every row all come from the
 * server, because a second copy of the V1 catalogue in a browser is a second
 * declaration of what V1 is, and the day a component changes the screen
 * renders the old one.
 *
 * THE BROWSER PARSES THE SPREADSHEET AND THE SERVER DECIDES EVERYTHING ELSE -
 * the split `helper/employeeBulkUpdate.js` established, and safe for exactly
 * one reason: the browser is not trusted with any of it. It sends the header
 * labels and the cells as they were read; the server refuses a header it does
 * not own, re-resolves every employee against the month's INITIALIZED
 * population, re-checks the branch scope per row, and validates every amount
 * again at confirm time.
 *
 * THE EXPORT IS BUILT SERVER-SIDE, because the template's amount columns are
 * real number cells with the format the importer expects, and because the
 * template's population is a fact about the payroll month rather than about
 * what this screen happens to be showing.
 *
 * REFUSALS ARE ROUTINE AND ARRIVE AS DATA - see `helper/payrun.js`.
 */
const PayrunAdjustmentsHelper = {
  /** GET the catalogue: what V1 is, and the template's columns in order. */
  getComponents: () =>
    API.get("/payrun/adjustments/components").then((res) => res.data),

  /** GET the month: the initialized population, their states, the counts. */
  getMonth: (params) =>
    API.get("/payrun/adjustments/month", { params }).then((res) => res.data),

  /**
   * Download the .xlsx template for the month.
   *
   * `responseType: "blob"` with `transformResponse` disabled, because the
   * shared axios instance parses every response as JSON and would destroy a
   * binary body. A refusal still arrives as JSON, so a failed export is read
   * back out of the blob rather than saved as a spreadsheet somebody would
   * open and believe - which for a payroll template would read as "nobody is
   * initialized this month".
   */
  exportTemplate: async ({ year, month, store_ids }) => {
    const res = await API.request({
      method: "POST",
      url: "/payrun/adjustments/export",
      data: { year, month, ...(store_ids ? { store_ids } : {}) },
      responseType: "blob",
      transformResponse: [(data) => data],
    });

    const blob = res.data;
    if (blob && blob.type && String(blob.type).includes("json")) {
      throw new Error(exportErrorMessage(blob.type, await blob.text()));
    }

    const filename = `payrun-adjustments-${year}-${String(month).padStart(2, "0")}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return filename;
  },

  /** Read an uploaded workbook into the header labels and the cells. */
  parseFile: (file) => parseSpreadsheetFile(file),

  /** Validate a file. WRITES NOTHING - this is the preview. */
  preview: ({ year, month, headers, rows, filename }) =>
    API.post("/payrun/adjustments/preview", { year, month, headers, rows, filename }).then(
      (res) => res.data
    ),

  /**
   * Save the file's adjustments.
   *
   * IT SENDS THE ROWS AGAIN, UNCHANGED. The server validates the whole file
   * from scratch against the month as it is at that moment - there is no token
   * and no server-side basket - so trimming, "correcting" or filtering rows
   * here would be the client quietly opting out of the check on the user's
   * behalf.
   *
   * IT CONFIRMS NOBODY AS HAVING NO ADJUSTMENT. That is a separate call, made
   * by an explicit act; a file of blanks leaves everybody pending.
   */
  confirm: ({ year, month, headers, rows, filename }) =>
    API.post("/payrun/adjustments/confirm", { year, month, headers, rows, filename }).then(
      (res) => res.data
    ),

  /** Add, edit or clear ONE employee's adjustments. `null` clears a component. */
  saveEmployee: ({ year, month, employee_id, amounts, remarks }) =>
    API.post("/payrun/adjustments/employee", {
      year,
      month,
      employee_id,
      ...(amounts ? { amounts } : {}),
      ...(remarks === undefined ? {} : { remarks }),
    }).then((res) => res.data),

  /**
   * THE EXPLICIT NO-ADJUSTMENT CONFIRMATION - one employee or a selection.
   *
   * THE BODY CANNOT SAY WHO CONFIRMED. The server takes the confirmer from the
   * authenticated session; there is no field here that could carry one, and
   * the endpoint's schema refuses a body that names one.
   */
  confirmNoAdjustment: ({ year, month, employee_ids }) =>
    API.post("/payrun/adjustments/no-adjustment", { year, month, employee_ids }).then(
      (res) => res.data
    ),

  /** GET one employee's adjustment history for the month. */
  getHistory: (params) =>
    API.get("/payrun/adjustments/history", { params }).then((res) => res.data),
};

export default PayrunAdjustmentsHelper;
