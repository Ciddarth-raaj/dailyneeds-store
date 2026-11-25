import React, { useState } from "react";
import { Button, HStack, Stack, Text, Tooltip } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid } from "./SectionCard";
import {
  isRequiredField,
  validatePersonalDetails,
  summarizeErrors,
} from "../../../util/personalDetails";

/**
 * Stage 0C / C3 — who the employee is.
 *
 * Every field here is on the backend's `EDITABLE_FIELDS`, so it all saves
 * through POST /hr/employee/:id/edit behind `employee_edit`. Nothing here is
 * sensitive under B3.
 *
 * MANDATORY FIELDS ARE CHECKED ON SAVE, NOT ON OPEN. A profile from 2013
 * with no father's name on file opens, reads and prints exactly as it always
 * did; what it cannot do is be SAVED while still incomplete. The rule itself
 * lives in `util/personalDetails.js` and is re-checked by the server on every
 * write - what happens here is the courtesy of pointing at the field instead
 * of returning a sentence after a round trip.
 *
 * TWO NAMES, ON PURPOSE.
 *
 *   Name as per Aadhaar   the verified legal identity. Read-only here once
 *                         verification has happened; it is written by the
 *                         Aadhaar flow and must survive any later edit of
 *                         the operational name, which is exactly what it
 *                         did not do before.
 *   Employee Name         the operational / display name. Freely editable,
 *                         and never locked by verification - a preferred
 *                         spelling is a legitimate thing to record.
 *
 * `Copy from Aadhaar Name` bridges them in one click and then gets out of
 * the way: the copy is a one-off, not a binding, and the field stays
 * editable afterwards.
 *
 * SAME AS PERMANENT ADDRESS is the same shape of action, for the same
 * reason. It copies once. The two addresses are NOT synchronised - changing
 * the permanent address later must not silently rewrite where somebody
 * actually lives - so a second copy is a second, deliberate click.
 *
 * ALTERNATE / EMERGENCY CONTACT. There is no dedicated emergency-contact
 * column on the employee master - no name, no relationship, no separate
 * number - so this is `alternate_contact_number`, labelled for what it is
 * actually used for rather than pretending to be a field that does not
 * exist. A real emergency contact would need a migration and is deliberately
 * not invented here.
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

/** A small link-shaped action beside a field label. */
function FieldAction({ onClick, isDisabled, tooltip, children }) {
  const button = (
    <Button
      size="xs"
      variant="link"
      colorScheme="purple"
      fontSize="10px"
      onClick={onClick}
      isDisabled={isDisabled}
    >
      {children}
    </Button>
  );
  return tooltip ? (
    <Tooltip label={tooltip} fontSize="xs" openDelay={300}>
      {/* A disabled button swallows pointer events, so the tooltip needs a host. */}
      <span>{button}</span>
    </Tooltip>
  ) : (
    button
  );
}

