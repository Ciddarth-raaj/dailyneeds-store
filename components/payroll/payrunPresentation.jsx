import React from "react";
import {
  Badge,
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
} from "@chakra-ui/react";
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
 * THE REASONS USED TO BE PRINTED IN A COLUMN OF THEIR OWN, in full sentences.
 * That column was the widest thing on the screen and it pushed everything else
 * off a phone; it also meant forty rows of explanatory prose for a list
 * somebody is scanning rather than reading. The reasons are now behind the
 * badge that says there are some.
 *
 * NOTHING IS HIDDEN THAT WAS DECIDED ELSEWHERE. Every reason the server sent
 * is in the popover, in full, with its compact label first - none is dropped,
 * summarised or truncated, and the rules behind them are untouched.
 *
 * ONE INTERACTION FOR BOTH, AND IT IS CLICK. `components/attendance/PunchTimeCell.jsx`
 * opens its popover on HOVER, which is right for a desktop-only affordance and
 * useless on a phone - there is no hover on a touch screen, so a hover-only
 * reason is a reason a mobile user can never read. Click is the one trigger a
 * desktop click and a mobile tap both perform, so both get the same thing.
 * `tabIndex` and a `button` role so it is reachable from the keyboard too.
 */
export function StatusBadge({ row }) {
  const badge = (
    <Badge colorScheme={STATUS_COLOR[row.status] || "gray"}>{row.status}</Badge>
  );

  const reasons = row.blocking_reasons || [];
  if (reasons.length === 0) return badge;

  return (
    <Popover placement="bottom-start" isLazy>
      <PopoverTrigger>
        <Badge
          colorScheme={STATUS_COLOR[row.status] || "gray"}
          cursor="pointer"
          role="button"
          tabIndex={0}
          textDecoration="underline dotted"
          aria-label={`${row.status} - ${reasons.length} reason${reasons.length === 1 ? "" : "s"}. Open for details.`}
        >
          {row.status} ({reasons.length})
        </Badge>
      </PopoverTrigger>
      <PopoverContent w="auto" maxW="320px" fontSize="xs">
        <PopoverArrow />
        <PopoverBody>
          <Stack spacing={2}>
            {reasons.map((reason) => (
              <Stack key={reason.code} spacing={0}>
                {/* THE COMPACT BUSINESS LABEL, which is the server's and not
                    this screen's - see `constants/payrun.js`. */}
                <Text fontWeight="600" color="red.600">
                  {reason.label || reason.code}
                </Text>
                {/* And the sentence that says what to go and fix, for somebody
                    who has stopped on this row deliberately. */}
                {reason.message && reason.message !== reason.label ? (
                  <Text color="gray.600">{reason.message}</Text>
                ) : null}
              </Stack>
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

/**
 * THE WARNINGS - and only the warnings.
 *
 * A WARNING IS NOT A BLOCKING REASON, which is why it stayed on the row when
 * the reasons moved behind the badge: missing bank details do not stop a month
 * being initialized, nothing shows that somebody must click to discover it,
 * and there is at most one of them. A blocker says "you cannot"; a warning
 * says "you will have to deal with this", and the second is worth a line.
 *
 * Blocking reasons are on `StatusBadge` above, in full.
 */
export function WarningsBlock({ row, fontSize = "xs" }) {
  const warnings = row.warnings || [];
  if (warnings.length === 0) return null;
  return (
    <Stack spacing={0.5}>
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
