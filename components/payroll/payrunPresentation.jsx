import React, { useRef } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Stack,
  Text,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_SCHEME,
} from "../../util/payrunTabs";
import { isRowInitializable } from "../../util/payrunAccess";

/**
 * Payrun Initialization - the cells, shared by the table and the card.
 *
 * WHY THIS FILE EXISTS. The screen renders the same month two ways - a table
 * on a desktop, stacked cards on a phone - and every value on both comes from
 * the same server response. If each layout formatted its own gross, drew its
 * own status badge and decided its own disabled state, the two would drift:
 * one would round a figure the other did not, or offer an Initialize button
 * the other correctly withheld. The layouts differ; what they SAY must not.
 *
 * SO THE RULES LIVE HERE ONCE, AND THEY ARE NOT NEW RULES. `isRowInitializable`
 * is the existing shared module, imported rather than restated, and the
 * blocking reasons are rendered exactly as the server sent them - its compact
 * label and its sentence. Nothing in this file decides eligibility, names a
 * blocker, calculates a payroll
 * figure or reads a permission of its own. It renders what it is handed.
 *
 * `rowIsBusy` IS THE ONE PIECE OF SHARED ARITHMETIC, and it is about the
 * screen rather than about payroll: a row is busy while its own request is in
 * flight, or while a bulk action has the whole list disabled.
 */

const STATUS_COLOR = {
  READY: "green",
  BLOCKED: "red",
  INITIALIZED: "purple",
};

/** Is this row's control disabled because something is in flight? */
export function rowIsBusy(row, busyEmployeeId, disabled) {
  return busyEmployeeId === row.employee_id || Boolean(disabled);
}

/**
 * May this row be ticked or initialized RIGHT NOW?
 *
 * The permission and the server's status, in that order, and the same answer
 * for both layouts and for both controls - a checkbox that could be ticked on
 * a row whose button is withheld is how a blocked employee ends up in a bulk
 * selection.
 */
export function rowIsSelectable(row, canInitialize) {
  return isRowInitializable(row) && Boolean(canInitialize);
}

/**
 * READY / BLOCKED / INITIALIZED, exactly as the server said it - AND, for a
 * BLOCKED row, the way into why.
 *
 * THE BADGE SAYS ONLY THE STATUS. No count, no reason, no suffix: this is a
 * list somebody scans down, and "BLOCKED" is the whole of what a scan needs.
 * How many and which are the next question, and they are one interaction away.
 *
 * WHAT OPENS IS THE COMPACT LABELS, ONE PER LINE, AND NOTHING ELSE. The
 * server's `message` - the sentence explaining why a blocker exists - is
 * deliberately NOT rendered anywhere on this screen. It still arrives on every
 * reason and a later screen may use it; here it was prose in a place meant for
 * a glance.
 *
 * THE INTERACTION HAS TO WORK FOR A MOUSE AND A FINGER, AND THE OBVIOUS WAYS
 * DO NOT. `trigger="hover"` (what `PunchTimeCell` uses) never opens on a touch
 * screen - there is no hover to give. `trigger="click"` works everywhere but
 * makes a desktop user click for something a hover should have shown. And the
 * naive fix - hover handlers plus a click handler - is worse than either:
 * a tap fires `pointerenter` AND `click` on most mobile browsers, so the open
 * and the toggle cancel each other and the popover flickers shut under the
 * finger that opened it.
 *
 * SO THE POPOVER IS CONTROLLED, AND EACH POINTER GETS THE GESTURE THAT SUITS
 * IT, decided from `pointerType` rather than from a screen-width guess:
 *
 *   mouse    hovering opens it, leaving closes it - and a click keeps it open
 *            rather than toggling, so a click after a hover is never a close
 *   touch    a tap toggles it; the hover handlers ignore the synthetic
 *            pointerenter that precedes it, which is what stops the flicker
 *   keyboard focus opens, blur closes, Enter/Space toggles
 *
 * `autoFocus={false}` so that merely hovering does not yank focus out of
 * whatever the person was doing.
 */
