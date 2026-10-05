import React from "react";
import {
  Badge,
  Box,
  Checkbox,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useBreakpointValue,
} from "@chakra-ui/react";

import { formatMoney } from "../../../util/salaryView";
import { PayTypeControl } from "../payrunPresentation";
import {
  BadgeCheckIcon,
  BellRingIcon,
  CalculatorIcon,
  CalendarCheckIcon,
  FileTextIcon,
  LockOpenIcon,
  MoreVerticalIcon,
  ReceiptIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SendIcon,
  Undo2Icon,
} from "./rowActionIcons";
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

/**
 * WHY A DISABLED ICON IS DISABLED, in words, for its tooltip. The business
 * rule is already decided by the caller; this only names it. A bulk action in
 * flight comes first because it is the one that clears by itself.
 */
const BUSY_REASON = "Please wait - a bulk action is running.";
const NO_CALCULATE_REASON =
  "You do not have permission to calculate payroll, or this payroll month is locked.";
const NO_APPROVE_REASON =
  "You do not have permission to approve payroll, or this payroll month is locked.";

/**
 * ONE ROW ACTION AS AN ICON BUTTON, with its name on hover and focus.
 *
 * THE NAME IS NEVER ONLY A COLOUR OR A SHAPE: every button carries its action
 * as `aria-label` and as a tooltip, and an unavailable one says why in the
 * tooltip. A disabled button fires no pointer events, so it sits inside a
 * focusable span that does - the reason is reachable by mouse and keyboard.
 */
function ActionIcon({ label, reason, icon, onClick, isDisabled, isLoading, colorScheme = "gray", size }) {
  const unavailable = Boolean(isDisabled);
  const button = (
    <IconButton
      aria-label={label}
      icon={icon}
      size={size}
      variant="outline"
      colorScheme={colorScheme}
      onClick={onClick}
      isDisabled={unavailable}
      isLoading={isLoading}
      aria-busy={isLoading ? true : undefined}
      pointerEvents={unavailable ? "none" : undefined}
    />
  );
  return (
    <Tooltip
      label={unavailable && reason ? `${label} - ${reason}` : label}
      hasArrow
      placement="top"
      shouldWrapChildren={unavailable}
    >
      {button}
    </Tooltip>
  );
}

