import React from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
} from "@chakra-ui/react";

import { formatMoney } from "../../../util/salaryView";
import { PayTypeControl } from "../payrunPresentation";
import {
  STATUS,
  isApprovable,
  isRecalculable,
  isResettable,
  isAttendanceProcessable,
  isCalculable,
  isPublishable,
  isUnlockable,
  isUnpublishable,
  isLocked,
  isNotificationRetryable,
  hasPayslip,
  notificationBadge,
  viewBadge,
  statusScheme,
} from "../../../util/payrunCalculation";

/**
 * A PUBLISHED PAYSLIP'S TWO OTHER FACTS, beside its status: whether the
 * Telegram notification reached the employee, and whether they have opened
 * it. Opening is proof of access only - never an acceptance.
 */
function PayslipBadges({ row }) {
  const n = notificationBadge(row.payslip);
  const v = viewBadge(row.payslip);
  if (!n && !v) return null;
  return (
    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
      {n ? (
        <Badge colorScheme={n.scheme} variant="subtle" fontSize="10px">
          {n.label}
        </Badge>
      ) : null}
      {v ? (
        <Badge colorScheme={v.scheme} variant="outline" fontSize="10px" whiteSpace="normal">
          {v.label}
        </Badge>
      ) : null}
    </Stack>
  );
}

/**
 * PAYRUN > CALCULATION & REVIEW - the month's initialized employees.
 *
 *   md and up   a table
 *   below md    one stacked card per employee
 *
 * THE SAME SWITCH, AT THE SAME BREAKPOINT, that
 * `components/payroll/PayrunEmployeeList.jsx` and the adjustments list already
 * make. A third rule here would mean the payroll screens disagreeing about
 * what "mobile" means.
 *
 * IT IS A CHOICE OF LAYOUT AND NOTHING ELSE. Both branches receive the same
 * rows, apply the same permissions, use the same predicates and send the same
 * actions - so an employee who cannot be approved on a desktop cannot be
 * approved on a phone, because it is one module answering in both.
 *
 * NOT ONE FIGURE ON THIS SCREEN IS COMPUTED HERE. The net pay, the additions,
 * the deductions, the PF and the ESI arrive on the row already calculated and
 * already stored; this file formats them. A browser that added a column up
 * would be a second payroll engine, and it would be the one somebody believed.
 *
 * THE STATUS BADGE IS THE SERVER'S WORDS. `status_label` arrives on the row -
 * a browser mapping codes to its own labels renders a bare code the day a
 * status is added, for a status nobody notices is missing.
 */

/**
 * THE MONTHLY PAY TYPE, ON THIS SCREEN, THROUGH THE SHARED CONTROL.
 *
 * THE SAME COMPONENT THE INITIALIZATION SCREEN DRAWS, and deliberately not a
 * second one: a select of its own here would be a second opinion about when a
 * pay type may be changed, and the day one of the two learned about a new
 * lock the other would still be offering the control.
 *
 * WHAT THIS SCREEN ADDS IS ITS OWN ANSWER TO "IS IT STILL EDITABLE": an
 * employee whose month is APPROVED & LOCKED is read-only, because the approval
 * committed to how the money travels. Everybody else in the month - calculated
 * or not, stale or not - is editable, and changing it drops their calculation
 * to RECALCULATION REQUIRED through the server's own inputs hash rather than
 * through anything decided here.
 *
 * THE ROWS ARE ALL INITIALIZED. This stage's population IS the initialized
 * employees, so `editable` is passed explicitly rather than left to default to
 * `row.initialized`, which this endpoint does not send.
 */
function PayTypeCell({ row, canChangePayType, onPayTypeChange, busyEmployeeId, disabled }) {
  return (
    <PayTypeControl
      row={row}
      editable={!isLocked(row)}
      canChangePayType={canChangePayType}
      busy={disabled || busyEmployeeId === row.employee_id}
      onPayTypeChange={onPayTypeChange}
      readOnlyReason={
        isLocked(row)
          ? "This employee's month is approved and locked. The pay type is part of what was signed off, and becomes changeable again only if that approval is reversed."
          : "You do not have permission to change the pay type"
      }
    />
  );
}

/** A money cell. An absent figure is a dash, never a zero - see below. */
function Money({ value }) {
  const text = formatMoney(value);
  return (
    <Text fontSize="sm" whiteSpace="nowrap">
      {text === null ? "—" : text}
    </Text>
  );
}

