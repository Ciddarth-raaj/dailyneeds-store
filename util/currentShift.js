/**
 * What the employee profile prints in "Current shift".
 *
 * A pure function, in its own file, because it has to tell four states apart
 * and three of them look like nothing:
 *
 *   loading      the read has not come back yet
 *   denied       the caller may not see shifts at all (`view_shift`)
 *   unassigned   nobody has put this employee on a work shift
 *   assigned     the shift, and its hours where they are the same all week
 *
 * "Unassigned" and "could not be loaded" are different facts and only the
 * first is somebody's job, so neither may be rendered as a blank cell. That is
 * the same rule `currentWorkShiftLabel` follows on the assignment screen, and
 * this is deliberately its profile-shaped sibling rather than a second answer
 * to the same question: the assignment screen has a row per employee and no
 * permission state to report, this has one employee and does.
 *
 * NOTHING HERE READS THE LEGACY SHIFT. The `shift` it is given comes from
 * `GET /hr/work-shift-assignments/employee/:id`, which reads
 * `default_work_shift_id` and nothing else.
 *
 * CommonJS on purpose, so `node --test` can require it with no bundler - the
 * same reason `util/employeeShiftAssignment.js` is.
 */

/** "GS1 - 9 TO 9", or just the name when a shift has no code. */
function shiftName(shift) {
  if (!shift) return "";
  const code = String(shift.shift_code || "").trim();
  const name = String(shift.shift_name || "").trim();
  if (code && name) return `${code} - ${name}`;
  return code || name;
}

/**
 * The line to show, given the hook's `{ loading, denied, error, shift }`.
 *
 * Returns null only while loading, which is what makes the field render its
 * own placeholder rather than flashing "Not assigned" at somebody whose shift
 * is about to appear - the one wrong answer that would send HR to the
 * assignment screen for nothing.
 */
function currentShiftLabel({ loading, denied, error, shift } = {}) {
  if (loading) return null;
  if (denied) return "You do not have permission to see shifts";
  if (error) return "Could not be loaded";
  if (!shift || !shift.assigned) return "Not assigned";

  const label = shiftName(shift) || `#${shift.work_shift_id}`;
  const parts = [label];
  if (shift.timing) parts.push(shift.timing);
  // A shift that has been switched off since it was assigned is still this
  // employee's shift. Saying so is more useful than hiding it, and hiding it
  // would read as unassigned.
  if (shift.shift_active === false) parts.push("inactive");
  return parts.join(" · ");
}

module.exports = { shiftName, currentShiftLabel };
