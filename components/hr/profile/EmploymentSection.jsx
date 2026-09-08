import React, { useState } from "react";
import { Badge, Text, Stack } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid } from "./SectionCard";
import { EmploymentBadge } from "../StatusBadges";

/**
 * Stage 0C / C3 — where the employee works.
 *
 * BRANCH, DEPARTMENT, DESIGNATION AND SHIFT ARE COLUMNS ON THE ONE PERMANENT
 * RECORD. Moving somebody between branches edits those columns; it never
 * creates a second employee, and the employee ID does not change. That is the
 * whole point of C1's permanent code, and it is why a transfer is an ordinary
 * edit rather than a new joiner.
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
  shifts = [],
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
      shift_id: employee.shift_id ?? "",
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
  const periods = Array.isArray(lifecycle.periods) ? lifecycle.periods : [];
  const openPeriod = periods.find((p) => p.period_state === "open");

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
      badge={<EmploymentBadge status={lifecycle.status ?? employee.status} />}
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
              <EditField
                label="Default shift"
                name="shift_id"
                value={form.shift_id}
                onChange={set}
                options={opts(shifts, "shift_id", "shift_name")}
              />
            </FieldGrid>
            <Text fontSize="xs" color="orange.700">
              Changing branch or designation changes what this employee is allowed to do, so they
              will be asked to sign in again. Their employee ID and service history are unaffected.
            </Text>
          </>
        ) : (
          <FieldGrid>
            <Field label="Branch / Outlet" value={current.outlet_nickname || employee.outlet_name} />
            <Field label="Department" value={current.department_name || employee.department_name} />
            <Field label="Designation" value={current.designation_name || employee.designation_name} />
            <Field label="Default shift" value={employee.shift_name || employee.shift_code} />
          </FieldGrid>
        )}
      </Stack>

      <Stack direction="row" spacing={4} mt={4} align="center" flexWrap="wrap">
        <Badge colorScheme="purple" variant="subtle">
          {periods.length} employment period{periods.length === 1 ? "" : "s"}
        </Badge>
        {openPeriod ? (
          <Text fontSize="xs" color="gray.600">
            Current period began {openPeriod.joined_on || "on a date that was not recorded"}
          </Text>
        ) : (
          <Text fontSize="xs" color="gray.600">
            No open period — this employee has left.
          </Text>
        )}
      </Stack>
    </SectionCard>
  );
}

export default EmploymentSection;
