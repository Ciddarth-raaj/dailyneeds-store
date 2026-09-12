import React, { useState } from "react";
import { Text, Stack } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid } from "./SectionCard";
import { EmploymentBadge } from "../StatusBadges";
import { currentShiftLabel } from "../../../util/currentShift";

/**
 * M1 — section 3 of the employee master: Employment Details.
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
 *   Status           moves through Resign and Rejoin, never a dropdown.
 *
 * THE JOINING DATE IS EDITABLE, BUT NOT THROUGH THE ORDINARY EDIT. It is
 * lifecycle state - set by Create, moved by Rejoin - so a correction goes
 * through its own endpoint (`onSaveJoiningDate`, `employee_edit`), which moves
 * the current employment period with it and records the old and new value on
 * the timeline. A silently rewritten service history is what that avoids;
 * a wrongly typed date that nobody can fix is what this section used to be.
 * The same `canEdit` gates it as the rest of the card.
 *
 * THE SHIFT IS THE NEW ONE. What this card shows is `default_work_shift_id`
 * on the NEW `work_shift` master, read through Employee Shift Assignment's
 * own endpoint. The legacy `new_employee.shift_id` / `shift_code` pair is not
 * read, written or mentioned here.
 *
 * M1 review fix: that read is gated on `view_employees` alone. Shift belongs
 * to Employment Details, so seeing it is part of seeing the employee - it no
 * longer demands `view_shift_assignments`, which is the roster's key and left
 * the field unreadable for most profile viewers.
 *
 * CHANGING IT FROM HERE IS THE SAME ACT AS ASSIGNING IT THERE, under the same
 * keys: `employee_edit` AND `assign_employee_shift`, through the same
 * all-or-nothing assign endpoint (`onAssignShift`). A caller without that
 * pair sees the shift and is told where it is changed; nobody gets a dropdown
 * that would predictably 403, and `employee_create` - enough to choose a NEW
 * hire's initial shift - is not enough to re-roster an existing one.
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
  /** Active work shifts for the dropdown, `[{ work_shift_id, shift_code, shift_name, timing }]`. */
  shiftOptions = [],
  canEdit,
  /** `employee_edit` AND `assign_employee_shift`: may change the shift from here. */
  canAssignShift = false,
  onSave,
  /** `(dateOfJoining) => Promise<boolean>` - the audited joining-date correction. */
  onSaveJoiningDate,
  /** `(workShiftId) => Promise<boolean>` - the existing single assign. */
  onAssignShift,
  saving,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const currentShiftId =
    currentShift && currentShift.shift && currentShift.shift.assigned
      ? currentShift.shift.work_shift_id
      : "";

  const current = lifecycle.current || {};
  const joiningDate = String(current.date_of_joining || employee.date_of_joining || "").slice(0, 10);

  const start = () => {
    setForm({
      date_of_joining: joiningDate,
      store_id: employee.store_id ?? "",
      department_id: employee.department_id ?? "",
      designation_id: employee.designation_id ?? "",
      work_shift_id: currentShiftId ?? "",
    });
    setEditing(true);
  };

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const save = async () => {
    // Two writes, two permissions, two endpoints - kept apart on purpose.
    // The placement edit goes through the ordinary HR editor; the shift goes
    // through the assign endpoint, and only if it changed and may be changed.
    // The joining date is the third: its own audited action, only if changed.
    const { work_shift_id, date_of_joining, ...placement } = form;
    const placementChanged = Object.keys(placement).some(
      (k) => String(placement[k] ?? "") !== String(employee[k] ?? "")
    );
    const shiftChanged = Boolean(
      canAssignShift && work_shift_id && String(work_shift_id) !== String(currentShiftId || "")
    );
    const joiningChanged = Boolean(
      typeof onSaveJoiningDate === "function" && date_of_joining && date_of_joining !== joiningDate
    );
    // A shift-only or date-only change must not be stopped by the editor's
    // own "nothing was changed" guard, and a placement-only change must not
    // call the other two.
    if (placementChanged || (!shiftChanged && !joiningChanged)) {
      const ok = await onSave(placement);
      if (!ok) return;
    }
    if (joiningChanged) {
      const corrected = await onSaveJoiningDate(date_of_joining);
      if (!corrected) return;
    }
    if (shiftChanged && typeof onAssignShift === "function") {
      const assigned = await onAssignShift(Number(work_shift_id));
      if (!assigned) return;
    }
    setEditing(false);
  };

  const shiftOptionLabel = (o) => {
    const name = [o.shift_code, o.shift_name].filter(Boolean).join(" - ");
    return o.timing ? `${name} · ${o.timing}` : name;
  };

  const opts = (rows, idKey, labelKey) =>
    (rows || []).map((r) => ({ value: r[idKey], label: r[labelKey] }));

  return (
    <SectionCard
      title="Employment Details"
      subtitle="Employee ID is permanent; status moves through Resign and Rejoin. A wrongly recorded joining date can be corrected here."
      canEdit={canEdit}
      editing={editing}
      onEdit={start}
      onCancel={() => setEditing(false)}
      onSave={save}
      saving={saving}
      badge={<EmploymentBadge status={lifecycle.status ?? employee.status} />}
    >
      <FieldGrid>
        <Field label="Employee ID" value={employee.employee_id ?? lifecycle.employee_id} mono />
        {editing && typeof onSaveJoiningDate === "function" ? (
          <EditField
            label="Joining date"
            name="date_of_joining"
            type="date"
            value={form.date_of_joining}
            onChange={set}
            help="Corrects the start of the current spell of employment. The change is recorded on the timeline."
          />
        ) : (
          <Field label="Joining date" value={joiningDate} />
        )}
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
              {canAssignShift ? (
                <EditField
                  label="Shift"
                  name="work_shift_id"
                  value={form.work_shift_id}
                  onChange={set}
                  options={shiftOptions.map((o) => ({ value: o.work_shift_id, label: shiftOptionLabel(o) }))}
                  help="Active work shifts. Saving assigns it exactly as Employee Shift Assignment does."
                />
              ) : (
                <EditField
                  label="Shift"
                  name="work_shift_id_readonly"
                  value={currentShiftLabel(currentShift) || ""}
                  onChange={() => {}}
                  isReadOnly
                  help="Changed from Employee Shift Assignment by someone with that right."
                />
              )}
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
              <Field label="Shift" value={currentShiftLabel(currentShift)} />
            </FieldGrid>
            <Text fontSize="xs" color="gray.500">
              {canAssignShift
                ? "The shift is on the work shift master. Change it here or from Employee Shift Assignment."
                : "The shift comes from Employee Shift Assignment, and is changed there."}
            </Text>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}

export default EmploymentSection;
