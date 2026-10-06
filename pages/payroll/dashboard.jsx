import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Alert, AlertIcon, Box, Button, Flex, Select, SimpleGrid, Skeleton, Spinner, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import DashboardFilterBar from "../../components/payroll/dashboard/DashboardFilterBar";
import MonthStrip from "../../components/payroll/dashboard/MonthStrip";
import KpiCards from "../../components/payroll/dashboard/KpiCards";
import HeadCountPanel from "../../components/payroll/dashboard/HeadCountPanel";
import EarningsDeductionsPanel from "../../components/payroll/dashboard/EarningsDeductionsPanel";
import ComparisonPanel from "../../components/payroll/dashboard/ComparisonPanel";
import PeopleMovementPanel from "../../components/payroll/dashboard/PeopleMovementPanel";
import ActionRequiredPanel from "../../components/payroll/dashboard/ActionRequiredPanel";
import DrilldownDrawer from "../../components/payroll/dashboard/DrilldownDrawer";
import usePayrollActor from "../../customHooks/usePayrollActor";
import PayrollDashboardHelper from "../../helper/payrollDashboard";
import { canOpenPayrun } from "../../util/payrunAccess";
import {
  EMPTY_FILTERS,
  comparisonChoices,
  defaultMonth,
  filterParams,
  financialYearOf,
  fyLabel,
  fyOptions,
  monthKey,
  monthLabel,
  nextFilters,
  outstandingActions,
  parseMonthKey,
  payrunHref,
  previousMonth,
} from "../../util/payrollDashboard";

/**
 * PAYROLL DASHBOARD - the payroll month at a glance, and the way into
 * finishing it.
 *
 * EVERY FIGURE IS THE SERVER'S. The page sends the financial year, the month,
 * the three filters and the comparison month; `/payroll/dashboard/*` reads the
 * Payrun Initialization and Calculation & Review usecases and aggregates
 * there. Nothing here sums a payroll, and no employee list is loaded until a
 * drill-down is opened.
 *
 * SAME DOOR AS THE PAYRUN: view_employees + view_payroll + view_salary, in the
 * caller's branch scope. A caller without them sees why, not an empty page.
 */
const errorMessage = (res, fallback) => (res && res.msg) || fallback;

