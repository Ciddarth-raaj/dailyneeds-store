import React, { useState } from "react";
import { Text } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid, SensitiveBadge } from "./SectionCard";
import {
  APPLICABILITY_OPTIONS,
  applicabilityLabel,
  maskIdentifier,
  statutoryValue,
} from "../../../util/hrProfile";

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
 * PF AND ESI APPLICABILITY, and why they are worth two more fields.
 * Until they existed, an employee not in the ESI scheme and an employee whose
 * ESI number nobody had typed in yet looked identical - both read "not
 * recorded" - so a finished record was indistinguishable from an outstanding
 * chase, permanently. Yes/No answers that, and the flag is the only thing it
 * answers:
 *
 *   No           the numbers beside it read "Not applicable". Nothing is
 *                outstanding and nobody has to go and find anything.
 *   Yes          the numbers read exactly as they did before, "not recorded"
 *                included. BEING IN THE SCHEME DOES NOT REQUIRE THE NUMBER
 *                YET - a UAN is routinely pending for weeks after joining,
 *                and refusing to record the fact until the number arrives
 *                would just push the truth back out of the system.
 *   nothing set  the honest state for every employee on file today, because
 *                nobody has ever been asked. It reads "not recorded" like any
 *                other unanswered field, and the empty option in Edit is how
 *                it is put back.
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
      pf_applicable: employee.pf_applicable ?? "",
      previous_pf_member: employee.previous_pf_member ?? "",
      previous_eps_member: employee.previous_eps_member ?? "",
      pf_number: employee.pf_number ?? "",
      esi_applicable: employee.esi_applicable ?? "",
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
      title="Statutory Details"
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
        <>
          <FieldGrid>
            <EditField label="PAN" name="pan_no" value={form.pan_no} onChange={set} />
            <EditField
              label="PF applicable"
              name="pf_applicable"
              value={form.pf_applicable}
              onChange={set}
              options={APPLICABILITY_OPTIONS}
              help="Leave blank if it has not been decided yet."
            />
            {/* M2. A SEPARATE FACT from PF applicable, and from both numbers.
                "Is this employee in the scheme now" and "had they ever been in
                it before they joined us" are different questions. Placed
                directly under PF applicable because that is the order the
                question gets asked in. */}
            <EditField
              label="Existing / Previous PF member"
              name="previous_pf_member"
              value={form.previous_pf_member}
              onChange={set}
              options={APPLICABILITY_OPTIONS}
              help="Was the employee already a PF (EPF) member before joining? Leave blank if it is not known."
            />
            {/* M2 review fix. TWO QUESTIONS, NOT ONE. Official EPFO Form 11
                asks about previous EPF membership and previous EPS (pension)
                membership separately, because the answers differ - somebody
                can have been in a previous employer's provident fund without
                ever having been in the pension scheme. Only THIS answer
                decides whether the employer's share splits into EPF and EPS,
                so it is asked here rather than inferred from the field above
                it. */}
            <EditField
              label="Existing / Previous EPS member"
              name="previous_eps_member"
              value={form.previous_eps_member}
              onChange={set}
              options={APPLICABILITY_OPTIONS}
              help="Was the employee already an EPS (pension scheme) member before joining? Leave blank if it is not known — it is not assumed from the PF answer above."
            />
            <EditField label="UAN" name="uan" value={form.uan} onChange={set} />
            {/* `pf_number` IS the PF member id - the one column production has
                for it; no second "member id" field is invented (M1). */}
            <EditField label="PF number (member ID)" name="pf_number" value={form.pf_number} onChange={set} />
            <EditField
              label="ESI applicable"
              name="esi_applicable"
              value={form.esi_applicable}
              onChange={set}
              options={APPLICABILITY_OPTIONS}
              help="Leave blank if it has not been decided yet."
            />
            <EditField label="ESI number (IP number)" name="esi_number" value={form.esi_number} onChange={set} />
          </FieldGrid>
          <Text fontSize="xs" color="gray.500" mt={3}>
            A number is not required to record that somebody is in a scheme — a UAN or an ESI
            number that is still pending stays &quot;not recorded&quot; until it arrives.
          </Text>
        </>
      ) : (
        <>
          <FieldGrid>
            {/* PAN answers to neither flag - everybody has one. */}
            <Field label="PAN" value={maskIdentifier(employee.pan_no)} mono />
            <Field label="PF applicable" value={applicabilityLabel(employee.pf_applicable)} />
            {/* M2. Shown with `applicabilityLabel` and NOT with
                `statutoryValue`, deliberately. The identifiers below answer to
                the PF flag - somebody outside the scheme has no UAN to chase -
                but whether they were a member of a PREVIOUS employer's scheme
                is a fact about their history, not an identifier this employer
                is waiting on. Reading it as "Not applicable" the moment PF is
                switched off would erase an answer somebody gave. */}
            <Field
              label="Existing / Previous PF member"
              value={applicabilityLabel(employee.previous_pf_member)}
            />
            {/* M2 review fix. Shown as its OWN answer, never as an echo of the
                line above it: "not recorded" here means the pension question
                has not been answered, which is exactly what payroll needs to
                see, because the backend reports the EPS split as unresolved
                until it is. Same `applicabilityLabel` treatment and for the
                same reason as its neighbour. */}
            <Field
              label="Existing / Previous EPS member"
              value={applicabilityLabel(employee.previous_eps_member)}
            />
            {/* The UAN is the provident-fund identifier, so it answers to the
                PF flag: an employee not in the scheme has no UAN to chase. */}
            <Field label="UAN" value={statutoryValue(employee.pf_applicable, employee.uan)} mono />
            <Field
              label="PF number (member ID)"
              value={statutoryValue(employee.pf_applicable, employee.pf_number)}
              mono
            />
            <Field label="ESI applicable" value={applicabilityLabel(employee.esi_applicable)} />
            <Field
              label="ESI number (IP number)"
              value={statutoryValue(employee.esi_applicable, employee.esi_number)}
              mono
            />
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