/**
 * A COUNT, AND AN ABSENT ONE IS A DASH.
 *
 * "—" and "0" are different statements: the first says this employee has not
 * been calculated, the second says they were and the answer was nothing. On a
 * payroll review screen that difference is the whole point of the row.
 */
const count = (value) => (value === null || value === undefined ? "—" : String(value));

function RowActions({
  row,
  onRecalculate,
  onApprove,
  onReset,
  onProcessAttendance,
  canProcessAttendance,
  onLifecycle,
  canUnlock,
  canPublish,
  onRetryNotification,
  onViewPayslip,
  onOpen,
  canCalculate,
  canApprove,
  busyEmployeeId,
  disabled,
}) {
  const busy = busyEmployeeId === row.employee_id;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Button size="xs" variant="outline" onClick={() => onOpen(row)} isDisabled={disabled}>
        Detail
      </Button>
      {/* CALCULATE AND RECALCULATE ARE ONE BUTTON PER ROW, LABELLED FOR WHAT
          IT WOULD DO. Two buttons where only one is ever enabled is two
          controls to read for one decision. */}
      {/* PROCESS ATTENDANCE, where the server says re-running the attendance
          month would clear what blocks this employee. */}
      {isAttendanceProcessable(row) && canProcessAttendance ? (
        <Button
          size="xs"
          colorScheme="blue"
          variant="outline"
          onClick={() => onProcessAttendance(row)}
          isDisabled={disabled}
          isLoading={busy}
        >
          Process Attendance
        </Button>
      ) : null}
      {/* CALCULATE ONLY WHERE THE SERVER SAYS IT WOULD BE ACCEPTED. */}
      {isCalculable(row) ? (
        <Button
          size="xs"
          colorScheme="purple"
          onClick={() => onRecalculate(row, { first: true })}
          isDisabled={!canCalculate || disabled}
          isLoading={busy}
        >
          Calculate
        </Button>
      ) : null}
      {isRecalculable(row) ? (
        <Button
          size="xs"
          colorScheme={row.status === STATUS.RECALCULATION_REQUIRED ? "orange" : "gray"}
          variant="outline"
          onClick={() => onRecalculate(row, { first: false })}
          isDisabled={!canCalculate || disabled}
          isLoading={busy}
        >
          Recalculate
        </Button>
      ) : null}
      {/* APPROVE IS OFFERED ONLY WHERE IT WOULD SUCCEED. The server refuses an
          employee who is not READY, so drawing the button on a blocked row
          would be drawing a button that always fails. */}
      {isApprovable(row) ? (
        <Button
          size="xs"
          colorScheme="green"
          onClick={() => onApprove([row.employee_id])}
          isDisabled={!canApprove || disabled}
          isLoading={busy}
        >
          Approve &amp; Lock
        </Button>
      ) : null}
      {/* RESET CALCULATION opens the dialog; nothing is reset by this click.
          On an approved row it is drawn disabled, with the reason, so the
          answer to "why can't I reset this?" is on the row itself. */}
      {isResettable(row) ? (
        <Button
          size="xs"
          colorScheme="red"
          variant="ghost"
          onClick={() => onReset(row)}
          isDisabled={!canCalculate || disabled}
        >
          Reset Calculation
        </Button>
      ) : null}
      {/* THE LIFECYCLE: Unlock and Publish Payslip on an approved row; View
          Payslip, Retry Notification and Unpublish Payslip on a published one,
          whose Unlock is shown blocked until it is unpublished. */}
      {isUnlockable(row) && canUnlock ? (
        <Button size="xs" colorScheme="orange" variant="outline" onClick={() => onLifecycle("UNLOCK", row)} isDisabled={disabled}>
          Unlock
        </Button>
      ) : null}
      {isPublishable(row) && canPublish ? (
        <Button size="xs" colorScheme="blue" onClick={() => onLifecycle("PUBLISH", row)} isDisabled={disabled}>
          Publish Payslip
        </Button>
      ) : null}
      {hasPayslip(row) && onViewPayslip ? (
        <Button size="xs" colorScheme="blue" variant="ghost" onClick={() => onViewPayslip(row)} isDisabled={disabled}>
          View Payslip
        </Button>
      ) : null}
      {isNotificationRetryable(row) && canPublish && onRetryNotification ? (
        <Button
          size="xs"
          colorScheme="teal"
          variant="outline"
          onClick={() => onRetryNotification(row)}
          isDisabled={disabled}
          isLoading={busy}
        >
          Retry Notification
        </Button>
      ) : null}
      {isUnpublishable(row) && canPublish ? (
        <Button size="xs" colorScheme="blue" variant="outline" onClick={() => onLifecycle("UNPUBLISH", row)} isDisabled={disabled}>
          Unpublish Payslip
        </Button>
      ) : null}
      {isUnpublishable(row) && canUnlock ? (
        <span title="Published payroll must be unpublished before it can be unlocked.">
          <Button size="xs" colorScheme="orange" variant="outline" isDisabled>
            Unlock
          </Button>
        </span>
      ) : null}
      {isLocked(row) ? (
        <span title="Payroll is Approved & Locked for this employee. It cannot be reset.">
          <Button size="xs" colorScheme="red" variant="ghost" isDisabled>
            Reset Calculation
          </Button>
        </span>
      ) : null}
    </Stack>
  );
}