/**
 * THE ROW'S ACTIONS, AS COMPACT ICONS IN FIXED SLOTS.
 *
 *   [Detail] [Calculate | Recalculate] [Approve & Lock] [Reset Calculation]
 *
 * then [More], which holds whichever lifecycle actions this row's status
 * offers. The slots are drawn on every row so the icons line up down the table
 * and never wrap; one that does not apply to this row is drawn disabled, with
 * the reason, rather than dropped. WHICH ACTION APPLIES, AND WHETHER IT IS ENABLED, IS DECIDED BY
 * EXACTLY THE PREDICATES AND PERMISSIONS IT ALWAYS WAS - only the drawing
 * changed.
 */
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
  size = "sm",
}) {
  const busy = busyEmployeeId === row.employee_id;
  const calculateReason = disabled ? BUSY_REASON : !canCalculate ? NO_CALCULATE_REASON : null;
  const approveReason = disabled ? BUSY_REASON : !canApprove ? NO_APPROVE_REASON : null;
  const gap = size === "sm" ? "4px" : "8px";
  return (
    <Box display="flex" flexWrap="nowrap" alignItems="center" sx={{ gap }} data-testid="row-actions">
      <Box display="flex" flexWrap="nowrap" alignItems="center" sx={{ gap }} data-testid="row-actions-core">
        <ActionIcon
          label="Detail"
          icon={<FileTextIcon />}
          size={size}
          onClick={() => onOpen(row)}
          isDisabled={disabled}
          reason={BUSY_REASON}
        />
        {/* CALCULATE AND RECALCULATE SHARE ONE SLOT, drawn for what it would do.
            CALCULATE ONLY WHERE THE SERVER SAYS IT WOULD BE ACCEPTED. */}
        {isCalculable(row) ? (
          <ActionIcon
            label="Calculate"
            icon={<CalculatorIcon />}
            size={size}
            colorScheme="purple"
            onClick={() => onRecalculate(row, { first: true })}
            isDisabled={!canCalculate || disabled}
            isLoading={busy}
            reason={calculateReason}
          />
        ) : isRecalculable(row) ? (
          <ActionIcon
            label="Recalculate"
            icon={<RefreshCwIcon />}
            size={size}
            colorScheme={row.status === STATUS.RECALCULATION_REQUIRED ? "orange" : "gray"}
            onClick={() => onRecalculate(row, { first: false })}
            isDisabled={!canCalculate || disabled}
            isLoading={busy}
            reason={calculateReason}
          />
        ) : (
          <ActionIcon
            label="Recalculate"
            icon={<RefreshCwIcon />}
            size={size}
            isDisabled
            reason={
              isLocked(row)
                ? "Payroll is Approved & Locked for this employee. It cannot be recalculated."
                : "Cannot be calculated yet - see the reasons on this row."
            }
          />
        )}
        {/* APPROVE IS ENABLED ONLY WHERE IT WOULD SUCCEED. The server refuses an
            employee who is not READY, so on any other row it is drawn disabled. */}
        {isApprovable(row) ? (
          <ActionIcon
            label="Approve & Lock"
            icon={<BadgeCheckIcon />}
            size={size}
            colorScheme="green"
            onClick={() => onApprove([row.employee_id])}
            isDisabled={!canApprove || disabled}
            isLoading={busy}
            reason={approveReason}
          />
        ) : (
          <ActionIcon
            label="Approve & Lock"
            icon={<BadgeCheckIcon />}
            size={size}
            isDisabled
            reason={
              isLocked(row)
                ? "Already Approved & Locked."
                : "Only employees Ready for Approval can be approved."
            }
          />
        )}
        {/* RESET CALCULATION opens the dialog; nothing is reset by this click.
            On an approved row it is drawn disabled, with the reason, so the
            answer to "why can't I reset this?" is on the row itself. */}
        {isResettable(row) ? (
          <ActionIcon
            label="Reset Calculation"
            icon={<RotateCcwIcon />}
            size={size}
            onClick={() => onReset(row)}
            isDisabled={!canCalculate || disabled}
            reason={calculateReason}
          />
        ) : (
          <ActionIcon
            label="Reset Calculation"
            icon={<RotateCcwIcon />}
            size={size}
            isDisabled
            reason={
              isLocked(row)
                ? "Payroll is Approved & Locked for this employee. It cannot be reset."
                : "Nothing to reset - this employee has not been calculated."
            }
          />
        )}
      </Box>
      <MoreActions
        items={[
          /* PROCESS ATTENDANCE, where the server says re-running the attendance
             month would clear what blocks this employee. */
          isAttendanceProcessable(row) && canProcessAttendance
            ? {
                label: "Process Attendance",
                icon: <CalendarCheckIcon />,
                onClick: () => onProcessAttendance(row),
                isDisabled: disabled || busy,
                showsLoading: true,
              }
            : null,
          /* THE LIFECYCLE: Unlock and Publish Payslip on an approved row; View
             Payslip, Retry Notification and Unpublish Payslip on a published
             one, whose Unlock is shown blocked until it is unpublished. */
          isUnlockable(row) && canUnlock
            ? { label: "Unlock", icon: <LockOpenIcon />, onClick: () => onLifecycle("UNLOCK", row), isDisabled: disabled }
            : null,
          isPublishable(row) && canPublish
            ? { label: "Publish Payslip", icon: <SendIcon />, onClick: () => onLifecycle("PUBLISH", row), isDisabled: disabled }
            : null,
          hasPayslip(row) && onViewPayslip
            ? { label: "View Payslip", icon: <ReceiptIcon />, onClick: () => onViewPayslip(row), isDisabled: disabled }
            : null,
          isNotificationRetryable(row) && canPublish && onRetryNotification
            ? {
                label: "Retry Notification",
                icon: <BellRingIcon />,
                onClick: () => onRetryNotification(row),
                isDisabled: disabled || busy,
                showsLoading: true,
              }
            : null,
          isUnpublishable(row) && canPublish
            ? { label: "Unpublish Payslip", icon: <Undo2Icon />, onClick: () => onLifecycle("UNPUBLISH", row), isDisabled: disabled }
            : null,
          isUnpublishable(row) && canUnlock
            ? {
                label: "Unlock",
                icon: <LockOpenIcon />,
                isDisabled: true,
                reason: "Published payroll must be unpublished before it can be unlocked.",
              }
            : null,
        ].filter(Boolean)}
        busy={busy}
        disabled={disabled}
        size={size}
      />
    </Box>
  );
}

/**
 * THE LESS-COMMON ACTIONS, BEHIND ONE "MORE" BUTTON, so every row keeps its
 * four primary icons on one line. Which items appear, and whether each is
 * enabled, is decided by the same predicates and permissions the inline
 * buttons used; a blocked item stays listed with its reason in words.
 *
 * The button is drawn on every row so the column lines up; on a row with
 * nothing more to do it is disabled and says so. The list renders in a portal
 * so the table's horizontal scroll box cannot clip it.
 */
