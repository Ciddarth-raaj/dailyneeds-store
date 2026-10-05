/**
 * PAYRUN > CALCULATION & REVIEW - the Department and Designation dropdowns.
 *
 * THE CHOICES ARE THE SERVER'S. `GET /payrun/calculation/month` returns
 * `filter_options`: the departments and designations that occur among the
 * month's initialized employees in the caller's branch scope (and location),
 * each designation with the departments it occurs in. This module only
 * decides how to DRAW them - it filters nobody; the server does that.
 */

const EMPTY = { departments: [], designations: [] };

const sameId = (a, b) => a !== "" && a !== null && a !== undefined && String(a) === String(b);

/**
 * THE DESIGNATIONS TO OFFER: all of them, or - once a Department is chosen -
 * only those that occur in it, where the data says which. A designation with
 * no recorded department is not hidden by a department choice it cannot be
 * matched against.
 */
function designationChoices(options, departmentId) {
  const list = (options || EMPTY).designations || [];
  if (departmentId === "" || departmentId === null || departmentId === undefined) return list;
  return list.filter(
    (d) =>
      !Array.isArray(d.department_ids) ||
      d.department_ids.length === 0 ||
      d.department_ids.some((id) => sameId(departmentId, id))
  );
}

/**
 * WHETHER A CHOSEN DESIGNATION SURVIVES A NEW DEPARTMENT. When it no longer
 * occurs in the department it is cleared, rather than leaving a combination
 * that can only ever show nobody.
 */
function keepsDesignation(options, departmentId, designationId) {
  if (designationId === "" || designationId === null || designationId === undefined) return true;
  return designationChoices(options, departmentId).some((d) => sameId(designationId, d.id));
}

/**
 * THE CURRENT CHOICE IS ALWAYS LISTED. A department chosen under one location
 * or month may not occur under the next; the dropdown still shows it (with no
 * employees) instead of silently displaying a different value than the one
 * the list is filtered by.
 */
function withSelected(list, selectedId, noun) {
  if (selectedId === "" || selectedId === null || selectedId === undefined) return list;
  if (list.some((item) => sameId(selectedId, item.id))) return list;
  return [...list, { id: Number(selectedId), name: `${noun} ${selectedId}`, count: 0 }];
}

/** "Sales (12)". */
const optionLabel = (item) => (item.count === undefined ? item.name : `${item.name} (${item.count})`);

module.exports = {
  EMPTY_FILTER_OPTIONS: EMPTY,
  designationChoices,
  keepsDesignation,
  withSelected,
  optionLabel,
};
