import React from "react";
import Link from "next/link";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Divider,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";
import OpeningSalaryForm from "./OpeningSalaryForm";
import useEmployeeMasterSalary from "../../../customHooks/useEmployeeMasterSalary";
import { presentCurrentSalary, formatMoney, formatEffectiveFrom } from "../../../util/salaryView";
import {
  REVISION_SCREEN_PATH,
  STATE,
  canEnterOpeningSalary,
  resolvePayrollState,
  showRevisionLink,
} from "../../../util/employeeMasterPayroll";

/**
 * Section 7 of the employee master: Payroll.
 *
 * WHERE AN EMPLOYEE'S FIRST SALARY IS ENTERED, AND NOWHERE ELSE IN THIS SCREEN.
 * M3 built this card read-only, which was right for a card that only displayed
 * pay and wrong for onboarding: the person filling in somebody's record is the
 * person who knows what they are being paid, and sending them to a different
 * screen to type one number is how people go live with no salary on file. So
 * the opening salary is entered HERE - once, while the employee has no salary
 * at all - and every later change is a revision made on Payroll > Salary
 * Revision & History.
 *
 * THE CARD IS NEVER A SECOND REVISION SCREEN. The moment a proposal exists,
 * pending or approved, this becomes a display and a signpost. There is no
 * amend control here, no approve control, no reject control and no effective
 * date to choose; a second place to REVISE a salary is a second answer to what
 * somebody is paid.
 *
 * FOUR STATES, DECIDED BY THE SERVER'S OWN DATA - see
 * `util/employeeMasterPayroll.js`, which reads the resolver's answer and the
 * whole history and compares no date to a browser clock:
 *
 *   NO_SALARY          nothing live (rejected-only counts as nothing, exactly
 *                      as the backend counts it). With `add_salary`, the
 *                      opening-salary entry. Without it, the plain sentence.
 *   PENDING            a proposal is waiting for a decision. Shown in full,
 *                      with no second create form, and - with `edit_salary` -
 *                      a link to amend it where amendments live.
 *   CURRENT_APPROVED   the M3 read-only display, unchanged.
 *   FUTURE_APPROVED    approved but not yet in force. The resolver answers
 *                      `null` for this person exactly as it does for somebody
 *                      with nothing at all, and saying "no salary" here would
 *                      offer a second opening salary the server then refuses.
 *
 * EVERY FIGURE COMES FROM THE SERVER. Nothing on this card is recalculated in
 * the browser, and the legacy `new_employee.salary` column is not read at all;
 * the Employee Master stopped writing it in M1 and does not show it.
 *
 * AND PENDING IS NOT ZERO. Where the backend could not resolve a statutory
 * figure it says so with a named reason; the cell reads "Pending" with that
 * reason underneath rather than inventing a contribution. See
 * `util/salaryView.js`.
 *
 * A FAILED READ IS NOT AN EMPTY SALARY. One of those is a record somebody has
 * to create and the other is a server that did not answer, and HR would chase
 * the wrong one.
 */

/** One label/figure pair. Pending and Not applicable are styled as answers. */
function Amount({ label, cell, emphasis = false }) {
  if (!cell) return null;
  const tone =
    cell.kind === "pending"
      ? "orange.600"
      : cell.kind === "not_applicable"
      ? "gray.500"
      : "gray.800";

  return (
    <Box minW="0">
      <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500">
        {label}
      </Text>
      <Text
        fontSize={emphasis ? "lg" : "sm"}
        fontWeight={emphasis ? "bold" : "medium"}
        color={tone}
        wordBreak="break-word"
      >
        {cell.text}
      </Text>
      {cell.reason ? (
        <Text fontSize="10px" color="gray.500" mt={0.5}>
          {cell.reason}
        </Text>
      ) : null}
    </Box>
  );
}

/** A titled group of figures. Two columns on a phone, four on a desktop. */
function Group({ title, columns = { base: 2, md: 4 }, children }) {
  return (
    <Box>
      <Text fontSize="11px" fontWeight="bold" color="gray.600" mb={1.5}>
        {title}
      </Text>
      <SimpleGrid columns={columns} spacingX={4} spacingY={3}>
        {children}
      </SimpleGrid>
    </Box>
  );
}

