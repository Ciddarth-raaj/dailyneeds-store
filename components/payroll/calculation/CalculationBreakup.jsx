import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Divider,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";

import { formatMoney } from "../../../util/salaryView";
import { statusScheme } from "../../../util/payrunCalculation";

/**
 * ONE EMPLOYEE'S FULL BREAKUP - the whole of what they are being paid, and why.
 *
 * WHY THE DETAIL EXISTS AT ALL. The list answers "what is the net pay and can
 * it be approved". This answers the question somebody asks immediately
 * afterwards, which is "why is it that number" - and it has to be answerable
 * before anybody signs it off, because an approval that cannot be explained to
 * the person it belongs to is not a review.
 *
 * FIVE GROUPS, IN THE ORDER THE CONTRACT STATES THEM: salary, OT, adjustments,
 * statutory, final. THE GROUPING IS THE SERVER'S - it arrives as `breakup` -
 * because which figures belong to salary and which are statutory IS the
 * explanation, and a browser regrouping them would be a second opinion about
 * what a payslip line is.
 *
 * IT SHOWS THE STORED CALCULATION AND NEVER A FRESH ONE. When a source has
 * moved since, this shows what was calculated, with the warning above it -
 * which is exactly the case where the difference matters most. A screen that
 * quietly recomputed would hide the thing the badge beside it is warning about.
 *
 * THE BALANCE ADVANCE IS DRAWN AND LABELLED AS INFORMATIONAL, in its own row,
 * apart from the deductions. It is in no total on this screen because it is in
 * no total anywhere: it moves no money, and printing it beside two real
 * deductions without saying so is how somebody reads it as a third one.
 */

/** One line of a breakup: a label on the left, a figure on the right. */
function Line({ label, value, note, strong = false, muted = false }) {
  const text = typeof value === "number" || typeof value === "string" ? value : null;
  return (
    <Stack direction="row" justify="space-between" align="baseline" spacing={4}>
      <Box minWidth={0}>
        <Text fontSize="sm" color={muted ? "gray.500" : "gray.700"} fontWeight={strong ? "bold" : "normal"}>
          {label}
        </Text>
        {note ? (
          <Text fontSize="xs" color="gray.500" whiteSpace="normal">
            {note}
          </Text>
        ) : null}
      </Box>
      <Text
        fontSize={strong ? "md" : "sm"}
        fontWeight={strong ? "bold" : "medium"}
        whiteSpace="nowrap"
        color={muted ? "gray.500" : undefined}
      >
        {text === null || text === undefined || text === "" ? "—" : text}
      </Text>
    </Stack>
  );
}

function Group({ title, children }) {
  return (
    <Box>
      <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="0.06em" mb={2}>
        {title}
      </Text>
      <Stack spacing={1}>{children}</Stack>
    </Box>
  );
}

const money = (value) => {
  const text = formatMoney(value);
  return text === null ? "—" : text;
};

const numberOrDash = (value) =>
  value === null || value === undefined ? "—" : String(value);