/**
 * WHAT IS STOPPING THIS EMPLOYEE, in the server's own words.
 *
 * THE RECALCULATION REASONS COME FIRST when there are any, because they are
 * the actionable ones: a moved source is fixed by pressing Recalculate, while
 * a pending OT approval is somebody else's job.
 */
function Reasons({ row }) {
  const reasons = [...(row.recalculation_reasons || []), ...(row.blockers || [])];
  if (reasons.length === 0) return null;
  /*
   * CALCULATED, NOT READY SAYS SO IN WORDS: these are the server's approval
   * blockers, and they are why this employee is in Calculated but not in
   * Ready for Approval.
   */
  const notReady = row.status === STATUS.CALCULATED;
  return (
    <Stack spacing={1}>
      {notReady ? (
        <Text fontSize="xs" fontWeight="600" color="orange.700" data-testid="not-ready-heading">
          Not ready for approval:
        </Text>
      ) : null}
      {reasons.map((reason) => (
        <Text
          key={reason.code}
          fontSize="xs"
          color="gray.600"
          whiteSpace="normal"
          title={reason.message || undefined}
        >
          {reason.label}
          {/* The exact dates, where the server named them. */}
          {Array.isArray(reason.not_final_dates) && reason.not_final_dates.length > 0
            ? `: ${reason.not_final_dates.slice(0, 3).map((d) => d.attendance_date).join(", ")}${reason.not_final_dates.length > 3 ? "…" : ""}`
            : Array.isArray(reason.dates) && reason.dates.length > 0
            ? `: ${reason.dates.slice(0, 3).join(", ")}${reason.dates.length > 3 ? "…" : ""}`
            : ""}
        </Text>
      ))}
    </Stack>
  );
}

function CalculationTable(props) {
  const { rows, selectedIds, onSelectChange } = props;
  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th width="1%" />
            <Th>Employee</Th>
            <Th isNumeric>Salary Days</Th>
            <Th isNumeric>Extra Days</Th>
            <Th isNumeric>Approved OT</Th>
            <Th isNumeric>Additions</Th>
            <Th isNumeric>Deductions</Th>
            <Th isNumeric>PF</Th>
            <Th isNumeric>ESI</Th>
            <Th isNumeric>Net Pay</Th>
            <Th>Pay Type</Th>
            <Th>Status</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.employee_id} opacity={isLocked(row) ? 0.75 : 1}>
              <Td>
                <Checkbox
                  colorScheme="purple"
                  isChecked={(selectedIds || []).includes(row.employee_id)}
                  isDisabled={false}
                  onChange={(e) => onSelectChange(row.employee_id, e.target.checked)}
                  aria-label={`Select ${row.employee_name || row.employee_id}`}
                />
              </Td>
              <Td>
                <Text fontSize="sm" fontWeight="medium">
                  {row.employee_name}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {row.employee_id} · {row.location || "—"}
                </Text>
              </Td>
              <Td isNumeric>{count(row.salary_days)}</Td>
              <Td isNumeric>{count(row.extra_days)}</Td>
              <Td isNumeric>{count(row.approved_ot_hours)}</Td>
              <Td isNumeric><Money value={row.additions} /></Td>
              <Td isNumeric><Money value={row.deductions} /></Td>
              <Td isNumeric><Money value={row.employee_pf} /></Td>
              <Td isNumeric><Money value={row.employee_esi} /></Td>
              <Td isNumeric>
                <Text fontSize="sm" fontWeight="bold" whiteSpace="nowrap">
                  {formatMoney(row.net_pay) === null ? "—" : formatMoney(row.net_pay)}
                </Text>
              </Td>
              <Td>
                <PayTypeCell {...props} row={row} />
              </Td>
              <Td>
                <Badge colorScheme={statusScheme(row.status)} whiteSpace="normal" textAlign="left">
                  {row.status_label}
                </Badge>
                <PayslipBadges row={row} />
                <Reasons row={row} />
              </Td>
              <Td>
                <RowActions row={row} {...props} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