/**
 * The one link this card ever offers, and it goes to the screen that owns
 * revisions. Never a form, never an action taken here.
 */
function RevisionLink({ children }) {
  return (
    <Link href={REVISION_SCREEN_PATH} passHref>
      <a style={{ textDecoration: "underline", fontWeight: 600 }}>{children}</a>
    </Link>
  );
}

/**
 * The five approved groups, in the approved order — the M3 display, unchanged.
 *
 * Used for an approved record, a pending proposal and a future-dated approved
 * one alike: the figures are stored figures either way, and one renderer means
 * they cannot be described differently on the same card.
 */
function SalaryStructure({ view }) {
  return (
    <Stack spacing={4}>
      {/* ------------------------------------------ A. Salary Summary -- */}
      <Group title="Salary Summary" columns={{ base: 2, md: 4 }}>
        <Amount label="Monthly Gross" cell={view.summary.monthly_gross} />
        {/* Gross / 26, taken from the backend's own `daily_salary`: the
            divisor is a payroll rule and belongs where the rule lives. */}
        <Amount label="Daily Salary (Gross / 26)" cell={view.summary.daily_salary} />
        <Box minW="0">
          <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500">
            Effective From
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="gray.800">
            {view.summary.effective_from || "not recorded"}
          </Text>
        </Box>
        {view.summary.status ? (
          <Box minW="0">
            <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500">
              Status
            </Text>
            {/* The badge follows the record's own status: a pending structure
                must not be dressed as an approved one. */}
            <Badge
              colorScheme={view.summary.status === "APPROVED" ? "green" : "orange"}
              variant="subtle"
              fontSize="9px"
            >
              {view.summary.status}
            </Badge>
          </Box>
        ) : null}
      </Group>

      {/* ---------------------------------------- B. Salary Structure -- */}
      <Group title="Salary Structure">
        {view.structure.map((row) => (
          <Amount key={row.label} label={row.label} cell={row.cell} />
        ))}
      </Group>

      {/* ------------------------------------- C. Employee Deductions -- */}
      <Group title="Employee Deductions" columns={{ base: 2, md: 4 }}>
        {view.employeeDeductions.map((row) => (
          <Amount key={row.label} label={row.label} cell={row.cell} />
        ))}
      </Group>

      {/* --------------------------------- D. Employer Contributions -- */}
      <Group title="Employer Contributions" columns={{ base: 2, md: 5 }}>
        {view.employerContributions.map((row) => (
          <Amount key={row.label} label={row.label} cell={row.cell} />
        ))}
      </Group>

      {/* -------------------------------------------- E. Monthly CTC -- */}
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={3} py={2}>
        <Amount label="Monthly CTC" cell={view.ctc} emphasis />
      </Box>
    </Stack>
  );
}

/**
 * A proposal nobody has decided yet, shown in full and with nothing to press.
 *
 * The figures are the STORED ones, presented by the same presenter the approved
 * display uses - so a pending structure and an approved one read identically
 * except for the word Pending.
 */
function PendingProposal({ pending, canAmend }) {
  const view = presentCurrentSalary(pending);
  return (
    <Stack spacing={3}>
      <Alert status="warning" fontSize="sm">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">
            A salary proposal of {formatMoney(pending.monthly_gross)} effective{" "}
            {formatEffectiveFrom(pending.effective_from)} is waiting for approval.
          </Text>
          <Text>
            An employee may have only one salary proposal at a time. It has to be approved or
            rejected on Salary Approval before another can be raised.
            {canAmend ? (
              <>
                {" "}
                To change it, open <RevisionLink>Salary Revision &amp; History</RevisionLink> and
                amend it there.
              </>
            ) : null}
          </Text>
        </Box>
      </Alert>
      {view ? <SalaryStructure view={view} /> : null}
    </Stack>
  );
}

