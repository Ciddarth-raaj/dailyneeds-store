import React from "react";
import { Stack, useBreakpointValue } from "@chakra-ui/react";
import PayrunTable from "./PayrunTable";
import PayrunEmployeeCard from "./PayrunEmployeeCard";

/**
 * Payrun Initialization - the month's employees, in whichever shape the screen
 * can actually show.
 *
 *   md and up   the ten-column table, unchanged
 *   below md    one stacked card per employee
 *
 * THE SAME SWITCH `components/attendance/AttendanceDayList.jsx` AND
 * `components/attendance/ApprovalQueue.jsx` ALREADY MAKE, and deliberately the
 * same breakpoint: a phone gets cards, a tablet and a laptop get the table.
 * Inventing a third rule here would mean two attendance screens and one
 * payroll screen disagreeing about what "mobile" means.
 *
 * IT IS A CHOICE OF LAYOUT AND NOTHING ELSE. Both branches receive the same
 * props, render the same shared cells, apply the same permissions and send the
 * same actions; neither filters, sorts or recomputes anything. A row that
 * cannot be initialized on a desktop cannot be initialized on a phone, because
 * it is the same rule module answering in both.
 *
 * `useBreakpointValue` RESOLVES TO `undefined` ON THE FIRST SERVER RENDER,
 * which is falsy, so the table is what renders before the browser knows its
 * own width. That is the right default: the table is the layout that has
 * always worked, and the card is the correction applied once the width is
 * known.
 */
function PayrunEmployeeList(props) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {props.rows.map((row) => (
          <PayrunEmployeeCard key={row.employee_id} row={row} {...props} />
        ))}
      </Stack>
    );
  }

  return <PayrunTable {...props} />;
}

export default PayrunEmployeeList;
