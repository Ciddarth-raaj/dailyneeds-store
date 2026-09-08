import React, { useState } from "react";
import { Alert, AlertIcon, Text } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid, SensitiveBadge } from "./SectionCard";

/**
 * Stage 0C / C3 — the salary master.
 *
 * THE ARCHITECTURAL LINE, and it is worth stating on the screen itself:
 *
 *   HR stores the salary MASTER - what this employee is engaged at.
 *   Payroll CALCULATES the monthly salary from it, later, in its own module.
 *
 * Nothing here computes anything. There is no gross, no deduction, no net and
 * no month: those are payroll's, they depend on attendance, and a second
 * implementation of them here would eventually disagree with the payslip
 * somebody was actually paid on.
 *
 * `salary` on the employee master is a single free-text figure, which is not
 * a salary structure. `payroll-target-architecture.md` replaces it with
 * effective-dated components; until then this section shows and edits the one
 * number that exists, and says so rather than implying more.
 *
 * Sensitive under B3, saved through POST /employee/updatedata.
 */
const PAYMENT_TYPES = [
  { value: 1, label: "Bank transfer" },
  { value: 2, label: "Cash" },
];

const paymentLabel = (value) => {
  const found = PAYMENT_TYPES.find((p) => String(p.value) === String(value));
  return found ? found.label : null;
};

function CompensationSection({ employee = {}, canView, canEdit, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const start = () => {
    setForm({
      salary: employee.salary ?? "",
      payment_type: employee.payment_type ?? "",
    });
    setEditing(true);
  };

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const save = async () => {
    const ok = await onSave(form);
    if (ok) setEditing(false);
  };

  return (
    <SectionCard
      title="Salary Master"
      subtitle="What this employee is engaged at. Payroll calculates monthly pay from it separately."
      badge={<SensitiveBadge />}
      canView={canView}
      canEdit={canEdit}
      editing={editing}
      onEdit={start}
      onCancel={() => setEditing(false)}
      onSave={save}
      saving={saving}
      deniedMessage="You do not have permission to view this employee's salary."
    >
      {editing ? (
        <>
          <FieldGrid>
            <EditField label="Salary" name="salary" type="number" value={form.salary} onChange={set} />
            <EditField
              label="Payment type"
              name="payment_type"
              value={form.payment_type}
              onChange={set}
              options={PAYMENT_TYPES}
            />
          </FieldGrid>
          <Alert status="info" fontSize="xs" mt={3}>
            <AlertIcon />
            This is the master figure only. It does not recalculate any payroll that has already
            been processed.
          </Alert>
        </>
      ) : (
        <>
          <FieldGrid>
            <Field label="Salary" value={employee.salary} mono />
            <Field label="Payment type" value={paymentLabel(employee.payment_type)} />
          </FieldGrid>
          <Text fontSize="xs" color="gray.500" mt={3}>
            A single engaged figure. Earnings, deductions and net pay belong to Payroll.
          </Text>
        </>
      )}
    </SectionCard>
  );
}

export default CompensationSection;
