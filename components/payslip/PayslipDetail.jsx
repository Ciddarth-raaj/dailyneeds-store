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
  advanceFacts,
  employerContributionFacts,
  ctcFacts,
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

/** Earnings in green, deductions in red - the PDF's colours, and nowhere else. */
function LineList({ lines, totalLabel, total, tone }) {
  return (
    <Stack spacing={1}>
      {printableLines(lines).map((line) => (
        <Stack key={line.key} direction="row" justify="space-between" fontSize="sm">
          <Text color="gray.700">{line.label}</Text>
          <Text whiteSpace="nowrap">{formatRupees(line.amount)}</Text>
        </Stack>
      ))}
      <Divider borderColor={`${tone}.200`} />
      <Stack direction="row" justify="space-between" fontSize="sm" fontWeight="bold" color={`${tone}.700`}>
        <Text>{totalLabel}</Text>
        <Text whiteSpace="nowrap">{formatRupees(total)}</Text>
      </Stack>
    </Stack>
  );
}

/* Daily Needs brand purple (the logo's own); orange is an accent only. */
const BRAND = { purple: "#732f8d", purpleDark: "#4a1a63", purpleTint: "#f5effa", orange: "#f15a22" };

function Section({ title, children, color = BRAND.purpleDark }) {
  return (
    <AccordionItem>
      <h3>
        <AccordionButton px={2}>
          <Box flex="1" textAlign="left" fontWeight="semibold" fontSize="sm" color={color}>
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
  const advance = advanceFacts(snapshot);
  const contribution = employerContributionFacts(snapshot);
  const ctc = ctcFacts(snapshot);
  return (
    <Stack spacing={3}>
      <Box
        bg={BRAND.purpleDark}
        color="white"
        borderRadius="md"
        borderBottomWidth="3px"
        borderBottomColor={BRAND.orange}
        p={4}
      >
        <Text fontSize="xs" opacity={0.85} textTransform="uppercase" letterSpacing="0.04em">
          Final Net Pay · {snapshot.period && snapshot.period.label}
        </Text>
        <Text fontSize="3xl" fontWeight="bold" lineHeight="short">
          {formatRupees(snapshot.final && snapshot.final.net_pay)}
        </Text>
        <Text fontSize="xs" opacity={0.85}>
          {[e.employee_name, payTypeLabel(e.pay_type)].filter(Boolean).join(" · ")}
        </Text>
      </Box>

      <Accordion allowMultiple defaultIndex={[2, 3]}>
        <Section title="Employee Details">
          <FactList rows={employeeFacts(snapshot)} />
        </Section>
        <Section title="Attendance / Salary Basis">
          <FactList rows={attendanceFacts(snapshot)} />
        </Section>
        <Section title="Earnings / Additions" color="green.700">
          <LineList
            tone="green"
            lines={snapshot.earnings && snapshot.earnings.lines}
            totalLabel="Total Earnings"
            total={snapshot.earnings && snapshot.earnings.total}
          />
        </Section>
        <Section title="Deductions / Less" color="red.700">
          <LineList
            tone="red"
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
        {advance.length > 0 ? (
          <Section title="Advance Details">
            <FactList rows={advance} />
          </Section>
        ) : null}
        {contribution.length > 0 ? (
          <Section title="Employer Contribution">
            <FactList rows={contribution} />
            <Text fontSize="xs" color="gray.500" mt={2}>
              This month&apos;s, paid by the company over and above your salary; not part of Earnings or
              Deductions.
            </Text>
          </Section>
        ) : null}
        {ctc.length > 0 ? (
          <Section title="CTC &amp; Take Home">
            <FactList rows={ctc} />
            <Text fontSize="xs" color="gray.500" mt={2}>
              Fixed by your salary structure; changes only on a salary revision.
            </Text>
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
