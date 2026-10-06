import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Divider,
  Flex,
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
import { statusScheme, formatViewedAt } from "../../../util/payrunCalculation";
import { describePfScenario, identifierPieces, pfRuleReferences } from "../../../util/pfScenarioDisplay";

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

/**
 * ONE LINE OF A BREAKUP: a label on the left, a figure on the right - and, on a
 * screen too narrow for both, the figure on its own line under the label.
 *
 * WHY IT IS BUILT THIS WAY. The line used to be a two-item row whose figure
 * could not wrap (`nowrap`) or shrink, beside a label allowed to shrink to
 * nothing (`minWidth: 0`). A long figure - a PF rule reference is sixty
 * characters with no space in it - therefore ran out of the modal, and took the
 * label's width with it until "PF ceiling rule" was printed one letter per
 * line. Now:
 *
 *   the row WRAPS, so a figure that does not fit beside its label moves below
 *     it instead of squeezing it;
 *   the label keeps a real minimum width (10rem, or the whole line when the
 *     line is narrower) and wraps between words only;
 *   a short figure (money, a count) never breaks; a long one wraps, at any
 *     point only when it has to, and only inside its own line;
 *   the note takes the whole width under both, and may break anywhere - it is
 *     where explanatory text and identifiers go.
 */
const LONG_VALUE = 24;

function Line({ label, value, note, strong = false, muted = false }) {
  const text = typeof value === "number" || typeof value === "string" ? value : null;
  const shown = text === null || text === undefined || text === "" ? "—" : text;
  const long = String(shown).length > LONG_VALUE;
  return (
    <Flex
      data-breakup-line=""
      wrap="wrap"
      align="baseline"
      minWidth={0}
      sx={{ columnGap: "1rem", rowGap: "2px" }}
    >
      <Text
        data-breakup-label=""
        as="span"
        flex="1 1 10rem"
        minWidth="min(10rem, 100%)"
        fontSize="sm"
        color={muted ? "gray.500" : "gray.700"}
        fontWeight={strong ? "bold" : "normal"}
        whiteSpace="normal"
        sx={{ overflowWrap: "break-word", wordBreak: "normal" }}
      >
        {label}
      </Text>
      <Text
        data-breakup-value=""
        as="span"
        marginLeft="auto"
        maxWidth="100%"
        minWidth={0}
        textAlign="right"
        flex={long ? "0 1 auto" : "0 0 auto"}
        fontSize={strong ? "md" : "sm"}
        fontWeight={strong ? "bold" : "medium"}
        whiteSpace={long ? "normal" : "nowrap"}
        sx={long ? { overflowWrap: "anywhere" } : undefined}
        color={muted ? "gray.500" : undefined}
      >
        {shown}
      </Text>
      {note ? (
        <Text
          data-breakup-note=""
          flexBasis="100%"
          minWidth={0}
          fontSize="xs"
          color="gray.500"
          whiteSpace="normal"
          sx={{ overflowWrap: "anywhere" }}
        >
          {note}
        </Text>
      ) : null}
    </Flex>
  );
}

/**
 * A MACHINE REFERENCE UNDER ITS LABEL - one per line, breaking after its own
 * separators (EPFO- / CEILING- / 15000- ...) before it would ever break
 * mid-word, and never wider than the modal.
 */