function today() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function PayrollDashboard() {
  const router = useRouter();
  const actor = usePayrollActor();
  const mayOpen = canOpenPayrun(actor);
  const now = useMemo(today, []);
  const currentFy = financialYearOf(now.year, now.month);

  const [fy, setFy] = useState(currentFy);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [compareKey, setCompareKey] = useState("");

  const [months, setMonths] = useState(null);
  const [monthsLoading, setMonthsLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(null);

  /* ------------------------------------------------------- the month strip */
  const userPicked = useRef(false);
  useEffect(() => {
    if (!mayOpen) return;
    let live = true;
    setMonthsLoading(true);
    PayrollDashboardHelper.getMonths({ fy, ...filterParams(filters) })
      .then((res) => {
        if (!live) return;
        if (res && res.code === 403) {
          setForbidden(errorMessage(res, "You do not have access to payroll."));
          return;
        }
        if (!res || res.code !== 200) {
          setError(errorMessage(res, "Could not load the payroll months."));
          return;
        }
        setMonths(res.months);
        // Open on the latest month with a payroll started, unless one was chosen.
        if (!userPicked.current) {
          const next = defaultMonth(res.months, fy, now);
          setSelected((prev) => (prev && monthKey(prev) === monthKey(next) ? prev : next));
        }
      })
      .catch(() => live && setError("Could not load the payroll months."))
      .finally(() => live && setMonthsLoading(false));
    return () => {
      live = false;
    };
  }, [fy, filters, mayOpen, now]);

  /* ------------------------------------------------------------ the summary */
  const compare = parseMonthKey(compareKey) || (selected ? previousMonth(selected) : null);
  const loadSummary = useCallback(() => {
    if (!mayOpen || !selected) return undefined;
    let live = true;
    setLoading(true);
    setError(null);
    PayrollDashboardHelper.getSummary({
      year: selected.year,
      month: selected.month,
      ...filterParams(filters),
      ...(compare ? { compare_year: compare.year, compare_month: compare.month } : {}),
    })
      .then((res) => {
        if (!live) return;
        if (res && res.code === 403) setForbidden(errorMessage(res, "You do not have access to payroll."));
        else if (!res || res.code !== 200) setError(errorMessage(res, "Could not load the payroll dashboard."));
        else setSummary(res);
      })
      .catch(() => live && setError("Could not load the payroll dashboard."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // `compare` is derived from compareKey + selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mayOpen, selected, filters, compareKey]);
  useEffect(() => loadSummary(), [loadSummary]);

  /* ---------------------------------------------------------- interactions */
  const chooseMonth = (m) => {
    userPicked.current = true;
    setSelected(m);
    setCompareKey("");
  };
  const chooseFy = (value) => {
    userPicked.current = false;
    setFy(Number(value));
    setMonths(null);
    setCompareKey("");
  };
  const changeFilter = (key, value) => setFilters((f) => nextFilters(f, key, value));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const linkBase = useMemo(
    () => ({
      year: selected && selected.year,
      month: selected && selected.month,
      store_id: filters.store_id,
      department_id: filters.department_id,
      designation_id: filters.designation_id,
    }),
    [selected, filters]
  );
  const hrefFor = (target) => payrunHref({ ...linkBase, ...(target || {}) });
  const hrefForRow = (row) => payrunHref({ ...linkBase, stage: row.stage, card: "ALL", search: String(row.employee_id) });
  const navigate = (href) => router.push(href);

  /* ------------------------------------------------------------ drill-down */
  const [drill, setDrill] = useState(null); // { metric, group_by, group_id, title }
  const [drillResult, setDrillResult] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState(null);
  const loadDrill = useCallback(
    (spec, page = 1) => {
      if (!spec || !selected) return;
      setDrillLoading(true);
      setDrillError(null);
      PayrollDashboardHelper.getEmployees({
        year: selected.year,
        month: selected.month,
        ...filterParams(filters),
        metric: spec.metric,
        ...(spec.group_by ? { group_by: spec.group_by, group_id: spec.group_id } : {}),
        page,
        page_size: 50,
      })
        .then((res) => {
          if (!res || res.code !== 200) setDrillError(errorMessage(res, "Could not load the employees."));
          else setDrillResult(res);
        })
        .catch(() => setDrillError("Could not load the employees."))
        .finally(() => setDrillLoading(false));
    },
    [selected, filters]
  );
  const openDrill = (spec) => {
    setDrill(spec);
    setDrillResult(null);
    loadDrill(spec, 1);
  };

  /* ---------------------------------------------------------------- render */
  const title = "Payroll Dashboard";
  if (!mayOpen || forbidden) {
    return (
      <GlobalWrapper title={title}>
        <CustomContainer title={title} filledHeader>
          <Alert status="info" fontSize="sm" borderRadius="md">
            <AlertIcon />
            {forbidden || "The Payroll Dashboard needs the View Employees, View Payroll and View Salary permissions."}
          </Alert>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const periodLabel = selected ? monthLabel(selected.year, selected.month) : "";
  const pending = outstandingActions(summary && summary.actions);
  const choices = comparisonChoices(selected, fy);

  return (
    <GlobalWrapper title={title}>
      <Box bg="#F7F8FB" minH="100%" pb={4}>
        <CustomContainer
          title={title}
          subtitle={`${fyLabel(fy)}${periodLabel ? ` · ${periodLabel}` : ""}`}
          filledHeader
          rightSection={
            <Flex gap={2} align="center">
              <Select size="xs" w="120px" bg="white" value={fy} onChange={(e) => chooseFy(e.target.value)} aria-label="Financial year">
                {fyOptions(currentFy).map((y) => (
                  <option key={y} value={y}>
                    {fyLabel(y)}
                  </option>
                ))}
              </Select>
              <Button size="xs" variant="outline" bg="white" onClick={loadSummary} isLoading={loading}>
                Refresh
              </Button>
            </Flex>
          }
        >
          <Flex direction="column" gap={4}>
            <DashboardFilterBar
              filters={filters}
              options={summary && summary.filters && summary.filters.options}
              onChange={changeFilter}
              onClear={clearFilters}
              loading={loading}
            />

            <MonthStrip months={months} selected={selected} onSelect={chooseMonth} loading={monthsLoading} />

            {error ? (
              <Alert status="error" fontSize="sm" borderRadius="md">
                <AlertIcon />
                {error}
                <Button size="xs" ml="auto" onClick={loadSummary}>
                  Retry
                </Button>
              </Alert>
            ) : null}

            {!summary && loading ? (
              <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={3}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height="92px" borderRadius="md" />
                ))}
              </SimpleGrid>
            ) : null}

            {summary ? (
              <Box opacity={loading ? 0.6 : 1} transition="opacity 0.2s">
                <Flex direction="column" gap={4}>
                  {loading ? (
                    <Flex align="center" gap={2} fontSize="xs" color="gray.600">
                      <Spinner size="xs" /> Updating…
                    </Flex>
                  ) : null}

                  {summary.kpis.total_employees === 0 ? (
                    <Alert status="info" fontSize="sm" borderRadius="md">
                      <AlertIcon />
                      No payroll employees for {periodLabel} with these filters.
                    </Alert>
                  ) : null}

                  {pending.length ? (
                    <Alert status="warning" fontSize="sm" borderRadius="md" py={2}>
                      <AlertIcon />
                      <Text>
                        {pending.length} payroll action{pending.length === 1 ? "" : "s"} pending for {periodLabel}:{" "}
                        {pending.map((a) => `${a.label} (${a.count})`).join(", ")}.
                      </Text>
                      <Button
                        size="xs"
                        ml="auto"
                        variant="outline"
                        onClick={() => {
                          const el = document.getElementById("payroll-action-required");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        Review
                      </Button>
                    </Alert>
                  ) : null}

                  <KpiCards kpis={summary.kpis} onOpen={openDrill} />

                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                    <HeadCountPanel headcount={summary.headcount} periodLabel={periodLabel} onOpen={openDrill} />
                    <EarningsDeductionsPanel earnings={summary.earnings} periodLabel={periodLabel} onOpen={openDrill} />
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                    <ComparisonPanel
                      comparison={summary.comparison}
                      choices={choices}
                      compareKey={compareKey || monthKey(compare)}
                      onCompareChange={setCompareKey}
                    />
                    <PeopleMovementPanel movement={summary.movement} periodLabel={periodLabel} onOpen={openDrill} />
                  </SimpleGrid>

                  <Box id="payroll-action-required">
                    <ActionRequiredPanel actions={summary.actions} onOpen={openDrill} hrefFor={hrefFor} onNavigate={navigate} />
                  </Box>
                </Flex>
              </Box>
            ) : null}
          </Flex>
        </CustomContainer>
      </Box>

      <DrilldownDrawer
        isOpen={Boolean(drill)}
        onClose={() => setDrill(null)}
        title={drill ? drill.title : ""}
        subtitle={periodLabel}
        result={drillResult}
        loading={drillLoading}
        error={drillError}
        onPage={(page) => loadDrill(drill, page)}
        hrefForRow={hrefForRow}
        onNavigate={navigate}
      />
    </GlobalWrapper>
  );
}

export default PayrollDashboard;
