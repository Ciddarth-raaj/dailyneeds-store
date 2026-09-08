import React, { useState } from "react";
import { SectionCard, Field, EditField, FieldGrid } from "./SectionCard";

/**
 * Stage 0C / C3 — who the employee is.
 *
 * Every field here is on the backend's `EDITABLE_FIELDS`, so it all saves
 * through POST /hr/employee/:id/edit behind `employee_edit`. Nothing here is
 * sensitive under B3.
 *
 * ALTERNATE / EMERGENCY CONTACT. There is no dedicated emergency-contact
 * column on the employee master - no name, no relationship, no separate
 * number - so this is `alternate_contact_number`, labelled for what it is
 * actually used for rather than pretending to be a field that does not exist.
 * A real emergency contact would need a migration and is deliberately not
 * invented here.
 */
const GENDERS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "O", label: "Other" },
];

const MARITAL = [
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Widowed", label: "Widowed" },
  { value: "Divorced", label: "Divorced" },
];

function PersonalSection({ employee = {}, canEdit, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const start = () => {
    setForm({
      employee_name: employee.employee_name ?? "",
      father_name: employee.father_name ?? "",
      dob: employee.dob ? String(employee.dob).slice(0, 10) : "",
      gender: employee.gender ?? "",
      blood_group: employee.blood_group ?? "",
      marital_status: employee.marital_status ?? "",
      marriage_date: employee.marriage_date ? String(employee.marriage_date).slice(0, 10) : "",
      spouse_name: employee.spouse_name ?? "",
      primary_contact_number: employee.primary_contact_number ?? "",
      alternate_contact_number: employee.alternate_contact_number ?? "",
      email_id: employee.email_id ?? "",
      permanent_address: employee.permanent_address ?? "",
      residential_address: employee.residential_address ?? "",
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
      title="Personal"
      canEdit={canEdit}
      editing={editing}
      onEdit={start}
      onCancel={() => setEditing(false)}
      onSave={save}
      saving={saving}
    >
      {editing ? (
        <FieldGrid>
          <EditField label="Name" name="employee_name" value={form.employee_name} onChange={set} />
          <EditField label="Father's name" name="father_name" value={form.father_name} onChange={set} />
          <EditField label="Date of birth" name="dob" type="date" value={form.dob} onChange={set} />
          <EditField label="Gender" name="gender" value={form.gender} onChange={set} options={GENDERS} />
          <EditField label="Blood group" name="blood_group" value={form.blood_group} onChange={set} />
          <EditField
            label="Marital status"
            name="marital_status"
            value={form.marital_status}
            onChange={set}
            options={MARITAL}
          />
          <EditField
            label="Marriage date"
            name="marriage_date"
            type="date"
            value={form.marriage_date}
            onChange={set}
          />
          <EditField label="Spouse name" name="spouse_name" value={form.spouse_name} onChange={set} />
          <EditField
            label="Mobile"
            name="primary_contact_number"
            value={form.primary_contact_number}
            onChange={set}
          />
          <EditField
            label="Alternate / Emergency Contact"
            name="alternate_contact_number"
            value={form.alternate_contact_number}
            onChange={set}
            help="The employee master has no separate emergency-contact field; this number is used for both."
          />
          <EditField label="Email" name="email_id" type="email" value={form.email_id} onChange={set} />
          <div />
          <EditField
            label="Permanent address"
            name="permanent_address"
            type="textarea"
            value={form.permanent_address}
            onChange={set}
          />
          <EditField
            label="Residential address"
            name="residential_address"
            type="textarea"
            value={form.residential_address}
            onChange={set}
          />
        </FieldGrid>
      ) : (
        <FieldGrid>
          <Field label="Name" value={employee.employee_name} />
          <Field label="Father's name" value={employee.father_name} />
          <Field label="Date of birth" value={employee.dob ? String(employee.dob).slice(0, 10) : ""} />
          <Field label="Gender" value={employee.gender} />
          <Field label="Blood group" value={employee.blood_group} />
          <Field label="Marital status" value={employee.marital_status} />
          <Field label="Spouse name" value={employee.spouse_name} />
          <Field label="Mobile" value={employee.primary_contact_number} />
          <Field label="Alternate / Emergency Contact" value={employee.alternate_contact_number} />
          <Field label="Email" value={employee.email_id} />
          <Field label="Permanent address" value={employee.permanent_address} />
          <Field label="Residential address" value={employee.residential_address} />
        </FieldGrid>
      )}
    </SectionCard>
  );
}

export default PersonalSection;
