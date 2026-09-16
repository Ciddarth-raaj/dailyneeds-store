import API from "../util/api";
import { parseSpreadsheetFile } from "../util/parseSpreadsheetFile";
import {
  buildExpectedBefore,
  exportErrorMessage,
} from "../util/employeeBulkUpdate";

/**
 * EMPLOYEE MASTER BULK EXPORT / IMPORT — the API calls.
 *
 * THE BROWSER PARSES THE SPREADSHEET AND THE SERVER DECIDES EVERYTHING ELSE.
 * That split is the existing convention here - `/hr/salary/bulk/validate`
 * takes parsed rows too - and it is safe for exactly one reason: the browser
 * is not trusted with any of it. It sends the header labels and the cells as
 * they were read; the server resolves every Location, Department and
 * Designation against the masters itself, re-checks the caller's branch scope
 * per row, re-reads each employee's current values, and refuses a file whose
 * columns it does not own. Nothing this file computes becomes a stored value.
 *
 * THE EXPORT IS BUILT SERVER-SIDE, not here, because the sheet carries data
 * validation and real date cells that must match what the importer accepts.
 */
const EmployeeBulkUpdateHelper = {
  /** Which fields may be exported, and the dropdown values for each. */
  getFields: () =>
    API.get("/hr/employees/bulk/fields").then((res) => res.data),

  /**
   * Download the .xlsx for the selected fields and filters.
   *
   * `responseType: "blob"` with `transformResponse` disabled, because the
   * shared axios instance parses every response as JSON and would destroy a
   * binary body. An error still arrives as JSON, so a failed export is read
   * back out of the blob rather than saved as a broken spreadsheet the user
   * would open and believe.
   */
  exportXlsx: async ({ fields, filters }) => {
    const res = await API.request({
      method: "POST",
      url: "/hr/employees/bulk/export",
      data: { fields, filters },
      responseType: "blob",
      transformResponse: [(data) => data],
    });

    const blob = res.data;
    if (blob && blob.type && String(blob.type).includes("json")) {
      throw new Error(exportErrorMessage(blob.type, await blob.text()));
    }

    const filename = `employee-bulk-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
  preview: ({ headers, rows, filename }) =>
    API.post("/hr/employees/bulk/preview", { headers, rows, filename }).then(
      (res) => res.data
    ),

  /**
   * Apply the file.
   *
   * `expected_before` is what the PREVIEW showed, echoed back per row. The
   * server checks it against the database as it is at that moment and refuses
   * a row somebody else has changed in between, rather than overwriting them.
   * It is sent from the preview response untouched - editing it here would be
   * defeating the check on the user's behalf.
   */
  confirm: ({ headers, rows, filename, preview }) =>
    API.post("/hr/employees/bulk/confirm", {
      headers,
      rows,
      filename,
      expected_before: buildExpectedBefore(preview),
    }).then((res) => res.data),
};

export default EmployeeBulkUpdateHelper;
