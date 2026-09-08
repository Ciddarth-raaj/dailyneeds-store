import React, { useState } from "react";
import { Text } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid, SensitiveBadge } from "./SectionCard";
import { maskIdentifier } from "../../../util/hrProfile";

/**
 * Stage 0C / C3 — PAN, UAN, PF and ESI.
 *
 * SENSITIVE UNDER B3. The backend removes these keys from the response
 * entirely for a caller without `view_employee_sensitive`, and refuses a body
 * that so much as mentions one without `edit_employee_sensitive`. So the
 * section refuses itself first, plainly: a missing key means "not permitted",
 * and rendering it as an empty field would tell HR this employee has no PAN.
 *
 * The numbers are MASKED even for somebody entitled to see them. These are
 * government identifiers on a screen in a shop; "on record, ending 234F" is
 * what HR needs to know, and the full value is one click into Edit for the
 * smaller group who may change it.
 *
 * These save through POST /employee/updatedata, not the HR editor - they are
 * deliberately absent from `EDITABLE_FIELDS`.
 */
function StatutorySection({ employee = {}, canView, canEdit, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const start = () => {
    setForm({
      pan_no: employee.pan_no ?? "",
      uan: employee.uan ?? "",
      pf_number: employee.pf_number ?? "",
      esi_number: employee.esi_number ?? "",
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
      title="Statutory"
      subtitle="PAN, provident fund and ESI. Used by payroll and statutory filing."
      badge={<SensitiveBadge />}
      canView={canView}
      canEdit={canEdit}
      editing={editing}
      onEdit={start}
      onCancel={() => setEditing(false)}
      onSave={save}
      saving={saving}
      deniedMessage="You do not have permission to view this employee's statutory identifiers."
    >
      {editing ? (
        <FieldGrid>
          <EditField label="PAN" name="pan_no" value={form.pan_no} onChange={set} />
          <EditField label="UAN" name="uan" value={form.uan} onChange={set} />
          <EditField label="PF number" name="pf_number" value={form.pf_number} onChange={set} />
          <EditField label="ESI number" name="esi_number" value={form.esi_number} onChange={set} />
        </FieldGrid>
      ) : (
        <>
          <FieldGrid>
            <Field label="PAN" value={maskIdentifier(employee.pan_no)} mono />
            <Field label="UAN" value={maskIdentifier(employee.uan)} mono />
            <Field label="PF number" value={maskIdentifier(employee.pf_number)} mono />
            <Field label="ESI number" value={maskIdentifier(employee.esi_number)} mono />
          </FieldGrid>
          <Text fontSize="xs" color="gray.500" mt={3}>
            Shown masked. Open Edit to see or change the full value.
          </Text>
        </>
      )}
    </SectionCard>
  );
}

export default StatutorySection;