export function StatusBadge({ row }) {
  const { isOpen, onOpen, onClose, onToggle } = useDisclosure();
  /* What kind of pointer last touched this badge - a click event cannot be
     asked, so the pointerdown that preceded it is remembered. */
  const lastPointer = useRef("mouse");

  const plainBadge = (
    <Badge colorScheme={STATUS_COLOR[row.status] || "gray"}>{row.status}</Badge>
  );

  const reasons = row.blocking_reasons || [];
  if (reasons.length === 0) return plainBadge;

  const isMouse = (event) => (event.pointerType || "mouse") === "mouse";

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom-start"
      autoFocus={false}
      isLazy
    >
      <PopoverTrigger>
        <Badge
          colorScheme={STATUS_COLOR[row.status] || "gray"}
          cursor="pointer"
          role="button"
          tabIndex={0}
          textDecoration="underline dotted"
          aria-label={`${row.status}. Show the reasons.`}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType || "mouse";
          }}
          onPointerEnter={(e) => {
            if (isMouse(e)) onOpen();
          }}
          onPointerLeave={(e) => {
            if (isMouse(e)) onClose();
          }}
          onClick={() => {
            /* A mouse has already opened it by hovering; toggling here would
               close it on the click that was meant to pin it open. */
            if (lastPointer.current === "mouse") onOpen();
            else onToggle();
          }}
          onFocus={onOpen}
          onBlur={onClose}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          {row.status}
        </Badge>
      </PopoverTrigger>
      <PopoverContent w="auto" maxW="260px" fontSize="xs">
        <PopoverArrow />
        <PopoverBody>
          {/* ONE COMPACT LABEL PER LINE. Every blocker the server reported,
              in the order it reported them, and nothing else. */}
          <Stack spacing={1}>
            {reasons.map((reason) => (
              <Text key={reason.code} color="red.600" whiteSpace="normal">
                {reason.label || reason.code}
              </Text>
            ))}
          </Stack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

/*
 * THERE IS NO `grossText` HERE ANY MORE, AND THAT IS DELIBERATE.
 *
 * The Approved Monthly Gross was removed from this screen: Initialization is
 * about WHETHER a month can be taken, not what it is worth, and a salary
 * figure against every name turned a work queue into a payroll disclosure that
 * everybody who can open the screen could read over somebody's shoulder.
 *
 * NOTHING WAS REMOVED FROM THE BACKEND. The snapshot still stores the gross,
 * the structure and the salary reference, and the API still sends
 * `monthly_gross` - this screen simply does not render it. It belongs on the
 * calculation / review screen, where the figure is the point.
 */

/**
 * WHO HAD LEFT BY THE END OF THIS MONTH - the server's dated answer.
 *
 * Shown because nothing defaults a leaver's pay type any more: whoever works
 * the month decides whether this person's final pay goes by bank or in cash,
 * and they cannot decide it without being able to see who has left. It is a
 * badge and never an input - the pay type beside it comes from the Employee
 * Master regardless, and this component renders no control at all.
 */
export function ExitedBadge({ row, ml = 2 }) {
  if (!row.exited_in_month) return null;
  return (
    <Tooltip label="Left on or before the end of this payroll month. Their pay type still defaults from the Employee Master - change it here if this month should be paid in cash.">
      <Badge ml={ml} colorScheme="orange" fontSize="0.6rem">
        Exited
      </Badge>
    </Tooltip>
  );
}

/*
 * THERE IS NO `WarningsBlock` HERE ANY MORE.
 *
 * The one warning this screen ever showed was "Bank details are missing. This
 * does not block initialization; it is a payment readiness issue." - two lines
 * of orange text on every card of every employee HR has not collected an
 * account for, which on a phone was a third of the card's height.
 *
 * IT WAS SAYING SOMETHING THE ROW ALREADY SAYS. Pay Type sits beside it and
 * reads BANK or CASH; whether an account exists is that field's business, and
 * the readiness question belongs to the payment/bank-processing stage where
 * somebody can act on it. A warning that neither blocks anything nor tells you
 * something new is height.
 *
 * NOTHING REPLACES IT - no badge, no icon, no popover. The warning is not
 * being relocated, it is not being shown here at all.
 *
 * THE SERVER STILL PRODUCES IT, deliberately untouched: `payrun_eligibility`
 * still reports BANK_DETAILS_MISSING and the API still sends `warnings` on
 * every row, so the later payment stage has it waiting. This screen simply
 * does not render it - the same presentation-only removal the gross had.
 */

/**
 * THE MONTHLY PAY TYPE - one control, drawn on every payrun screen that offers
 * it, and it is the SAME control on all of them.
 *
 * WHERE IT APPEARS. Initialization, where the month's pay type first exists,
 * and Calculation & Review, where somebody looking at what an employee will
 * actually be paid is the person most likely to notice that it has to go out
 * in cash. Making the second screen show the value but not let anybody change
 * it meant walking back a stage to do it - and the two stages would have had
 * to agree, separately, about when it may be changed.
 *
 * WHEN IT IS A CONTROL RATHER THAN A WORD:
 *
 *   before initialization   a word. There is no month-specific record to
 *                           change yet; what is shown is the default it WOULD
 *                           start on, which is the Employee Master's
 *   after APPROVE & LOCK    a word. The approval committed to how the money
 *                           travels; a later Unlock makes it a control again
 *   no permission           a word
 *   otherwise               a control, through Initialization, Adjustments and
 *                           Calculation & Review alike
 *
 * `editable` IS HOW A SCREEN SAYS THE SECOND OF THOSE. Left alone it means
 * "initialized", which is the initialization screen's question; the
 * calculation screen passes `!isLocked(row)`. Neither answer is invented here
 * and neither is trusted: the server re-checks the permission AND the lock on
 * every request and refuses in its own words.
 */