function PersonalSection({ employee = {}, aadhaar = null, canEdit, onSave, saving, toast }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  // The verified legal name, from the Aadhaar identity. Never from
  // `employee_name`, which is the operational one and may have diverged.
  const aadhaarName = (aadhaar && aadhaar.name_as_per_aadhaar) || "";
  const aadhaarVerified = Boolean(aadhaar && aadhaar.aadhaar_status === "VERIFIED");

  const start = () => {
    setErrors({});
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

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    // Clear the field's own error as soon as it is touched; re-validating
    // the whole form on every keystroke would light up fields nobody has
    // reached yet.
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  /** ONE-OFF COPY. Not a binding: see the header. */
  const copyPermanentToResidential = () => set("residential_address", form.permanent_address ?? "");
  const copyAadhaarName = () => set("employee_name", aadhaarName);

  const save = async () => {
    const found = validatePersonalDetails(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      if (toast) {
        toast({ title: summarizeErrors(found), status: "error", duration: 6000, isClosable: true });
      }
      return;
    }
    const ok = await onSave(form);
    if (ok) setEditing(false);
  };

  const fieldProps = (name) => ({
    isRequired: isRequiredField(name, form),
    error: errors[name],
  });

  return (
    <SectionCard
      title="Personal Details"
      canEdit={canEdit}
      editing={editing}
      onEdit={start}
      onCancel={() => setEditing(false)}
      onSave={save}
      saving={saving}
    >
      {editing ? (
        <Stack spacing={3}>
          <FieldGrid>
            <EditField
              label="Employee Name"
              name="employee_name"
              value={form.employee_name}
              onChange={set}
              help="The operational name. Editable, and never locked by Aadhaar verification."
              action={
                aadhaarName ? (
                  <FieldAction
                    onClick={copyAadhaarName}
                    tooltip={`Copy "${aadhaarName}" into Employee Name. It stays editable afterwards.`}
                  >
                    Copy from Aadhaar Name
                  </FieldAction>
                ) : null
              }
              {...fieldProps("employee_name")}
            />
            <EditField
              label="Name as per Aadhaar"
              name="name_as_per_aadhaar"
              value={aadhaarName}
              onChange={() => {}}
              isReadOnly
              help={
                aadhaarName
                  ? "Verified legal name. Recorded by Aadhaar verification and not editable here."
                  : "Recorded automatically when an Aadhaar is verified for this employee."
              }
            />
            <EditField
              label="Father's Name"
              name="father_name"
              value={form.father_name}
              onChange={set}
              {...fieldProps("father_name")}
            />
            <EditField
              label="Date of Birth"
              name="dob"
              type="date"
              value={form.dob}
              onChange={set}
              {...fieldProps("dob")}
            />
            <EditField
              label="Gender"
              name="gender"
              value={form.gender}
              onChange={set}
              options={GENDERS}
              {...fieldProps("gender")}
            />
            <EditField
              label="Blood group"
              name="blood_group"
              value={form.blood_group}
              onChange={set}
              help="Optional."
            />
            <EditField
              label="Marital status"
              name="marital_status"
              value={form.marital_status}
              onChange={set}
              options={MARITAL}
              {...fieldProps("marital_status")}
            />
            <EditField
              label="Spouse name"
              name="spouse_name"
              value={form.spouse_name}
              onChange={set}
              {...fieldProps("spouse_name")}
            />
            <EditField
              label="Marriage date"
              name="marriage_date"
              type="date"
              value={form.marriage_date}
              onChange={set}
              {...fieldProps("marriage_date")}
            />
            <EditField
              label="Mobile"
              name="primary_contact_number"
              value={form.primary_contact_number}
              onChange={set}
              {...fieldProps("primary_contact_number")}
            />
            <EditField
              label="Alternate / Emergency Contact"
              name="alternate_contact_number"
              value={form.alternate_contact_number}
              onChange={set}
              help="The employee master has no separate emergency-contact field; this number is used for both."
              {...fieldProps("alternate_contact_number")}
            />
            <EditField
              label="Email"
              name="email_id"
              type="email"
              value={form.email_id}
              onChange={set}
              help="Optional."
            />
            <EditField
              label="Permanent address"
              name="permanent_address"
              type="textarea"
              value={form.permanent_address}
              onChange={set}
              {...fieldProps("permanent_address")}
            />
            <EditField
              label="Residential address"
              name="residential_address"
              type="textarea"
              value={form.residential_address}
              onChange={set}
              action={
                <FieldAction
                  onClick={copyPermanentToResidential}
                  isDisabled={!String(form.permanent_address || "").trim()}
                  tooltip="Copies the Permanent Address once. The two are not kept in step afterwards."
                >
                  Same as Permanent Address
                </FieldAction>
              }
              {...fieldProps("residential_address")}
            />
          </FieldGrid>
          <Text fontSize="10px" color="gray.500">
            Fields marked with * are required to save this section. Blood Group and Email are
            optional. Spouse Name and Marriage Date are required only when Marital Status is
            Married.
          </Text>
        </Stack>
      ) : (
        <FieldGrid>
          <Field label="Employee Name" value={employee.employee_name} />
          <Field
            label="Name as per Aadhaar"
            value={
              aadhaarName ? (
                <HStack spacing={2} align="baseline">
                  <span>{aadhaarName}</span>
                  {aadhaarVerified ? (
                    <Text as="span" fontSize="10px" color="green.600">
                      Aadhaar verified
                    </Text>
                  ) : null}
                </HStack>
              ) : (
                ""
              )
            }
          />
          <Field label="Father's Name" value={employee.father_name} />
          <Field label="Date of Birth" value={employee.dob ? String(employee.dob).slice(0, 10) : ""} />
          <Field label="Gender" value={employee.gender} />
          <Field label="Blood group" value={employee.blood_group} />
          <Field label="Marital status" value={employee.marital_status} />
          <Field label="Spouse name" value={employee.spouse_name} />
          <Field
            label="Marriage date"
            value={employee.marriage_date ? String(employee.marriage_date).slice(0, 10) : ""}
          />
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
