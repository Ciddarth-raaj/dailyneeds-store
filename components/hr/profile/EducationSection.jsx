import React, { useState } from "react";
import { Alert, AlertIcon, Stack, Text } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid } from "./SectionCard";

/**
 * Stage 0C / C3 — education and previous experience.
 *
 * These are three plain columns on the employee master, in the backend's
 * `EDITABLE_FIELDS`, so they save through the ordinary HR editor and carry
 * none of the ambiguity that made Family defer.
 *
 * FAMILY IS DEFERRED, and the note below says so on the screen rather than
 * leaving a gap somebody has to ask about. `employee_family` is keyed by
 * `employee_name`, a VARCHAR - not by the permanent employee ID - so two
 * employees who share a name share family records, and a name correction
 * silently detaches them. Showing that data against one employee would be
 * asserting something the schema cannot support. Fixing it is a migration and
 * a backfill, which is a separate piece of work rather than something to
 * improvise inside C3.
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
      footer={
        <Stack mt={4}>
          <Alert status="info" fontSize="xs" alignItems="flex-start">
            <AlertIcon />
            <Text>
              <strong>Family details are not shown here.</strong> They are stored against the
              employee&apos;s <em>name</em> rather than their permanent employee ID, so two people
              with the same name would share records and a name correction would detach them.
              Linking them properly needs a schema change, which is being tracked separately.
            </Text>
          </Alert>
        </Stack>
      }
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