function MoreActions({ items, busy, disabled, size }) {
  const none = items.length === 0;
  const loading = busy && items.some((item) => item.showsLoading);
  if (none || disabled) {
    return (
      <ActionIcon
        label="More actions"
        icon={<MoreVerticalIcon />}
        size={size}
        isDisabled
        reason={none ? "No other actions for this employee." : BUSY_REASON}
      />
    );
  }
  return (
    <Menu placement="bottom-end" isLazy>
      <Tooltip label="More actions" hasArrow placement="top">
        <MenuButton
          as={IconButton}
          aria-label="More actions"
          icon={<MoreVerticalIcon />}
          size={size}
          variant="outline"
          isLoading={loading}
          aria-busy={loading ? true : undefined}
        />
      </Tooltip>
      <Portal>
        <MenuList fontSize="sm" minWidth="220px" maxWidth="300px" zIndex="dropdown">
          {items.map((item, index) => (
            <MenuItem
              key={`${item.label}-${index}`}
              icon={item.icon}
              onClick={item.onClick}
              isDisabled={item.isDisabled}
            >
              <Text as="span" display="block">
                {item.label}
              </Text>
              {item.isDisabled && item.reason ? (
                <Text as="span" display="block" fontSize="xs" color="gray.600" whiteSpace="normal">
                  {item.reason}
                </Text>
              ) : null}
            </MenuItem>
          ))}
        </MenuList>
      </Portal>
    </Menu>
  );
}

/**
 * THE ROW'S STATUS, SMALL. A dot for the eye and the server's label for the
 * meaning - the colour is never the only signal. The summary cards above
 * already group the month by status, so the row does not repeat a large badge.
 */
function StatusIndicator({ row }) {
  return (
    <Stack direction="row" spacing={1.5} align="baseline" data-testid="row-status">
      <Box
        as="span"
        flexShrink={0}
        boxSize="8px"
        borderRadius="full"
        bg={`${statusScheme(row.status)}.400`}
        aria-hidden="true"
      />
      <Text fontSize="xs" color="gray.700" fontWeight="500" lineHeight="short">
        {row.status_label}
      </Text>
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
  const hold = row.statutory_hold || null;
  /*
   * THE STATUTORY SETUP HOLD COMES FIRST AND STANDS OUT. It is not something
   * payroll can fix by pressing a button: HR must complete the named fields in
   * Employee Master (Statutory details). Until then the employee cannot be
   * calculated or approved, and nothing is assumed for them. The generic
   * blocker with the same code is not repeated below it.
   */
  /*
   * NOT CALCULATED, TWO WAYS. An employee Calculate would accept is simply
   * awaiting calculation; one it would refuse (`calculable === false`) -
   * the statutory setup hold, or another readiness reason - is blocked from
   * it, and says why. The bare "Not calculated" blocker repeats the status
   * badge, so it is not listed again for either.
   */
  const notCalculated = row.status === STATUS.NOT_CALCULATED;
  const blockedFromCalculation = notCalculated && row.calculable === false;
  const reasons = [...(row.recalculation_reasons || []), ...(row.blockers || [])].filter(
    (r, i, all) =>
      !(hold && r.code === "STATUTORY_SETUP_INCOMPLETE") &&
      !(notCalculated && r.code === "NOT_CALCULATED") &&
      all.findIndex((x) => x.code === r.code) === i
  );
  if (notCalculated && !blockedFromCalculation && !hold) {
    return (
      <Text fontSize="xs" color="gray.500" data-testid="awaiting-calculation">
        Awaiting calculation
      </Text>
    );
  }
  if (reasons.length === 0 && !hold) return null;
  /*
   * CALCULATED, NOT READY SAYS SO IN WORDS: these are the server's approval
   * blockers, and they are why this employee is in Calculated but not in
   * Ready for Approval.
   */
  const notReady = row.status === STATUS.CALCULATED && reasons.length > 0;
  return (
    <Stack spacing={1}>
      {blockedFromCalculation ? (
        <Text fontSize="xs" fontWeight="600" color="orange.700" data-testid="blocked-from-calculation-heading">
          Cannot be calculated yet:
        </Text>
      ) : null}
      {hold ? (
        <Box title={hold.message || undefined}>
          <Badge colorScheme="orange" fontSize="0.65rem">
            On hold - statutory setup incomplete
          </Badge>
          <Text fontSize="xs" color="orange.700" whiteSpace="normal" mt={1}>
            HR to complete: {(hold.missing_labels || []).join(", ")}
          </Text>
        </Box>
      ) : null}
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
            <Th>Actions</Th>
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
                <StatusIndicator row={row} />
                <PayslipBadges row={row} />
                <Reasons row={row} />
              </Td>
              <Td minWidth="190px">
                <RowActions {...props} row={row} />
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
          <StatusIndicator row={row} />
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
        <Box overflowX="auto">
          <RowActions {...props} size="md" />
        </Box>
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
