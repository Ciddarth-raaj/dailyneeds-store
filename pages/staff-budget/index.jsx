import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spacer,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";

import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import EmptyData from "../../components/EmptyData";
import usePermissions from "../../customHooks/usePermissions";
import StaffBudgetHelper from "../../helper/staffBudget";
import {
  budgetSummary,
  buildShiftGrid,
  coverageCells,
  filterLocations,
  formatHeadcount,
  formatRupees,
  formatShiftWindow,
  suggestedRateFor,
  toBulkPayload,
  validateGrid,
} from "../../util/staffBudget";

/**
 * Staff Budget Master.
 *
 *   Location → Department → Designation → Shift → Approved HC
 *
 * ONE STRUCTURE FOR EVERY OPERATING LOCATION. Warehouse is an ordinary row in
 * the location master and is drawn by exactly this code, with its departments
 * intact; there is no separate Warehouse view and no level is flattened away
 * for it.
 *
 * APPROVED HC IS TYPED IN AND NOTHING ELSE WRITES IT. It is not derived from
 * who is currently employed, and neither attendance nor payroll touches it.
 * The screen asks how many positions management approves, not how many people
 * happen to be on the roll.
 *
 * THE SHIFT IS A `work_shift` - the master the attendance engine resolves
 * against, through the dated employee assignment history. Budgeting against
 * the legacy `shift_master` would key an approved headcount and the
 * attendance measured on it to two different entities.
 *
 * A PARTIAL MONEY FIGURE IS NEVER CALLED A TOTAL. Only two designations have
 * agreed rates today, so most locations are showing the priced PART of their
 * staff budget. Every level says "Monthly Budget" only when every approved
 * position in it is priced, and otherwise says "Priced Budget" with the
 * unpriced headcount beside it - see `budgetSummary`.
 *
 * EVERY TOTAL ON THIS PAGE COMES FROM THE SERVER. Designation, department and
 * location totals, the monthly budgets and the Opening/Peak/Closing figures
 * are all computed in the backend's utils/staffBudget.js and rendered as they
 * arrive, so the screen and the API cannot disagree about what a location
 * costs. Nothing is recomputed here.
 *
 * TOTAL HC AND CHECKPOINT HC ARE DIFFERENT QUESTIONS and the layout keeps them
 * apart deliberately. The total is approved positions. A checkpoint is how
 * many of those positions are on the floor at 9 AM, 6 PM or 10 PM — one
 * position on a 9–9 shift shows at Opening AND at Peak while still being one
 * position in the total. They are not meant to add up.
 *
 * `view_staff_budget` opens the page and `edit_staff_budget` enables every
 * control that writes. Both are enforced again on every backend route; hiding
 * a button here is convenience, not access control.
 */