function CalculationBreakup({ isOpen, onClose, employee, loading, error }) {
  const breakup = employee && employee.breakup;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">
          {employee ? employee.employee_name : "Employee"}
          {employee ? (
            <Badge ml={2} colorScheme={statusScheme(employee.status)}>
              {employee.status_label}
            </Badge>
          ) : null}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {loading ? (
            <Stack direction="row" align="center" spacing={2}>
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.600">
                Loading the breakup…
              </Text>
            </Stack>
          ) : null}

          {error ? (
            <Alert status="error" fontSize="sm">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}

          {!loading && !error && !breakup ? (
            <Text fontSize="sm" color="gray.600">
              This employee has not been calculated for this month yet, so there is nothing to
              explain. Calculate them to see the breakup.
            </Text>
          ) : null}

          {breakup ? (
            <Stack spacing={5}>
              {/* THE STALE WARNING SITS ABOVE THE FIGURES, not beside them.
                  Somebody reading a net pay has to know, before they read it,
                  that it no longer describes the current sources. */}
              {(employee.recalculation_reasons || []).length > 0 ? (
                <Alert status="warning" fontSize="sm">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">
                      These figures are as calculated. A source has changed since.
                    </Text>
                    {employee.recalculation_reasons.map((reason) => (
                      <Text key={reason.code} fontSize="xs">
                        {reason.message}
                      </Text>
                    ))}
                  </Box>
                </Alert>
              ) : null}

              <Group title="Salary">
                <Line label="Monthly Gross" value={money(breakup.salary.monthly_gross)} />
                <Line label="Daily Rate" value={money(breakup.salary.daily_rate)} note="Monthly Gross ÷ 26" />
                <Line label="Salary Days" value={numberOrDash(breakup.salary.salary_days)} />
                <Line label="Salary Earnings" value={money(breakup.salary.salary_earnings)} />
                <Line label="Missing Hours" value={numberOrDash(breakup.salary.missing_hours)} />
                <Line
                  label="Missing Hours Deduction"
                  value={money(breakup.salary.missing_hours_deduction)}
                />
                <Line label="Extra Days" value={numberOrDash(breakup.salary.extra_days)} />
                <Line
                  label="Extra Day Amount"
                  value={money(breakup.salary.extra_day_amount)}
                  note="Paid separately. Not part of the PF or ESI wage."
                />
              </Group>

              <Divider />

              <Group title="Overtime">
                <Line label="Approved OT Hours" value={numberOrDash(breakup.ot.approved_ot_hours)} />
                <Line
                  label="Effective NRM"
                  value={
                    breakup.ot.effective_nrm_minutes === null ||
                    breakup.ot.effective_nrm_minutes === undefined
                      ? "—"
                      : `${breakup.ot.effective_nrm_minutes} min`
                  }
                  /* WHERE THE NRM CAME FROM, ON THE ROW. Two employees on one
                     shift may have different OT rates ONLY when one of them
                     has a lunch/break override, and this is what says which
                     case this is. */
                  note={
                    breakup.ot.effective_nrm_source === "EMPLOYEE_OVERRIDE"
                      ? "This employee's own break override, as attendance resolved it"
                      : "The assigned shift's NRM, as attendance resolved it"
                  }
                />
                <Line
                  label="OT Hourly Rate"
                  value={money(breakup.ot.ot_hourly_rate)}
                  note="Daily Rate ÷ Effective NRM"
                />
                <Line label="OT Amount" value={money(breakup.ot.ot_amount)} />
              </Group>

              <Divider />

              <Group title="Adjustments">
                <Line label="Incentive" value={money(breakup.adjustments.incentive)} />
                <Line label="Bonus" value={money(breakup.adjustments.bonus)} />
                <Line label="Arrears" value={money(breakup.adjustments.arrears)} />
                <Line label="Advance Recovery" value={money(breakup.adjustments.advance_recovery)} />
                <Line label="Shortage Recovery" value={money(breakup.adjustments.shortage_recovery)} />
                <Line
                  label="Balance Advance (Informational)"
                  value={money(breakup.adjustments.balance_advance)}
                  note="Carried for reference. It changes no figure on this screen."
                  muted
                />
              </Group>

              <Divider />

              <Group title="Statutory">
                <Line
                  label="PF Wage"
                  value={money(breakup.statutory.pf_wage)}
                  note="Earned Basic for the Salary Days only"
                />
                <Line label="Employee PF" value={money(breakup.statutory.employee_pf)} />
                <Line label="Employer EPF" value={money(breakup.statutory.employer_epf)} />
                <Line label="Employer EPS" value={money(breakup.statutory.employer_eps)} />
                <Line
                  label="ESI Wage"
                  value={money(breakup.statutory.esi_wage)}
                  note="Eligible normal salary earnings only"
                />
                <Line label="Employee ESI" value={money(breakup.statutory.employee_esi)} />
                <Line label="Employer ESI" value={money(breakup.statutory.employer_esi)} />
              </Group>

              <Divider />

              <Group title="Final">
                <Line label="Total Earnings" value={money(breakup.final.total_earnings)} />
                <Line
                  label="Total Employee Deductions"
                  value={money(breakup.final.total_employee_deductions)}
                />
                <Line label="Net Pay" value={money(breakup.final.net_pay)} strong />
                <Line label="Pay Type" value={breakup.final.pay_type} />
              </Group>

              {/* AN UNRESOLVED STATUTORY QUESTION IS SHOWN AS A QUESTION. The
                  salary engine answers what it cannot establish with a named
                  reason rather than a plausible zero, and an employee carrying
                  one cannot be approved - so the reason belongs where the
                  person deciding will see it. */}
              {(breakup.unresolved || []).length > 0 || (breakup.errors || []).length > 0 ? (
                <Alert status="warning" fontSize="sm">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">This calculation left a question open.</Text>
                    {(breakup.errors || []).map((message) => (
                      <Text key={message} fontSize="xs">
                        {message}
                      </Text>
                    ))}
                    {(breakup.unresolved || []).map((item) => (
                      <Text key={`${item.component}-${item.code}`} fontSize="xs">
                        {item.component}: {item.code}
                      </Text>
                    ))}
                  </Box>
                </Alert>
              ) : null}

              {employee.approved_at ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                  <Text fontSize="xs" color="gray.600">
                    Approved and locked at {employee.approved_at}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    Calculation reference {employee.calculation_hash}
                  </Text>
                </SimpleGrid>
              ) : null}
            </Stack>
          ) : null}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default CalculationBreakup;