function PayrollSection({
  employeeId,
  canView = false,
  canAdd = false,
  canEdit = false,
  canOverride = false,
}) {
  const { current, history, loading, loaded, denied, error, refresh } = useEmployeeMasterSalary(
    employeeId,
    canView
  );

  const access = { canView, canAdd, canEdit, canOverride };
  const resolved = resolvePayrollState(history, current);
  const currentView = presentCurrentSalary(resolved.current);
  const mayEnterOpening = canEnterOpeningSalary(resolved.state, access);
  const mayLinkToRevisions = showRevisionLink(resolved.state, access);

  const body = () => {
    if (loading) {
      return (
        <Stack direction="row" align="center" spacing={2} py={1}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.600">
            Loading salary…
          </Text>
        </Stack>
      );
    }

    // A refusal the server made rather than one this screen predicted. Said as
    // a refusal, never as an empty record.
    if (denied) {
      return (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to view this employee&apos;s salary.
        </Alert>
      );
    }

    /* AN API FAILURE IS NOT AN EMPTY SALARY. Rule 18 of M3, and the reason
       this branch exists at all: both would otherwise render the same
       sentence, and HR would go looking for a salary to enter when what
       actually happened is that the read failed. */
    if (error) {
      return (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          The salary could not be loaded. This is a problem reading it — it does not mean no salary
          has been approved. Please try again.
        </Alert>
      );
    }

    if (!employeeId) {
      return (
        <Text fontSize="sm" color="gray.600">
          The employee record could not be identified, so no salary was requested.
        </Text>
      );
    }

    if (!loaded) return null;

    return (
      <Stack spacing={4}>
        {/* -------------------------------------------- 1. NO SALARY YET -- */}
        {resolved.state === STATE.NO_SALARY ? (
          mayEnterOpening ? (
            <OpeningSalaryForm
              employeeId={employeeId}
              canOverride={canOverride}
              onSubmitted={refresh}
            />
          ) : (
            <Text fontSize="sm" color="gray.600">
              No approved salary available. This employee&apos;s opening salary has not been
              entered yet, and you do not have permission to enter one.
            </Text>
          )
        ) : null}

        {/* ---------------------------------------- 2. AWAITING A DECISION -- */}
        {resolved.state === STATE.PENDING && resolved.pending ? (
          <PendingProposal pending={resolved.pending} canAmend={canEdit && canView} />
        ) : null}

        {/* ------------------------------------- 3. APPROVED AND IN FORCE -- */}
        {resolved.state === STATE.CURRENT_APPROVED && currentView ? (
          <SalaryStructure view={currentView} />
        ) : null}

        {/* ------------------------------ 4. APPROVED, BUT NOT YET IN FORCE -- */}
        {resolved.state === STATE.FUTURE_APPROVED ? (
          <Stack spacing={3}>
            <Alert status="info" fontSize="sm">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">
                  An approved salary takes effect on{" "}
                  {formatEffectiveFrom(resolved.future && resolved.future.effective_from)}.
                </Text>
                <Text>
                  Nothing applies today yet, so there is no current figure to show. This employee
                  already has a salary — an opening salary cannot be entered again.
                </Text>
              </Box>
            </Alert>
            {resolved.future ? (
              <SalaryStructure view={presentCurrentSalary(resolved.future)} />
            ) : null}
          </Stack>
        ) : null}

        {/* ------------------------------------------------ the signpost -- */}
        {mayLinkToRevisions ? (
          <>
            <Divider />
            <Text fontSize="xs" color="gray.600">
              Salary changes are made on{" "}
              <RevisionLink>Payroll &gt; Salary Revision &amp; History</RevisionLink>, where the
              full history and the approval trail live.
            </Text>
          </>
        ) : null}
      </Stack>
    );
  };

  return (
    <SectionCard
      title="Payroll"
      subtitle="The opening salary is entered here during onboarding. Every later change is made on Payroll > Salary Revision & History."
      canView={canView}
      deniedMessage="You do not have permission to view this employee's salary."
    >
      {body()}
    </SectionCard>
  );
}

export default PayrollSection;