function StaffBudget() {
  const toast = useToast();
  const canEdit = usePermissions(["edit_staff_budget"]);

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkpoints, setCheckpoints] = useState([]);
  const [locations, setLocations] = useState([]);
  const [masters, setMasters] = useState({
    outlets: [],
    departments: [],
    designations: [],
    shifts: [],
  });
  const [search, setSearch] = useState("");
  const [outletFilter, setOutletFilter] = useState("");

  // The designation whose shift grid is open for editing, and that grid.
  const [editing, setEditing] = useState(null);
  const [grid, setGrid] = useState([]);
  const [saving, setSaving] = useState(false);
  const editor = useDisclosure();

  // The "add a combination" form: four master pickers, names on screen, ids in
  // the payload.
  const [newRow, setNewRow] = useState({
    outlet_id: "",
    department_id: "",
    designation_id: "",
  });
  const adder = useDisclosure();

  // The rate screen: a person picks a designation and a work shift by name
  // and confirms the amount. Nothing is matched for them.
  const [rates, setRates] = useState([]);
  const [rateForm, setRateForm] = useState({
    designation_id: "",
    work_shift_id: "",
    monthly_rate: "",
  });
  const rateEditor = useDisclosure();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [budget, masterRes, rateRes] = await Promise.all([
        StaffBudgetHelper.getBudget(),
        StaffBudgetHelper.getMasters(),
        StaffBudgetHelper.getRates(),
      ]);

      // A refusal arrives as `{ code: 403, msg }` rather than the data — see
      // util/api.js — and must never be drawn as "no staff budget".
      if ((budget && budget.code === 403) || (masterRes && masterRes.code === 403)) {
        setAccessDenied(true);
        setLocations([]);
        return;
      }

      setAccessDenied(false);
      setCheckpoints((budget && budget.data && budget.data.checkpoints) || []);
      setLocations((budget && budget.data && budget.data.locations) || []);
      if (masterRes && masterRes.data) setMasters(masterRes.data);
      setRates((rateRes && rateRes.data) || []);
    } catch (err) {
      console.log(err);
      toast({
        title: "Could not load the staff budget",
        status: "error",
        duration: 5000,
      });
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleLocations = useMemo(() => {
    const byOutlet = outletFilter
      ? locations.filter((l) => String(l.outlet_id) === String(outletFilter))
      : locations;
    return filterLocations(byOutlet, search);
  }, [locations, outletFilter, search]);

  const isFiltered = Boolean(search.trim()) || Boolean(outletFilter);

  /** Open a designation's shift grid, offering every active shift. */
  const openEditor = (location, department, designation) => {
    setEditing({
      outlet_id: location.outlet_id,
      outlet_name: location.outlet_name,
      department_id: department.department_id,
      department_name: department.department_name,
      designation_id: designation.designation_id,
      designation_name: designation.designation_name,
    });
    setGrid(buildShiftGrid(masters.shifts, designation.shifts));
    editor.onOpen();
  };

  /** Open the same grid for a combination that is not in the plan yet. */
  const openAdder = () => {
    setNewRow({ outlet_id: "", department_id: "", designation_id: "" });
    adder.onOpen();
  };

  const startNewCombination = () => {
    if (!newRow.outlet_id || !newRow.department_id || !newRow.designation_id) {
      toast({
        title: "Choose a location, a department and a designation",
        status: "warning",
        duration: 4000,
      });
      return;
    }

    const outlet = masters.outlets.find(
      (o) => String(o.outlet_id) === String(newRow.outlet_id)
    );
    const department = masters.departments.find(
      (d) => String(d.department_id) === String(newRow.department_id)
    );
    const designation = masters.designations.find(
      (d) => String(d.designation_id) === String(newRow.designation_id)
    );

    // Any combination of valid masters is allowed on purpose: there is no
    // department ↔ designation mapping in this system, so the budget row
    // itself is the record that management approved this combination.
    setEditing({
      outlet_id: outlet.outlet_id,
      outlet_name: outlet.outlet_name,
      department_id: department.department_id,
      department_name: department.department_name,
      designation_id: designation.designation_id,
      designation_name: designation.designation_name,
    });
    setGrid(buildShiftGrid(masters.shifts, []));
    adder.onClose();
    editor.onOpen();
  };

  const setRowHeadcount = (workShiftId, value) => {
    setGrid((rows) =>
      rows.map((row) =>
        row.work_shift_id === workShiftId ? { ...row, approved_headcount: value } : row
      )
    );
  };

  const saveGrid = async () => {
    const problem = validateGrid(grid);
    if (problem) {
      toast({ title: problem, status: "warning", duration: 5000 });
      return;
    }

    setSaving(true);
    try {
      const res = await StaffBudgetHelper.saveBudgetBulk(toBulkPayload(editing, grid));
      if (!res || res.code !== 200) {
        toast({
          title: (res && res.msg) || "The staff budget could not be saved",
          status: "error",
          duration: 7000,
          isClosable: true,
        });
        return;
      }
      toast({ title: "Staff budget saved", status: "success", duration: 4000 });
      editor.onClose();
      await load();
    } catch (err) {
      console.log(err);
      toast({ title: "The staff budget could not be saved", status: "error", duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Open the rate screen, and pre-fill the amount from the agreed rates where
   * the chosen shift is one of the five.
   *
   * THE SUGGESTION IS A STARTING NUMBER IN AN EDITABLE BOX, not a decision.
   * Which designation and which work shift the money attaches to is chosen
   * here, by a person, from the live masters - there is no server action that
   * finds them by name or by timings, because a wrong match made silently in
   * production is the one failure this must not have.
   */
  const pickRateShift = (workShiftId) => {
    const shift = masters.shifts.find(
      (s) => String(s.work_shift_id) === String(workShiftId)
    );
    const suggestion = suggestedRateFor(shift);
    setRateForm((form) => ({
      ...form,
      work_shift_id: workShiftId,
      monthly_rate:
        suggestion === null || form.monthly_rate !== "" ? form.monthly_rate : suggestion,
    }));
  };

  const saveRate = async () => {
    if (!rateForm.designation_id || !rateForm.work_shift_id || rateForm.monthly_rate === "") {
      toast({
        title: "Choose a designation and a shift, and enter the monthly rate",
        status: "warning",
        duration: 4000,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await StaffBudgetHelper.saveRate({
        designation_id: Number(rateForm.designation_id),
        work_shift_id: Number(rateForm.work_shift_id),
        monthly_rate: Number(rateForm.monthly_rate),
      });
      if (!res || res.code !== 200) {
        toast({
          title: (res && res.msg) || "The rate could not be saved",
          status: "error",
          duration: 7000,
          isClosable: true,
        });
        return;
      }
      toast({ title: "Monthly rate saved", status: "success", duration: 4000 });
      setRateForm({ designation_id: "", work_shift_id: "", monthly_rate: "" });
      await load();
    } catch (err) {
      console.log(err);
      toast({ title: "The rate could not be saved", status: "error", duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  /**
   * A level's money badge, labelled for what it actually is.
   *
   * "Monthly Budget" only where every approved position at that level carries
   * a rate. Anywhere else it is the PRICED part, said so in the badge and
   * followed by how much headcount is missing from it - because a location
   * showing the Customer Service Associate and Cashier sum as its Monthly
   * Budget, with Supervisor, Store Manager and Housekeeping unpriced beside
   * them, understates what the store costs by an amount nobody can see.
   *
   * A level with nothing priced gets no money badge at all - only the count
   * of what is unpriced.
   */
  const levelBudget = (level) => {
    const summary = budgetSummary(level);
    if (!summary) return null;

    return (
      <HStack spacing={2}>
        {summary.amount !== null && (
          <Badge colorScheme={summary.complete ? "green" : "yellow"}>
            {summary.label}: {summary.amount}
          </Badge>
        )}
        {summary.unpriced_headcount > 0 && (
          <Tooltip label="These approved positions have no monthly rate configured, so they are not in the figure beside them">
            <Badge colorScheme="orange" variant="outline">
              Unpriced HC: {summary.unpriced_headcount}
            </Badge>
          </Tooltip>
        )}
      </HStack>
    );
  };

  /** The Approved HC / Rate / Budget table for one designation. */
  const shiftTable = (designation) => (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>Shift</Th>
          <Th isNumeric>Approved HC</Th>
          {designation.has_rates && <Th isNumeric>Monthly Rate</Th>}
          {designation.has_rates && <Th isNumeric>Monthly Budget</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {designation.shifts.map((shift) => (
          <Tr key={shift.staff_budget_id || shift.work_shift_id}>
            <Td>
              <Text fontWeight="500">{shift.shift_name}</Text>
              <Text fontSize="xs" color="gray.500">
                {formatShiftWindow(shift)}
              </Text>
            </Td>
            <Td isNumeric>{formatHeadcount(shift.approved_headcount)}</Td>
            {designation.has_rates && <Td isNumeric>{formatRupees(shift.monthly_rate)}</Td>}
            {designation.has_rates && <Td isNumeric>{formatRupees(shift.monthly_budget)}</Td>}
          </Tr>
        ))}
        <Tr fontWeight="600" bg="gray.50">
          <Td>
            Designation Total
            {!designation.fully_priced && designation.unpriced_headcount > 0 && (
              <Text fontSize="xs" fontWeight="400" color="orange.600">
                {designation.unpriced_headcount} approved HC not priced
              </Text>
            )}
          </Td>
          <Td isNumeric>{formatHeadcount(designation.total_headcount)}</Td>
          {designation.has_rates && <Td />}
          {designation.has_rates && (
            <Td isNumeric>
              {formatRupees(designation.priced_monthly_budget)}
              <Text fontSize="xs" fontWeight="400" color="gray.500">
                {designation.fully_priced ? "Monthly Budget" : "Priced Budget"}
              </Text>
            </Td>
          )}
        </Tr>
      </Tbody>
    </Table>
  );

  /**
   * Opening / Peak / Closing, shown for the designations that are rostered
   * across a trading day — the ones with configured rates today.
   *
   * The caption is not decoration. Without it these three numbers read as a
   * breakdown of the total, and they are not one.
   */
  const coverageStrip = (designation) => (
    <Box mt={3} p={3} borderWidth="1px" borderRadius="md" bg="blue.50">
      <HStack spacing={6} flexWrap="wrap">
        {coverageCells(checkpoints, designation.coverage).map((cell) => (
          <Box key={cell.key}>
            <Text fontSize="xs" color="gray.600">
              {cell.label} ({cell.time})
            </Text>
            <Text fontWeight="700">{cell.headcount}</Text>
          </Box>
        ))}
        <Box>
          <Text fontSize="xs" color="gray.600">
            Total Approved HC
          </Text>
          <Text fontWeight="700">{formatHeadcount(designation.total_headcount)}</Text>
        </Box>
      </HStack>
      <Text fontSize="xs" color="gray.600" mt={2}>
        Opening, Peak and Closing are how many approved positions are on the
        floor at that moment, derived from each shift&apos;s configured timings.
        A position on a long shift counts at more than one checkpoint while
        still being one position in the Total — these figures are not meant to
        add up to it.
      </Text>
    </Box>
  );

  const body = () => {
    if (loading) {
      return (
        <Flex justify="center" py={12}>
          <Spinner />
        </Flex>
      );
    }

    if (accessDenied) {
      return (
        <Alert status="warning">
          <AlertIcon />
          You do not have permission to view the staff budget.
        </Alert>
      );
    }

    if (visibleLocations.length === 0) {
      return (
        <EmptyData
          message={
            isFiltered
              ? "No location, department or designation matches this search"
              : "No approved headcount has been recorded yet"
          }
        />
      );
    }

    return (
      <Accordion allowMultiple defaultIndex={[0]}>
        {visibleLocations.map((location) => (
          <AccordionItem key={location.outlet_id}>
            <AccordionButton>
              <AccordionIcon />
              <Text fontWeight="700" ml={2}>
                {location.outlet_name}
              </Text>
              <Spacer />
              <HStack spacing={4} mr={2}>
                <Badge colorScheme="purple">
                  Location Total HC: {formatHeadcount(location.total_headcount)}
                </Badge>
                {levelBudget(location)}
              </HStack>
            </AccordionButton>

            <AccordionPanel pb={4}>
              <Accordion allowMultiple>
                {location.departments.map((department) => (
                  <AccordionItem key={department.department_id}>
                    <AccordionButton>
                      <AccordionIcon />
                      <Text fontWeight="600" ml={2}>
                        {department.department_name}
                      </Text>
                      <Spacer />
                      <HStack spacing={4} mr={2}>
                        <Badge colorScheme="purple">
                          Department Total HC: {formatHeadcount(department.total_headcount)}
                        </Badge>
                        {levelBudget(department)}
                      </HStack>
                    </AccordionButton>

                    <AccordionPanel pb={4}>
                      <Accordion allowMultiple>
                        {department.designations.map((designation) => (
                          <AccordionItem key={designation.designation_id}>
                            <AccordionButton>
                              <AccordionIcon />
                              <Text ml={2}>{designation.designation_name}</Text>
                              <Spacer />
                              <HStack spacing={4} mr={2}>
                                <Badge colorScheme="purple">
                                  HC: {formatHeadcount(designation.total_headcount)}
                                </Badge>
                                {levelBudget(designation)}
                              </HStack>
                            </AccordionButton>

                            <AccordionPanel pb={4}>
                              {shiftTable(designation)}
                              {designation.has_rates && coverageStrip(designation)}
                              {canEdit && (
                                <Button
                                  mt={3}
                                  size="sm"
                                  colorScheme="purple"
                                  onClick={() =>
                                    openEditor(location, department, designation)
                                  }
                                >
                                  Edit approved headcount
                                </Button>
                              )}
                            </AccordionPanel>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  return (
    <GlobalWrapper title="Staff Budget" permissionKey={["view_staff_budget"]}>
      <CustomContainer
        title="Staff Budget"
        subtitle="Approved headcount by location, department, designation and shift"
        rightSection={
          canEdit && (
            <HStack>
              <Button size="sm" variant="outline" onClick={rateEditor.onOpen}>
                Monthly rates
              </Button>
              <Button size="sm" colorScheme="purple" onClick={openAdder}>
                Add combination
              </Button>
            </HStack>
          )
        }
      >
        <Flex gap={3} mb={4} flexWrap="wrap">
          <Select
            maxW="260px"
            placeholder="All locations"
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
          >
            {masters.outlets.map((outlet) => (
              <option key={outlet.outlet_id} value={outlet.outlet_id}>
                {outlet.outlet_name}
              </option>
            ))}
          </Select>
          <Input
            maxW="320px"
            placeholder="Search department or designation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Flex>

        {isFiltered && !loading && (
          <Alert status="info" mb={4} fontSize="sm">
            <AlertIcon />
            Filtered view. The totals shown are each level&apos;s full approved
            headcount, not a total of what is on screen.
          </Alert>
        )}

        {body()}
      </CustomContainer>

      {/* Add a combination: names on screen, ids in the payload. */}
      <Modal isOpen={adder.isOpen} onClose={adder.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add a combination</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Choose where the positions sit. The shifts and their approved
              headcount come next.
            </Text>
            <Select
              mb={3}
              placeholder="Location"
              value={newRow.outlet_id}
              onChange={(e) => setNewRow({ ...newRow, outlet_id: e.target.value })}
            >
              {masters.outlets.map((outlet) => (
                <option key={outlet.outlet_id} value={outlet.outlet_id}>
                  {outlet.outlet_name}
                </option>
              ))}
            </Select>
            <Select
              mb={3}
              placeholder="Department"
              value={newRow.department_id}
              onChange={(e) => setNewRow({ ...newRow, department_id: e.target.value })}
            >
              {masters.departments.map((department) => (
                <option key={department.department_id} value={department.department_id}>
                  {department.department_name}
                </option>
              ))}
            </Select>
            <Select
              placeholder="Designation"
              value={newRow.designation_id}
              onChange={(e) => setNewRow({ ...newRow, designation_id: e.target.value })}
            >
              {masters.designations.map((designation) => (
                <option key={designation.designation_id} value={designation.designation_id}>
                  {designation.designation_name}
                </option>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={adder.onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={startNewCombination}>
              Continue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* The shift grid for one designation, edited as a whole. */}
      <Modal isOpen={editor.isOpen} onClose={editor.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editing && (
              <>
                <Text>{editing.designation_name}</Text>
                <Text fontSize="sm" fontWeight="400" color="gray.600">
                  {editing.outlet_name} → {editing.department_name}
                </Text>
              </>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Every shift is listed. Leave a shift at 0 where no position is
              approved for it.
            </Text>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Shift</Th>
                  <Th isNumeric>Approved HC</Th>
                  <Th isNumeric>Monthly Rate</Th>
                </Tr>
              </Thead>
              <Tbody>
                {grid.map((row) => (
                  <Tr key={row.work_shift_id}>
                    <Td>
                      <Text fontWeight="500">{row.shift_name}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatShiftWindow(row)}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Input
                        size="sm"
                        type="number"
                        min={0}
                        step={1}
                        textAlign="right"
                        maxW="100px"
                        value={row.approved_headcount}
                        onChange={(e) => setRowHeadcount(row.work_shift_id, e.target.value)}
                      />
                    </Td>
                    <Td isNumeric>{formatRupees(row.monthly_rate)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={editor.onClose} isDisabled={saving}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={saveGrid} isLoading={saving}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* The monthly rates. A person picks the masters; nothing is matched
          for them, and what is stored is the ids they picked. */}
      <Modal isOpen={rateEditor.isOpen} onClose={rateEditor.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Monthly rates</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="gray.600" mb={3}>
              A rate applies to a designation on a shift, at every location.
              Choose the designation and the shift, then confirm the amount.
            </Text>

            <Flex gap={3} mb={3} flexWrap="wrap">
              <Select
                maxW="240px"
                placeholder="Designation"
                value={rateForm.designation_id}
                onChange={(e) =>
                  setRateForm({ ...rateForm, designation_id: e.target.value })
                }
              >
                {masters.designations.map((designation) => (
                  <option key={designation.designation_id} value={designation.designation_id}>
                    {designation.designation_name}
                  </option>
                ))}
              </Select>
              <Select
                maxW="260px"
                placeholder="Shift"
                value={rateForm.work_shift_id}
                onChange={(e) => pickRateShift(e.target.value)}
              >
                {masters.shifts.map((shift) => (
                  <option key={shift.work_shift_id} value={shift.work_shift_id}>
                    {shift.shift_name}
                    {formatShiftWindow(shift) ? ` (${formatShiftWindow(shift)})` : ""}
                  </option>
                ))}
              </Select>
              <Input
                maxW="160px"
                type="number"
                min={0}
                placeholder="Monthly rate"
                value={rateForm.monthly_rate}
                onChange={(e) =>
                  setRateForm({ ...rateForm, monthly_rate: e.target.value })
                }
              />
              <Button colorScheme="purple" onClick={saveRate} isLoading={saving}>
                Save rate
              </Button>
            </Flex>

            <Text fontSize="xs" color="gray.500" mb={4}>
              Where the chosen shift is one of the five agreed windows, the
              amount is pre-filled with the agreed rate. It is a suggestion:
              check it before saving.
            </Text>

            {rates.length === 0 ? (
              <EmptyData size="sm" message="No monthly rate has been configured yet" />
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Designation</Th>
                    <Th>Shift</Th>
                    <Th isNumeric>Monthly Rate</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rates.map((rate) => (
                    <Tr key={rate.staff_budget_rate_id}>
                      <Td>{rate.designation_name}</Td>
                      <Td>
                        <Text>{rate.shift_name}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {formatShiftWindow(rate)}
                        </Text>
                      </Td>
                      <Td isNumeric>{formatRupees(rate.monthly_rate)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={rateEditor.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </GlobalWrapper>
  );
}

export default StaffBudget;
