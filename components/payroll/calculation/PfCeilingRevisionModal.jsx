import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";

import PayrunCalculationHelper from "../../../helper/payrunCalculation";
import { describeApiResult, KIND } from "../../../util/salaryApiError";

/**
 * EPFO WAGE CEILING REVISION (15,000 -> 25,000 w.e.f. 17-09-2026).
 *
 * READ-ONLY. Two views of the server's answers and nothing else:
 *
 *   Affected employees  the September 2026 population classified by PF wage
 *                       (Basic), with current / September / October employee
 *                       and employer PF and the monthly employer cost change.
 *                       Employees recorded as PF not applicable whose PF wage
 *                       is now within 25,000 are flagged - never enrolled.
 *
 *   ECR                 the month's ECR lines built from the STORED
 *                       calculations, one line per member (September's two
 *                       periods already summed), with every member that
 *                       cannot be filed listed instead of guessed.
 *
 * Nothing on this screen computes a figure or changes a record. Both
 * downloads are files built in the browser from the server's response.
 */

const money = (v) =>
  v === null || v === undefined || v === ""
    ? "—"
    : Number(v).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function download(name, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const yesNo = (v) => (v === true ? "Yes" : v === false ? "No" : "Not recorded");

function reportCsv(report) {
  const head = [
    "Employee ID", "Employee Name", "Outlet / Branch", "Date of Joining", "Date of Birth", "Age on 17-09-2026",
    "Gross Salary", "Basic", "Current PF Wage", "PF Applicable", "UAN", "Previous PF Member", "Previous EPS Member",
    "Current Employee PF", "Revised September Employee PF", "Revised October Employee PF",
    "Current Employer EPF", "Current Employer EPS", "Revised October Employer EPF", "Revised October Employer EPS",
    "Current Employer Cost (12% + EDLI + Admin)", "Revised October Employer Cost", "Monthly Employer Cost Increase",
    "If Enrolled from 17-09: September EE", "If Enrolled: October EE", "If Enrolled: October Employer Cost",
    "Category", "Flags", "Reason",
  ];
  const rows = (report.employees || []).map((e) => [
    e.employee_id, e.employee_name, e.store_name, e.date_of_joining, e.dob, e.age_on_17_09_2026,
    e.gross_salary, e.basic, e.current_pf_wage, yesNo(e.pf_applicable), e.uan, yesNo(e.previous_pf_member), yesNo(e.previous_eps_member),
    e.current && e.current.employee_pf, e.september && e.september.employee_pf, e.october && e.october.employee_pf,
    e.current && e.current.employer_epf, e.current && e.current.employer_eps, e.october && e.october.employer_epf, e.october && e.october.employer_eps,
    e.current && e.current.employer_cost, e.october && e.october.employer_cost, e.monthly_employer_cost_increase,
    e.if_enrolled && e.if_enrolled.september.employee_pf, e.if_enrolled && e.if_enrolled.october.employee_pf, e.if_enrolled && e.if_enrolled.october.employer_cost,
    e.category_label, (e.flags || []).join(" | "), e.reason,
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

function PfCeilingRevisionModal({ isOpen, onClose, year, month }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [ecr, setEcr] = useState(null);
  const [ecrLoading, setEcrLoading] = useState(false);
  const [ecrError, setEcrError] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReport(null);
    setEcr(null);
    setEcrError(null);
    PayrunCalculationHelper.getPfCeilingImpact({})
      .then((body) => {
        if (cancelled) return;
        const outcome = describeApiResult(body);
        if (outcome.kind !== KIND.OK) setError(outcome.message);
        else setReport(body);
      })
      .catch(() => !cancelled && setError("The affected-employee report could not be loaded. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const loadEcr = (includeUnapproved) => {
    setEcrLoading(true);
    setEcrError(null);
    PayrunCalculationHelper.getEcr({ year, month, include_unapproved: includeUnapproved })
      .then((body) => {
        const outcome = describeApiResult(body);
        if (outcome.kind !== KIND.OK) setEcrError(outcome.message);
        else setEcr({ ...body, preview: includeUnapproved });
      })
      .catch(() => setEcrError("The ECR could not be built. Please try again."))
      .finally(() => setEcrLoading(false));
  };

  const summary = report && report.summary;
  const flagged = report ? report.employees.filter((e) => (e.flags || []).some((f) => f !== "NO_CHANGE")) : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          EPFO wage ceiling revision{" "}
          <Badge colorScheme="purple" ml={2}>
            ₹15,000 → ₹25,000 from 17-09-2026
          </Badge>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <Alert status="info" fontSize="sm">
              <AlertIcon />
              Read-only. Standard full-attendance figures on the approved salary in force on 30-09-2026; the
              September payrun itself also reflects joining, exit and loss of pay. Nobody is enrolled and no PF /
              EPS status is changed here.
            </Alert>

            {loading ? (
              <Stack direction="row" align="center" spacing={2}>
                <Spinner size="sm" />
                <Text fontSize="sm">Loading the affected-employee report…</Text>
              </Stack>
            ) : null}
            {error ? (
              <Alert status="error" fontSize="sm">
                <AlertIcon />
                {error}
              </Alert>
            ) : null}

            {summary ? (
              <>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                  {Object.entries(summary.by_category).map(([key, c]) => (
                    <Stat key={key} p={3} borderWidth="1px" borderRadius="md">
                      <StatLabel fontSize="xs">{c.label}</StatLabel>
                      <StatNumber fontSize="lg">{c.employees}</StatNumber>
                      <Text fontSize="xs" color="gray.600">
                        PF: {c.pf_applicable} yes / {c.pf_not_applicable} no / {c.pf_not_recorded} not recorded
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Cost +₹{money(c.monthly_employer_cost_increase)} / month
                      </Text>
                    </Stat>
                  ))}
                </SimpleGrid>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                  <Stat p={3} borderWidth="1px" borderRadius="md">
                    <StatLabel fontSize="xs">Monthly employer cost increase (enrolled members)</StatLabel>
                    <StatNumber fontSize="lg">₹{money(summary.monthly_employer_cost_increase)}</StatNumber>
                  </Stat>
                  <Stat p={3} borderWidth="1px" borderRadius="md">
                    <StatLabel fontSize="xs">May require PF enrolment from 17-09-2026</StatLabel>
                    <StatNumber fontSize="lg">{summary.may_require_enrolment}</StatNumber>
                  </Stat>
                  <Stat p={3} borderWidth="1px" borderRadius="md">
                    <StatLabel fontSize="xs">Their monthly employer cost if enrolled</StatLabel>
                    <StatNumber fontSize="lg">₹{money(summary.potential_monthly_employer_cost_if_enrolled)}</StatNumber>
                  </Stat>
                </SimpleGrid>

                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Employee</Th>
                        <Th>Outlet</Th>
                        <Th isNumeric>Basic</Th>
                        <Th>PF</Th>
                        <Th isNumeric>EE now</Th>
                        <Th isNumeric>EE Sep</Th>
                        <Th isNumeric>EE Oct</Th>
                        <Th isNumeric>Employer +/month</Th>
                        <Th>Reason</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {flagged.map((e) => (
                        <Tr key={e.employee_id}>
                          <Td>
                            {e.employee_id} · {e.employee_name}
                          </Td>
                          <Td>{e.store_name || "—"}</Td>
                          <Td isNumeric>{money(e.basic)}</Td>
                          <Td>{yesNo(e.pf_applicable)}</Td>
                          <Td isNumeric>{money(e.current && e.current.employee_pf)}</Td>
                          <Td isNumeric>{money(e.september && e.september.employee_pf)}</Td>
                          <Td isNumeric>{money(e.october && e.october.employee_pf)}</Td>
                          <Td isNumeric>{money(e.monthly_employer_cost_increase)}</Td>
                          <Td fontSize="xs">{e.reason}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {flagged.length === 0 ? (
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      No employee is affected beyond the standard ≤ ₹15,000 case.
                    </Text>
                  ) : null}
                </Box>
              </>
            ) : null}

            <Box borderTopWidth="1px" pt={4}>
              <Text fontWeight="semibold" mb={2}>
                ECR for {String(month).padStart(2, "0")}/{year}
              </Text>
              {ecrError ? (
                <Alert status="error" fontSize="sm" mb={2}>
                  <AlertIcon />
                  {ecrError}
                </Alert>
              ) : null}
              {ecr ? (
                <Stack spacing={2}>
                  {ecr.preview ? (
                    <Alert status="warning" fontSize="sm">
                      <AlertIcon />
                      Preview including months not yet approved. Do not upload this file.
                    </Alert>
                  ) : null}
                  <Text fontSize="sm">
                    {ecr.totals.members} members · EPF wages ₹{money(ecr.totals.epf_wages)} · EE ₹
                    {money(ecr.totals.ee_share)} · EPS ₹{money(ecr.totals.eps_share)} · ER EPF ₹
                    {money(ecr.totals.er_epf_share)}
                  </Text>
                  {ecr.errors.length > 0 ? (
                    <Alert status="warning" fontSize="sm">
                      <AlertIcon />
                      {ecr.errors.length} employee(s) left out:{" "}
                      {ecr.errors
                        .slice(0, 10)
                        .map((e) => `${e.employee_id} (${e.code})`)
                        .join(", ")}
                      {ecr.errors.length > 10 ? "…" : ""}
                    </Alert>
                  ) : null}
                  {ecr.validation && ecr.validation.length > 0 ? (
                    <Alert status="error" fontSize="sm">
                      <AlertIcon />
                      {ecr.validation.length} line(s) fail the ECR arithmetic checks.
                    </Alert>
                  ) : null}
                </Stack>
              ) : null}
            </Box>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Stack direction={{ base: "column", md: "row" }} spacing={2}>
            <Button
              size="sm"
              isDisabled={!report}
              onClick={() => download("epfo-ceiling-2026-affected-employees.csv", reportCsv(report), "text/csv")}
            >
              Download report (CSV)
            </Button>
            <Button size="sm" isLoading={ecrLoading} onClick={() => loadEcr(true)}>
              Preview ECR
            </Button>
            <Button size="sm" colorScheme="purple" isLoading={ecrLoading} onClick={() => loadEcr(false)}>
              Build ECR (approved only)
            </Button>
            <Button
              size="sm"
              isDisabled={!ecr || ecr.preview || ecr.lines.length === 0}
              onClick={() => download(`ECR-${year}-${String(month).padStart(2, "0")}.txt`, ecr.text)}
            >
              Download ECR
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default PfCeilingRevisionModal;
