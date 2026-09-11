import React, { useState } from "react";
import { Text, Stack } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid } from "./SectionCard";
import { EmploymentBadge } from "../StatusBadges";
import { currentShiftLabel } from "../../../util/currentShift";

/**
 * Stage 0C / C3 — where the employee works.
 *
 * BRANCH, DEPARTMENT AND DESIGNATION ARE COLUMNS ON THE ONE PERMANENT RECORD.
 * Moving somebody between branches edits those columns; it never creates a
 * second employee, and the employee ID does not change. That is the whole
 * point of C1's permanent code, and it is why a transfer is an ordinary edit
 * rather than a new joiner.
 *
 * READ-ONLY HERE, AND DELIBERATELY:
 *
 *   Employee ID      allocated by AUTO_INCREMENT at create. HR never types
 *                    one, and it is never reused or resequenced.
 *   Joining date     lifecycle state. It is set by Create and moved only by
 *                    Resign and Rejoin, which record WHY it changed. An
 *                    editable joining date is a silently rewritten service
 *                    history.
 *   Status           moves through Resign and Rejoin, never a dropdown.
 *   Current shift    see below.
 *
 * THE SHIFT IS THE NEW ONE, AND IT IS NOT EDITED HERE.
 * This card used to show and edit "Default shift" - `new_employee.shift_id`,
 * pointing at the legacy `shift_master`, which the nightly Digisme sync and
 * a third column (`shift_code`) already disagree with. Employee Shift
 * Assignment replaced that mapping with `default_work_shift_id` on the new
 * `work_shift` master, and this now reads THAT and only that: the legacy
 * column is not read, written or mentioned on this screen.
 *
 * It is read-only because a shift change is a roster decision with attendance
 * and payroll behind it. Employee Shift Assignment is where it belongs, it
 * has its own permissions (`employee_edit` AND `assign_employee_shift`, or
 * `bulk_assign_employee_shift` for many at once), and a dropdown here would
 * be a second way to make the same change under a weaker one. What appears
 * here is the READ, gated on `view_shift_assignments`.
 *
 * The legacy column itself is untouched in the database - attendance, Biomax
 * and payroll may still read it, and proving otherwise is not this change.
 *
 * Changing branch or designation re-issues the employee's authorisation on
 * the backend, so the section says so before it is saved rather than after
 * somebody is unexpectedly signed out.
 */
function EmploymentSection({
  employee = {},
  lifecycle = {},
  outlets = [],
  departments = [],
  designations = [],
  /** `{ loading, denied, shift }` from `useCurrentWorkShift`. */
  currentShift = {},
  canEdit,
  onSave,
  saving,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const start = () => {
    setForm({
      store_id: employee.store_id ?? "",
      department_id: employee.department_id ?? "",
      designation_id: employee.designation_id ?? "",
    });
    setEditing(true);
  };

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const save = async () => {
    const ok = await onSave(form);
    if (ok) setEditing(false);
  };

  const opts = (rows, idKey, labelKey) =>
    (rows || []).map((r) => ({ value: r[idKey], label: r[labelKey] }));

  const current = lifecycle.current || {};

  return (
    <SectionCard
      title="Employment"
      subtitle="Employee ID and the lifecycle dates are set by Create, Resign and Rejoin."
      canEdit={canEdit}
      editing={editing}
      onEdit={start}
      onCancel={() => setEditing(false)}
      onSave={save}
      saving={saving}
      // THE LIFECYCLE IS THE AUTHORITY ON EMPLOYMENT STATUS, and the only one.
      // `employee.status` used to be the fallback, and cannot be: the profile's
      // employee read is a `SELECT *` joined across department, designation and
      // shift_master, each of which has a `status` column of its own, so the
      // key that survives is whichever the driver kept last - a shift's status,
      // not an employment one. It never fired while the lifecycle was always
      // present; now that a caller holding `view_employees` alone reaches this
      // screen without it, a wrong Active/Resigned badge is a real outcome.
      // No badge beats a guessed one.
      badge={
        lifecycle.status === undefined || lifecycle.status === null ? null : (
          <EmploymentBadge status={lifecycle.status} />
        )
      }
    >
      <FieldGrid>
        <Field label="Employee ID" value={employee.employee_id ?? lifecycle.employee_id} mono />
        <Field
          label="Joining date"
          value={current.date_of_joining || (employee.date_of_joining ? String(employee.date_of_joining).slice(0, 10) : "")}
        />
      </FieldGrid>

      <Stack mt={3} spacing={3}>
        {editing ? (
          <>
            <FieldGrid>
              <EditField
                label="Branch / Outlet"
                name="store_id"
                value={form.store_id}
                onChange={set}
                options={opts(outlets, "outlet_id", "outlet_name")}
              />
              <EditField
                label="Department"
                name="department_id"
                value={form.department_id}
                onChange={set}
                options={opts(departments, "department_id", "department_name")}
              />
              <EditField
                label="Designation"
                name="designation_id"
                value={form.designation_id}
                onChange={set}
                options={opts(designations, "designation_id", "designation_name")}
              />
            </FieldGrid>
            <Text fontSize="xs" color="orange.700">
              Changing branch or designation changes what this employee is allowed to do, so they
              will be asked to sign in again. Their employee ID and service history are unaffected.
            </Text>
          </>
        ) : (
          <>
            <FieldGrid>
              <Field label="Branch / Outlet" value={current.outlet_nickname || employee.outlet_name} />
              <Field label="Department" value={current.department_name || employee.department_name} />
              <Field label="Designation" value={current.designation_name || employee.designation_name} />
              <Field label="Current shift" value={currentShiftLabel(currentShift)} />
            </FieldGrid>
            <Text fontSize="xs" color="gray.500">
              The shift comes from Employee Shift Assignment, and is changed there.
            </Text>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}

export default EmploymentSection;