/** One labelled fact. The label is small and grey; the value carries. */
function Field({ label, value, children }) {
  return (
    <Box minWidth={0}>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="0.04em">
        {label}
      </Text>
      {children || (
        <Text fontSize="sm" color="gray.800" whiteSpace="normal" wordBreak="break-word">
          {value}
        </Text>
      )}
    </Box>
  );
}

/**
 * ONE EMPLOYEE'S CALCULATED MONTH, ON A PHONE.
 *
 * WHY A CARD RATHER THAN THE TABLE. The table has thirteen columns, and the
 * three that matter most - Net Pay, Status and what to do about it - are the
 * last three. On a phone that means they are off the right-hand edge: present,
 * technically, behind a horizontal scroll nobody performs. A screen whose
 * purpose is to say what somebody will be paid and whether it can be signed
 * off was not saying either.
 *
 * NOTHING IS DROPPED AND NOTHING IS SUMMARISED. This is the same row, turned
 * ninety degrees, in the order somebody reads it: who, what they are owed,
 * what is stopping it, what you can do.
 */
function CalculationCard(props) {
  const { row, selectedIds, onSelectChange } = props;
  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      p={3}
      bg={isLocked(row) ? "green.50" : "white"}
    >
      <Stack spacing={3}>
        <Stack direction="row" align="flex-start" spacing={3}>
          <Checkbox
            colorScheme="purple"
            isChecked={(selectedIds || []).includes(row.employee_id)}
            isDisabled={false}
            onChange={(e) => onSelectChange(row.employee_id, e.target.checked)}
            aria-label={`Select ${row.employee_name || row.employee_id}`}
          />
          <Box flex="1" minWidth={0}>
            <Text fontSize="sm" fontWeight="bold">
              {row.employee_name}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {row.employee_id} · {row.location || "—"}
            </Text>
          </Box>
          <Badge colorScheme={statusScheme(row.status)} whiteSpace="normal" textAlign="right">
            {row.status_label}
          </Badge>
        </Stack>
        <PayslipBadges row={row} />

        <SimpleGrid columns={3} spacing={2}>
          <Field label="Salary Days" value={count(row.salary_days)} />
          <Field label="Extra Days" value={count(row.extra_days)} />
          <Field label="Approved OT" value={count(row.approved_ot_hours)} />
          <Field label="Additions"><Money value={row.additions} /></Field>
          <Field label="Deductions"><Money value={row.deductions} /></Field>
          <Field label="Pay Type">
            <PayTypeCell {...props} row={row} />
          </Field>
          <Field label="PF"><Money value={row.employee_pf} /></Field>
          <Field label="ESI"><Money value={row.employee_esi} /></Field>
          <Field label="Net Pay">
            <Text fontSize="sm" fontWeight="bold">
              {formatMoney(row.net_pay) === null ? "—" : formatMoney(row.net_pay)}
            </Text>
          </Field>
        </SimpleGrid>

        <Reasons row={row} />
        <RowActions {...props} />
      </Stack>
    </Box>
  );
}

function CalculationEmployeeList(props) {
  /* `useBreakpointValue` resolves to `undefined` on the first server render,
     which is falsy, so the table renders before the browser knows its width -
     the same default the initialization list takes. */
  const stacked = useBreakpointValue({ base: true, md: false });

  if (stacked) {
    return (
      <Stack spacing={3}>
        {props.rows.map((row) => (
          <CalculationCard key={row.employee_id} {...props} row={row} />
        ))}
      </Stack>
    );
  }
  return <CalculationTable {...props} />;
}

export default CalculationEmployeeList;
