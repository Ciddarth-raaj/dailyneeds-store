import React, { useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import PendingProposalCard from "../../components/payroll/PendingProposalCard";
import usePayrollActor from "../../customHooks/usePayrollActor";
import usePendingSalaryQueue from "../../customHooks/usePendingSalaryQueue";
import useOutlets from "../../customHooks/useOutlets";
import PayrollSalaryHelper from "../../helper/payrollSalary";
import { describeApiResult, KIND } from "../../util/salaryApiError";
import {
  canApproveProposal,
  canOpenApprovalScreen,
  canRejectProposal,
} from "../../util/payrollAccess";

/**
 * M4 — Salary Approval.
 *
 * THE APPROVER'S WORKLIST, AND NOTHING ELSE. Every salary proposal awaiting a
 * decision, in one read, oldest effective date first — the one that takes
 * effect soonest is the one that needs deciding first.
 *
 * IT CANNOT EDIT A PROPOSAL. Not a gross, not a component, not an effective
 * date. If something is wrong the approver rejects it with a reason and the
 * person who raised it corrects it on Salary Revision & History. An approver
 * who could also amend would be able to rewrite a figure and agree to it in
 * the same visit.
 *
 * THREE KEYS OPEN IT — `view_employees`, `view_salary` and
 * `approve_salary_revision`, all of them — matching `GET /hr/salary/pending`
 * exactly. Listing every outstanding pay proposal in the company is a
 * different disclosure from one employee's structure that somebody navigated
 * to deliberately.
 *
 * SELF-APPROVAL IS COMMUNICATED HERE AND REFUSED ON THE SERVER. The queue
 * marks a proposal the reader raised and disables Approve on it; the rule
 * itself lives in `usecase/employee_salary.js`, applies to every path, and
 * excepts administrators exactly as the permission system already does.
 * Rejecting your own proposal stays available — withdrawing one is normal, and
 * only agreeing to your own pay change is not.
 *
 * ONE READ, NOT SIX HUNDRED. The queue is a single endpoint; this screen never
 * walks the employee master to assemble it.
 */
function SalaryApproval() {
  const toast = useToast();
  const actor = usePayrollActor();
  const mayOpen = canOpenApprovalScreen(actor);
  const mayReject = canRejectProposal(actor);

  const [employeeId, setEmployeeId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [busyId, setBusyId] = useState(null);

  const { outlets } = useOutlets({ directory: true });

  // Sent to the server, so the rows that do not match are never read out of
  // the database - not filtered out of a full list in the browser.
  const filters = useMemo(
    () => ({
      employee_id: employeeId,
      store_id: storeId,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
    }),
    [employeeId, storeId, effectiveFrom, effectiveTo]
  );

  const { items, loading, loaded, denied, error, refresh } = usePendingSalaryQueue(
    filters,
    mayOpen
  );

  const clearFilters = () => {
    setEmployeeId("");
    setStoreId("");
    setEffectiveFrom("");
    setEffectiveTo("");
  };

  /** Approve or reject, then re-read the queue rather than patching it. */
  const decide = async (salaryId, action) => {
    if (busyId) return; // one decision at a time; no double-click double-approve
    setBusyId(salaryId);
    try {
      const result = await action();
      const outcome = describeApiResult(result);
      if (outcome.kind !== KIND.OK) {
        // A self-approval refusal, an already-decided record, a lost
        // permission - each said in the server's own words.
        toast({
          title: outcome.message,
          status: outcome.kind === KIND.DENIED ? "info" : "error",
          duration: 8000,
          isClosable: true,
        });
        return false;
      }
      return true;
    } catch (err) {
      toast({
        title: "The decision could not be saved. Please try again.",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (salaryId) => {
    const ok = await decide(salaryId, () => PayrollSalaryHelper.approve(salaryId));
    if (!ok) return;
    toast({
      title: "Approved. It becomes current on its effective date, not before.",
      status: "success",
      duration: 5000,
      isClosable: true,
    });
    await refresh();
  };

  const reject = async (salaryId, reason) => {
    const ok = await decide(salaryId, () => PayrollSalaryHelper.reject(salaryId, reason));
    if (!ok) return;
    toast({
      title: "Rejected. The record stays on the employee's permanent history.",
      status: "success",
      duration: 5000,
      isClosable: true,
    });
    await refresh();
  };

  const body = () => {
    if (!mayOpen) {
      return (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to review salary approvals. This screen needs View Employees,
          View Salary and Approve Salary Revision.
        </Alert>
      );
    }

    return (
      <Stack spacing={4}>
        <SimpleGrid columns={{ base: 1, md: 5 }} spacing={3}>
          <Input
            size="sm"
            placeholder="Employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            type="number"
          />
          <Select
            size="sm"
            placeholder="All outlets"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {outlets.map((o) => (
              <option key={o.outlet_id} value={o.outlet_id}>
                {o.outlet_name}
              </option>
            ))}
          </Select>
          <Input
            size="sm"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            title="Effective from"
          />
          <Input
            size="sm"
            type="date"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
            title="Effective to"
          />
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </SimpleGrid>

        {loading ? (
          <Stack direction="row" align="center" spacing={2}>
            <Spinner size="sm" />
            <Text fontSize="sm" color="gray.600">
              Loading pending proposals…
            </Text>
          </Stack>
        ) : null}

        {denied ? (
          <Alert status="info" fontSize="sm">
            <AlertIcon />
            You do not have permission to view the salary approval queue.
          </Alert>
        ) : null}

        {/* A FAILED READ IS NOT AN EMPTY QUEUE. "Nothing is waiting for you"
            and "we could not find out" are different things to tell an
            approver, and only one of them means they can stop looking. */}
        {error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {error} This is a problem reading the queue — it does not mean there is nothing to
            approve.
          </Alert>
        ) : null}

        {loaded && items.length === 0 ? (
          <Text fontSize="sm" color="gray.600">
            No salary proposals are waiting for approval.
          </Text>
        ) : null}

        {loaded && items.length > 0 ? (
          <Stack spacing={2}>
            <Text fontSize="xs" color="gray.600">
              {items.length} proposal{items.length === 1 ? "" : "s"} awaiting a decision.
            </Text>
            {items.map((item) => (
              <PendingProposalCard
                key={item.salary_id}
                item={item}
                canApprove={canApproveProposal(actor, item)}
                canReject={mayReject}
                onApprove={approve}
                onReject={reject}
                busy={busyId === item.salary_id}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    );
  };

  return (
    <GlobalWrapper title="Salary Approval">
      <CustomContainer
        title="Salary Approval"
        subtitle="Approve or reject pending salary proposals. Proposals are corrected on Salary Revision & History, never here."
      >
        {body()}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default SalaryApproval;
