import React, { useState } from "react";
import { SectionCard, Field, EditField, FieldGrid } from "./SectionCard";

/**
 * Stage 0C / C3 — education and previous experience.
 *
 * These are three plain columns on the employee master, in the backend's
 * `EDITABLE_FIELDS`, so they save through the ordinary HR editor.
 *
 * FAMILY IS STILL DEFERRED, and this section no longer says so on screen.
 * `employee_family` being keyed by `employee_name` rather than the permanent
 * employee ID is a real reason not to show family records here, and it was
 * explained in a blue panel on the profile - which put a schema defect in
 * front of HR, who cannot act on it and did not ask. The reason belongs in
 * this comment and in the tracked work; the screen simply does not offer
 * family details.
 *
 * Nothing about the deferral changed: no family data is read, written or
 * linked here, and `FamilyHelper` is not used by the profile.
 */
function EducationSection({ employee = {}, canEdit, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const start = () => {
    setForm({
      qualification: employee.qualification ?? "",
      additional_course: employee.additional_course ?? "",
      previous_experience: employee.previous_experience ?? "",
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
      title="Education & Experience"
      canEdit={canEdit}
      editing={editing}
      onEdit={start}
      onCancel={() => setEditing(false)}
      onSave={save}
      saving={saving}
    >
      {editing ? (
        <FieldGrid columns={{ base: 1 }}>
          <EditField label="Qualification" name="qualification" value={form.qualification} onChange={set} />
          <EditField
            label="Additional course"
            name="additional_course"
            value={form.additional_course}
            onChange={set}
          />
          <EditField
            label="Previous experience"
            name="previous_experience"
            type="textarea"
            value={form.previous_experience}
            onChange={set}
          />
        </FieldGrid>
      ) : (
        <FieldGrid columns={{ base: 1 }}>
          <Field label="Qualification" value={employee.qualification} />
          <Field label="Additional course" value={employee.additional_course} />
          <Field label="Previous experience" value={employee.previous_experience} />
        </FieldGrid>
      )}
    </SectionCard>
  );
}

export default EducationSection;