export function PayTypeControl({
  row,
  canChangePayType,
  busy,
  onPayTypeChange,
  size = "xs",
  width = "90px",
  editable = null,
  readOnlyReason = null,
}) {
  const mayEdit = (editable === null ? Boolean(row.initialized) : Boolean(editable)) &&
    Boolean(canChangePayType);

  if (mayEdit) {
    return (
      <Select
        size={size}
        width={width}
        value={row.pay_type}
        isDisabled={busy}
        onChange={(e) => onPayTypeChange(row.employee_id, e.target.value)}
        aria-label={`Pay type for employee ${row.employee_id}`}
      >
        <option value="BANK">BANK</option>
        <option value="CASH">CASH</option>
      </Select>
    );
  }
  const reason =
    readOnlyReason ||
    (row.initialized
      ? "You do not have permission to change the pay type"
      : "Defaulted from the Employee Master, and from nothing else. It becomes changeable, for this month only, once initialized.");
  return (
    <Tooltip label={reason}>
      <Text fontSize="xs" aria-label={`Pay type for employee ${row.employee_id}`}>
        {row.pay_type}
      </Text>
    </Tooltip>
  );
}

/**
 * INITIALIZE, or - for a month already taken - when it was taken.
 *
 * A BLOCKED ROW'S BUTTON IS DISABLED RATHER THAN HIDDEN, because the reasons
 * are printed beside it: a control somebody can see but not press, next to the
 * sentence explaining why, is the pair that tells them what to go and fix.
 */
export function InitializeControl({ row, selectable, busy, busyEmployeeId, onInitialize, size = "xs", width }) {
  if (row.initialized) {
    return (
      <Text fontSize="xs" color="gray.600">
        {row.initialized_at || "Initialized"}
      </Text>
    );
  }
  return (
    <Button
      size={size}
      width={width}
      colorScheme="purple"
      isDisabled={!selectable || busy}
      isLoading={busyEmployeeId === row.employee_id}
      onClick={() => onInitialize(row.employee_id)}
    >
      Initialize
    </Button>
  );
}

/** The selection tick. Only a selectable row has one that can be ticked. */
export function SelectCheckbox({ row, selectable, busy, selectedIds, onSelectChange, children }) {
  return (
    <Checkbox
      colorScheme="purple"
      isChecked={selectedIds.includes(row.employee_id)}
      isDisabled={!selectable || busy}
      onChange={(e) => onSelectChange(row.employee_id, e.target.checked)}
      aria-label={`Select employee ${row.employee_id}`}
    >
      {children}
    </Checkbox>
  );
}

/**
 * WHETHER THIS EMPLOYEE'S ATTENDANCE IS READY FOR PAYROLL, as a badge that
 * opens the detail when there is a detail to open.
 *
 * THREE STATES AND THREE COLOURS, and CLOSED IS NOT GREEN. An employee whose
 * attendance was closed for payroll is being paid on a basis somebody accepted
 * with known gaps in it; one who is READY had no gaps. Both are payable and
 * only one is settled, and whoever approves the month is entitled to see which
 * of the two they are signing - so they never share a badge.
 *
 * PENDING AND CLOSED ARE BOTH CLICKABLE, because both have something to say:
 * pending says what is still outstanding, closed says what was accepted. READY
 * is a full stop and opens nothing.
 */
export function AttendanceStatusBadge({ row, onOpen }) {
  const status = row && row.attendance_status;
  if (!status) return null;

  const label = ATTENDANCE_STATUS_LABEL[status] || status;
  const scheme = ATTENDANCE_STATUS_SCHEME[status] || "gray";
  const count = Number(row.attendance_unresolved_count || 0);
  const openable = status !== ATTENDANCE_STATUS.READY && typeof onOpen === "function";

  const badge = (
    <Badge colorScheme={scheme} whiteSpace="normal" textAlign="left">
      {label}
      {count > 0 ? ` · ${count}` : ""}
    </Badge>
  );

  if (!openable) return badge;
  return (
    <Box
      as="button"
      type="button"
      onClick={() => onOpen(row)}
      aria-label={`Attendance ${label} for ${row.employee_name || row.employee_id}`}
      textAlign="left"
    >
      {badge}
    </Box>
  );
}