function ReferenceLine({ label, items, muted = true }) {
  if (!items || items.length === 0) return null;
  return (
    <Box data-breakup-line="" minWidth={0}>
      <Text data-breakup-label="" fontSize="sm" color={muted ? "gray.500" : "gray.700"}>
        {label}
      </Text>
      {items.map((item) => (
        <Text
          key={item}
          data-breakup-reference=""
          fontSize="xs"
          color="gray.500"
          fontFamily="mono"
          whiteSpace="normal"
          sx={{ overflowWrap: "anywhere" }}
        >
          {identifierPieces(item).map((piece, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <React.Fragment key={i}>
              {piece}
              <wbr />
            </React.Fragment>
          ))}
        </Text>
      ))}
    </Box>
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

/**
 * Where attendance got this NRM from, said in words rather than in an enum.
 *
 * NO SOURCE MEANS NO SENTENCE. While the attendance month is not settled the
 * server sends no NRM and no source, and the old default - "the assigned
 * shift's NRM, as attendance resolved it" - would be describing a resolution
 * that has not happened.
 */
function nrmSourceNote(source) {
  if (!source) return null;
  return source === "EMPLOYEE_OVERRIDE"
    ? "this employee's own break override, as attendance resolved it"
    : "the assigned shift's NRM, as attendance resolved it";
}

function CalculationBreakup({ isOpen, onClose, employee, loading, error }) {
  const breakup = employee && employee.breakup;
  /*
   * THE OT BREAKDOWN AS THE SERVER PRICED IT. One entry is the ordinary case
   * and reads exactly as it did before; more than one means there is no single
   * rate, and the list below is the only honest account of the amount. The
   * browser groups nothing and prices nothing - it renders what came back.
   */
  const otGroups = (breakup && Array.isArray(breakup.ot.ot_groups) ? breakup.ot.ot_groups : []);
  const effectiveNrm =
    otGroups.length === 1 ? otGroups[0].nrm_minutes : breakup && breakup.ot.effective_nrm_minutes;
  const effectiveNrmSource =
    otGroups.length === 1 ? otGroups[0].nrm_source : breakup && breakup.ot.effective_nrm_source;
  const pfScenario = breakup ? describePfScenario(breakup.statutory.pf_scenario) : null;
  const pfRules = breakup ? pfRuleReferences(breakup.statutory.pf_ceiling_version) : [];

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
            <Stack spacing={5} minWidth={0}>
              {/* THE STALE WARNING SITS ABOVE THE FIGURES, not beside them.
                  Somebody reading a net pay has to know, before they read it,
                  that it no longer describes the current sources. */}
              {/*
                  AND THE PENDING NOTICE SITS ABOVE THEM TOO, for the same
                  reason. Most of the figures below are an em dash rather than
                  a number, and somebody has to be told that is because nobody
                  has settled the attendance yet - not because this employee is
                  owed nothing. The stored calculation is still there and still
                  what a recalculation will refresh; what is absent is the
                  claim that its attendance-priced figures are answers.
              */}
              {employee.attendance_pending ? (
                <Alert status="info" fontSize="sm">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">
                      Attendance for this month is not settled yet.
                    </Text>
                    <Text fontSize="xs">
                      The salary days, overtime, PF, ESI and net pay are shown as &mdash; because
                      they would be priced from an attendance month nobody has finalised. The
                      adjustments and the pay type below are this payrun&rsquo;s own and are shown
                      as they stand. Once attendance is final, recalculate this employee to see
                      the real figures.
                    </Text>
                  </Box>
                </Alert>
              ) : null}

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

                {/*
                  ONE NRM OR SEVERAL, AND THE SCREEN SAYS WHICH.

                  The hourly rate is Daily Rate ÷ NRM, so an hour worked
                  against an 8-hour day and an hour worked against an 11-hour
                  day are worth different amounts. An employee with approved OT
                  on both has NO single rate, and the server reports none - so
                  showing one here would be inventing a figure that priced none
                  of the money. In that case the groups are listed instead,
                  each with the minutes, the rate and the amount it produced.
                */}
                {otGroups.length > 1 ? (
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      This month&rsquo;s overtime was worked against more than one NRM, so each part
                      is priced at its own rate.
                    </Text>
                    {otGroups.map((group) => (
                      <Line
                        key={`${group.nrm_minutes}-${group.nrm_source}`}
                        label={`${numberOrDash(group.approved_ot_hours)} h at NRM ${group.nrm_minutes} min`}
                        value={money(group.ot_amount)}
                        note={`${money(group.ot_hourly_rate)} per hour · ${nrmSourceNote(
                          group.nrm_source
                        )}`}
                      />
                    ))}
                  </Box>
                ) : (
                  <>
                    <Line
                      label="Effective NRM"
                      value={
                        effectiveNrm === null || effectiveNrm === undefined
                          ? "—"
                          : `${effectiveNrm} min`
                      }
                      /* WHERE THE NRM CAME FROM, ON THE ROW. Two employees on
                         one shift may have different OT rates ONLY when one of
                         them has a lunch/break override, and this is what says
                         which case this is. */
                      note={nrmSourceNote(effectiveNrmSource)}
                    />
                    <Line
                      label="OT Hourly Rate"
                      value={money(
                        otGroups.length === 1 ? otGroups[0].ot_hourly_rate : breakup.ot.ot_hourly_rate
                      )}
                      note="Daily Rate ÷ Effective NRM"
                    />
                  </>
                )}

                <Line label="OT Amount" value={money(breakup.ot.ot_amount)} strong={otGroups.length > 1} />
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
                {breakup.statutory.eps_wage !== null && breakup.statutory.eps_wage !== undefined ? (
                  <Line label="EPS Wage" value={money(breakup.statutory.eps_wage)} muted />
                ) : null}
                {breakup.statutory.edli !== null && breakup.statutory.edli !== undefined ? (
                  <Line
                    label="EDLI (Employer)"
                    value={money(breakup.statutory.edli)}
                    note={`On EDLI wage ${money(breakup.statutory.edli_wage)}`}
                    muted
                  />
                ) : null}
                {/*
                  A MONTH CUT BY A PF CEILING CHANGE. September 2026 is charged
                  on 15,000 for 01-16 and on 25,000 for 17-30 (EPFO revision
                  w.e.f. 17-09-2026). The server computed both periods; this
                  prints each one so the single PF figure above can be checked.
                */}
                {Array.isArray(breakup.statutory.pf_segments) && breakup.statutory.pf_segments.length > 1
                  ? breakup.statutory.pf_segments.map((p) => (
                      <Line
                        key={p.from}
                        label={`PF ${p.from} to ${p.to}`}
                        value={p.state ? (describePfScenario(p.state) || {}).status : null}
                        note={`EE ${money(p.employee_pf)} · EPS ${money(p.employer_eps)} · Ceiling ${money(p.monthly_wage_ceiling)} (applied ${money(p.applied_wage_ceiling)} for ${p.calendar_days} days) · PF wage ${money(p.pf_wage)} · EPS wage ${money(p.eps_wage)}`}
                        muted
                      />
                    ))
                  : null}
                {/*
                  WHICH CASE THE MONTH WAS. The server stores it as one code -
                  e.g. FAQ_B:EPF_ONLY>EPF_EPS|ACTUAL_WAGE - which carries the
                  period state(s), the contribution basis and the EPFO FAQ case.
                  Each is shown as its own labelled line, in words; nothing is
                  decided here (see util/pfScenarioDisplay.js).
                */}
                {pfScenario ? (
                  <>
                    <Line label="PF Scenario" value={pfScenario.status} muted />
                    {pfScenario.basis ? (
                      <Line label="PF Contribution Basis" value={pfScenario.basis} muted />
                    ) : null}
                    {pfScenario.faq ? <Line label="PF Case" value={pfScenario.faq} muted /> : null}
                  </>
                ) : null}
                {/* The rule reference(s): one per line, wrapping at their own separators. */}
                <ReferenceLine
                  label={pfRules.length > 1 ? "PF ceiling rules" : "PF ceiling rule"}
                  items={pfRules}
                />
                {breakup.statutory.pf_exact ? (
                  <Line
                    label="PF Exact (before rounding)"
                    value={money(breakup.statutory.pf_exact.total_remittance)}
                    note={`EE ${money(breakup.statutory.pf_exact.employee_pf)} · EPS ${money(breakup.statutory.pf_exact.employer_eps)} · ER EPF ${money(breakup.statutory.pf_exact.employer_epf)} · EDLI ${money(breakup.statutory.pf_exact.edli)} · Admin ${money(breakup.statutory.pf_exact.pf_admin_charge)}`}
                    muted
                  />
                ) : null}
                <Line
                  label="ESI Wage"
                  value={money(breakup.statutory.esi_wage)}
                  note="Eligible normal salary earnings only"
                />
                <Line label="Employee ESI" value={money(breakup.statutory.employee_esi)} />
                <Line label="Employer ESI" value={money(breakup.statutory.employer_esi)} />
                {/*
                  WHY AN ABOVE-CEILING EMPLOYEE IS STILL CONTRIBUTING.

                  ESI coverage is decided once per contribution period and runs
                  to the end of it, so a contribution charged on a wage above
                  the ceiling is correct rather than an error - and the person
                  reviewing it should not have to take that on trust or go and
                  ask. The server decides it; this prints its answer.
                */}
                {breakup.statutory.esi_contribution_period_continues === true ? (
                  <Line
                    label="Contribution period"
                    value={`${breakup.statutory.esi_period_start} to ${breakup.statutory.esi_period_end}`}
                    note={`Covered at entry on ${breakup.statutory.esi_coverage_entry_date}, so coverage continues to the end of the period whatever the wage does.`}
                    muted
                  />
                ) : null}
              </Group>

              <Divider />

              <Group title="Final">
                <Line label="Total Earnings" value={money(breakup.final.total_earnings)} />
                <Line
                  label="Total Employee Deductions"
                  value={money(breakup.final.total_employee_deductions)}
                />
                {/* Net Pay is paid in whole rupees; the rounding is the server's
                    stored figure, shown so the totals still add up. */}
                {breakup.final.net_pay_rounding !== null && breakup.final.net_pay_rounding !== undefined ? (
                  <Line label="Net Pay Rounding" value={money(breakup.final.net_pay_rounding)} />
                ) : null}
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
                    Approved and locked at {formatViewedAt(employee.approved_at) || employee.approved_at} IST
                  </Text>
                  <Text fontSize="xs" color="gray.600" minWidth={0} sx={{ overflowWrap: "anywhere" }}>
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
