import React from "react";
import { Badge, Button, Checkbox, Select, Stack, Text, Tooltip } from "@chakra-ui/react";
import { reasonText } from "../../util/payrunSelection";
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
 * and `reasonText` are the existing shared modules, imported rather than
 * restated; nothing in this file decides eligibility, calculates a payroll
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

/** READY / BLOCKED / INITIALIZED, exactly as the server said it. */
export function StatusBadge({ row }) {
  return <Badge colorScheme={STATUS_COLOR[row.status] || "gray"}>{row.status}</Badge>;
}

/**
 * The approved monthly gross, formatted and never computed.
 *
 * A gross that has not been approved is NOT zero - it is unknown, and
 * rendering it as 0 would read as "this person is paid nothing".
 */
export function grossText(row) {
  if (row.monthly_gross === null || row.monthly_gross === undefined) return "—";
  return Number(row.monthly_gross).toLocaleString("en-IN");
}

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

/**
 * EVERY BLOCKING REASON, IN FULL, AND THE WARNINGS UNDER THEM.
 *
 * NOT BEHIND A TOOLTIP, ON EITHER LAYOUT. The whole point of this screen is to
 * tell a payroll clerk exactly what is outstanding, and a reason somebody has
 * to hover to discover is a reason they will not read on a phone at all -
 * there is no hover on a touch screen. `whiteSpace="normal"` so a long reason
 * wraps instead of being clipped.
 *
 * A WARNING IS NOT A BLOCKING REASON and is coloured differently: missing bank
 * details do not stop a month being initialized.
 */
export function ReasonsBlock({ row, fontSize = "xs" }) {
  const reasons = reasonText(row);
  const warnings = row.warnings || [];
  if (!reasons && warnings.length === 0) return null;
  return (
    <Stack spacing={0.5}>
      {reasons ? (
        <Text fontSize={fontSize} color="red.600" whiteSpace="normal">
          {reasons}
        </Text>
      ) : null}
      {warnings.map((warning) => (
        <Text key={warning.code} fontSize={fontSize} color="orange.600" whiteSpace="normal">
          {warning.message}
        </Text>
      ))}
    </Stack>
  );
}

/**
 * THE MONTHLY PAY TYPE - a control only once the month is INITIALIZED and only
 * for somebody who holds the key.
 *
 * Before initialization there is no month-specific record to change: the value
 * shown is the default it WOULD start on, which is the Employee Master's and
 * nothing else's. The server re-checks the permission on every request; this
 * decides whether to draw the control.
 */
export function PayTypeControl({ row, canChangePayType, busy, onPayTypeChange, size = "xs", width = "90px" }) {
  if (row.initialized && canChangePayType) {
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
  return (
    <Tooltip
      label={
        row.initialized
          ? "You do not have permission to change the pay type"
          : "Defaulted from the Employee Master, and from nothing else. It becomes changeable, for this month only, once initialized."
      }
    >
      <Text fontSize="xs">{row.pay_type}</Text>
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
