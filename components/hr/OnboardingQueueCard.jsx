import React from "react";
import Link from "next/link";
import { Avatar, Badge, Box, Button, Stack, Text, Wrap, WrapItem } from "@chakra-ui/react";
import { statusBadge } from "../../util/hrOnboardingQueue";

/**
 * One employee in the Onboarding / Pending HR queue, as a CARD - the mobile
 * half of the same queue the table shows on a desktop.
 *
 * WHY A CARD AND NOT THE TABLE. The queue answers "whose record is not
 * finished, and what is missing", which is nine columns wide: an employee, a
 * location, five statuses and an action. Nine columns on a 400px screen is
 * either a horizontal scrollbar or five illegible ones, and HR reads this
 * screen on a phone while chasing people. So the same row is laid out down
 * the card instead of across it: who they are, then which sections are
 * outstanding, then the way in.
 *
 * IT DECIDES NOTHING. Every value is already a tri-state computed by
 * `util/hrOnboardingQueue.js` from the server's summary, and the chips are
 * drawn by the same `statusBadge` the table cells use - so a colour here can
 * never say something the desktop table or the counts disagree with.
 *
 * NOTHING SENSITIVE IS RENDERED: no Aadhaar digits, no account number, no
 * PAN, UAN, PF or ESI number, no salary and no CTC. Only whether a section is
 * outstanding, which is all the row carries.
 */
function OnboardingQueueCard({ row, canSeePaymentRoute = false }) {
  /**
   * The four statuses in the order the work actually happens - identity, the
   * account, the statutory decision, payroll - then how the employee is paid,
   * and the overall answer last, because it is the summary of the four.
   *
   * "Paid by" sits between them and HR on purpose: it explains the Bank chip
   * above it and is visibly not part of the HR answer below it.
   */
  const chips = [
    { label: "Aadhaar", value: row.aadhaar, labels: { completeLabel: "Verified" } },
    { label: "Bank", value: row.bank, labels: { completeLabel: "Verified" } },
    { label: "Statutory", value: row.statutory },
    { label: "Payroll", value: row.payroll },
    // THE PAYMENT ROUTE, NOT A FIFTH OUTSTANDING ITEM. Bank reads "Not
    // applicable" for anybody paid in cash, and on a phone - where there is no
    // column header to explain it - that would be a puzzle without this chip
    // beside it. Labelled by the route rather than by Pending/Complete,
    // because "still on cash" is a migration somebody is running and not a
    // fault in this employee's record.
    // Absent, not blank, without `view_employee_sensitive` - the route names
    // a sensitive fact, and a chip reading "—" for everyone would be noise.
    ...(canSeePaymentRoute
      ? [{ label: "Paid by", value: row.cashToBank, labels: { pendingLabel: "Cash", completeLabel: "Bank" } }]
      : []),
    { label: "HR", value: row.hr },
  ];

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" p={4}>
      <Stack direction="row" spacing={3} align="center" mb={3}>
        <Avatar size="sm" name={row.employee_name || undefined} src={row.employee_image || undefined} />
        <Box minW="0" flex="1">
          <Text fontFamily="mono" fontWeight="bold" fontSize="sm" color="gray.900">
            {row.employee_id}
          </Text>
          <Text fontSize="sm" color="gray.700" noOfLines={1}>
            {row.employee_name || "Unnamed"}
          </Text>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {row.store_name || "—"}
          </Text>
        </Box>
        {/* The one action on this screen, and it is the same one the table
            offers: the work is done on the employee's own profile. */}
        <Link href={`/hr/employees/${row.employee_id}`} passHref>
          <Button size="xs" colorScheme="purple" variant="outline" flexShrink={0}>
            Open
          </Button>
        </Link>
      </Stack>

      {/* Wrap, not a fixed grid: five chips of different widths reflow onto
          as many lines as the screen needs instead of being squeezed. */}
      <Wrap spacing={2}>
        {chips.map((chip) => {
          const b = statusBadge(chip.value, chip.labels);
          return (
            <WrapItem key={chip.label}>
              <Badge
                colorScheme={b.colorScheme}
                variant={b.unknown ? "outline" : "subtle"}
                fontSize="10px"
                px={2}
                py={1}
                borderRadius="md"
                textTransform="none"
              >
                {chip.label}: {b.label}
              </Badge>
            </WrapItem>
          );
        })}
      </Wrap>
    </Box>
  );
}

export default OnboardingQueueCard;
