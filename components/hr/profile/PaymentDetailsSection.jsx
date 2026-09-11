import React, { useState } from "react";
import { Alert, AlertIcon, Box, Stack, Text } from "@chakra-ui/react";
import { SectionCard, Field, EditField, FieldGrid, SensitiveBadge } from "./SectionCard";
import BankCard from "../BankCard";
import { PAYMENT_TYPE_OPTIONS, isBankPayment, isCashPayment, paymentTypeLabel } from "../../../util/hrProfile";

/**
 * M1 — section 5 of the employee master: Payment Details. Was "Bank Details".
 *
 * ONE DECISION, THEN THE FIELDS IT NEEDS. Payment Type is Cash or Bank.
 * When it is Bank, the existing bank card - status, verification, the
 * Add/Change account editor - sits inside this section unchanged. When it is
 * Cash, no account is asked for and the bank card is not shown as a nagging
 * "not provided": there is nothing to provide. The stored bank columns are
 * untouched either way; choosing Cash does not erase an account on file, it
 * stops asking for one.
 *
 * NOT ON THE EMPLOYMENT STAGE, AND NOT A STORE MANAGER'S: a manager finishing
 * onboarding must not be able to choose Cash for a new hire. This section
 * begins after their four stages and is behind `edit_payment_details` on top
 * of the sensitive pair.
 *
 * `payment_type` IS SENSITIVE UNDER B3 like the account it qualifies, so it
 * is absent from the response for a caller without `view_employee_sensitive`
 * and this section says so rather than rendering "not recorded". It saves
 * through the same sensitive path as the account (`buildSensitivePayload`,
 * 1 Bank / 2 Cash exactly as the legacy screens stored it).
 */
function PaymentDetailsSection({
  employee = {},
  bank,
  lifecycle = {},
  permissions = [],
  isAdmin = false,
  canView,
  canEdit,
  canEditBank,
  onSave,
  onEditBankDetails,
  onBankChanged,
  saving,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const start = () => {
    setForm({ payment_type: employee.payment_type ?? "" });
    setEditing(true);
  };
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const save = async () => {
    const ok = await onSave(form);
    if (ok) setEditing(false);
  };

  const type = employee.payment_type;
  const bankChosen = isBankPayment(type);
  const cashChosen = isCashPayment(type);

  return (
    <SectionCard
      title="Payment Details"
      subtitle="How this employee is paid. Bank details are needed only when paid by bank."
      badge={<SensitiveBadge />}
      canView={canView}
      canEdit={canEdit}
      editing={editing}
      onEdit={start}
      onCancel={() => setEditing(false)}
      onSave={save}
      saving={saving}
      deniedMessage="You do not have permission to view this employee's payment details."
    >
      {editing ? (
        <FieldGrid>
          <EditField
            label="Payment type"
            name="payment_type"
            value={form.payment_type}
            onChange={set}
            options={PAYMENT_TYPE_OPTIONS}
            help="Bank asks for an account below. Cash does not."
          />
        </FieldGrid>
      ) : (
        <FieldGrid>
          <Field label="Payment type" value={paymentTypeLabel(type)} />
        </FieldGrid>
      )}

      <Stack mt={4} spacing={3}>
        {cashChosen ? (
          <Text fontSize="xs" color="gray.500">
            Paid in cash. No bank account is required.
          </Text>
        ) : null}

        {bankChosen || (!cashChosen && bank && bank.masked_account) ? (
          bank ? (
            <Box>
              {/* The existing bank card, unchanged: status, verification,
                  name review and the Add/Change account editor. */}
              <BankCard
                employeeId={lifecycle.employee_id}
                employeeName={lifecycle.employee_name}
                bank={bank}
                permissions={permissions}
                isAdmin={isAdmin}
                onChanged={onBankChanged}
                canEditSensitive={canEditBank}
                onEditDetails={onEditBankDetails}
              />
            </Box>
          ) : (
            <Alert status="info" fontSize="sm">
              <AlertIcon />
              You do not have permission to see this employee&apos;s bank verification.
            </Alert>
          )
        ) : null}

        {!bankChosen && !cashChosen ? (
          <Text fontSize="xs" color="gray.500">
            Payment type has not been recorded. Choose Bank to record and verify an account, or Cash.
          </Text>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

export default PaymentDetailsSection;
