import React from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Divider,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  formatRupees,
  printableLines,
  payTypeLabel,
  employeeFacts,
  attendanceFacts,
  statutoryFacts,
  finalFacts,
} from "../../util/payslipView";

/**
 * ONE PAYSLIP, FROM ITS FROZEN SNAPSHOT - used by the employee's Telegram Mini
 * App (My Payslips) and by payroll's View Payslip, so both read exactly the
 * same lines in exactly the same way. The server-rendered PDF uses the same
 * snapshot and the same "optional lines only when non-zero" rule.
 *
 * NOTHING IS CALCULATED HERE. Final Net Pay is the snapshot's rounded figure.
 */
function FactList({ rows }) {
  return (
    <Stack spacing={1}>
      {rows.map(([label, value]) => (
        <Stack key={label} direction="row" justify="space-between" spacing={3} fontSize="sm">
          <Text color="gray.600">{label}</Text>
          <Text textAlign="right" fontWeight="medium" wordBreak="break-word">
            {String(value)}
          </Text>
        </Stack>
      ))}
    </Stack>
  );
}

function LineList({ lines, totalLabel, total }) {
  return (
    <Stack spacing={1}>
      {printableLines(lines).map((line) => (
        <Stack key={line.key} direction="row" justify="space-between" fontSize="sm">
          <Text color="gray.700">{line.label}</Text>
          <Text whiteSpace="nowrap">{formatRupees(line.amount)}</Text>
        </Stack>
      ))}
      <Divider />
      <Stack direction="row" justify="space-between" fontSize="sm" fontWeight="bold">
        <Text>{totalLabel}</Text>
        <Text whiteSpace="nowrap">{formatRupees(total)}</Text>
      </Stack>
    </Stack>
  );
}

function Section({ title, children }) {
  return (
    <AccordionItem>
      <h3>
        <AccordionButton px={2}>
          <Box flex="1" textAlign="left" fontWeight="semibold" fontSize="sm">
            {title}
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h3>
      <AccordionPanel px={2} pb={3}>
        {children}
      </AccordionPanel>
    </AccordionItem>
  );
}

function PayslipDetail({ snapshot }) {
  if (!snapshot) return null;
  const e = snapshot.employee || {};
  const statutory = statutoryFacts(snapshot);
  return (
    <Stack spacing={3}>
      <Box borderWidth="1px" borderColor="green.200" bg="green.50" borderRadius="md" p={4}>
        <Text fontSize="xs" color="gray.600" textTransform="uppercase" letterSpacing="0.04em">
          Final Net Pay · {snapshot.period && snapshot.period.label}
        </Text>
        <Text fontSize="3xl" fontWeight="bold" lineHeight="short">
          {formatRupees(snapshot.final && snapshot.final.net_pay)}
        </Text>
        <Text fontSize="xs" color="gray.600">
          {[e.employee_name, payTypeLabel(e.pay_type)].filter(Boolean).join(" · ")}
        </Text>
      </Box>

      <Accordion allowMultiple defaultIndex={[2, 3]}>
        <Section title="Employee">
          <FactList rows={employeeFacts(snapshot)} />
        </Section>
        <Section title="Attendance / Salary Basis">
          <FactList rows={attendanceFacts(snapshot)} />
        </Section>
        <Section title="Earnings">
          <LineList
            lines={snapshot.earnings && snapshot.earnings.lines}
            totalLabel="Total Earnings"
            total={snapshot.earnings && snapshot.earnings.total}
          />
        </Section>
        <Section title="Deductions">
          <LineList
            lines={snapshot.deductions && snapshot.deductions.lines}
            totalLabel="Total Deductions"
            total={snapshot.deductions && snapshot.deductions.total}
          />
        </Section>
        {statutory.length > 0 ? (
          <Section title="Statutory Information">
            <FactList rows={statutory} />
          </Section>
        ) : null}
        <Section title="Net Pay">
          <FactList rows={finalFacts(snapshot)} />
        </Section>
      </Accordion>
    </Stack>
  );
}

export default PayslipDetail;
