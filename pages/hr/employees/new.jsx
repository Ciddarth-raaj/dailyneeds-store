import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Button,
  Input,
  Select,
  Stack,
  Text,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  FormHelperText,
  SimpleGrid,
  Box,
  Divider,
  Badge,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AadhaarVerifyModal from "../../../components/hr/AadhaarVerifyModal";
import { ConfidenceBadge, EmploymentBadge } from "../../../components/hr/StatusBadges";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDesignations from "../../../customHooks/useDesignations";
import useDepartments from "../../../customHooks/useDepartments";
import HrHelper from "../../../helper/hr";
import { duplicateSummary } from "../../../util/hrStatus";

/**
 * Stage 0C / C3 — Add Employee.
 *
 * The order matters and is deliberate:
 *
 *   details  →  duplicate check (advisory)  →  Aadhaar: verify or skip  →  create
 *
 * TWO THINGS THIS SCREEN WILL NOT DO. It will not block a create because a
 * name looked similar - the duplicate check is a warning HR reads and
 * overrules. And it will not require an Aadhaar: "Skip for now" is a
 * first-class choice, not a nag, because a new hire whose Aadhaar is not to
 * hand still needs to be paid.
 *
 * What it does insist on is that an INACTIVE match is offered as a Rejoin,
 * because that is the moment a second employee ID gets created for somebody
 * who already has one, and that mistake is permanent.
 */
function AddEmployee() {
  const router = useRouter();
  const toast = useToast();
  const canCreate = usePermissions(["employee_create"]);

  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();
  const { departments } = useDepartments();

  const [form, setForm] = useState({
    employee_name: "",
    primary_contact_number: "",
    dob: "",
    date_of_joining: "",
    store_id: "",
    designation_id: "",
    department_id: "",
  });

  const [duplicates, setDuplicates] = useState(null);
  const [checking, setChecking] = useState(false);
  const [aadhaarOpen, setAadhaarOpen] = useState(false);
  const [verification, setVerification] = useState(null); // {verification_id, aadhaar_last4}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const required = form.employee_name.trim() && form.date_of_joining;

  /** Advisory only. Its result never gates the create below. */
  const runDuplicateCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await HrHelper.checkDuplicate({
        employee_name: form.employee_name,
        primary_contact_number: form.primary_contact_number,
        dob: form.dob,
      });
      if (res && res.code && res.code !== 200) {
        // A refusal here must not stop onboarding either.
        setDuplicates(null);
        return;
      }
      setDuplicates(res);
    } catch (err) {
      setDuplicates(null);
    } finally {
      setChecking(false);
    }
  };

  const create = async () => {
    setError(null);
    if (!required) {
      setError("A name and a joining date are required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        employee_name: form.employee_name.trim(),
        date_of_joining: form.date_of_joining,
        ...(form.primary_contact_number ? { primary_contact_number: form.primary_contact_number } : {}),
        ...(form.dob ? { dob: form.dob } : {}),
        ...(form.store_id ? { store_id: Number(form.store_id) } : {}),
        ...(form.designation_id ? { designation_id: Number(form.designation_id) } : {}),
        ...(form.department_id ? { department_id: Number(form.department_id) } : {}),
        ...(verification ? { aadhaar_verification_id: verification.verification_id } : {}),
      };
      const res = await HrHelper.createEmployee(payload);
      if (res && res.code && res.code !== 200) {
        setError(res.msg || "The employee could not be created.");
        return;
      }
      toast({
        title: `Employee ${res.employee_id} created`,
        description:
          res.aadhaar_status === "VERIFIED"
            ? "Aadhaar verified and attached."
            : "Aadhaar is pending — it can be verified later from the profile.",
        status: "success",
        duration: 5000,
      });
      router.push(`/hr/employees/${res.employee_id}`);
    } catch (err) {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const summary = duplicateSummary(duplicates);

  if (!canCreate) {
    return (
      <GlobalWrapper title="Add Employee">
        <CustomContainer title="Add Employee" filledHeader>
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to create employees.
          </Alert>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="Add Employee">
      <CustomContainer title="Add Employee" filledHeader>
        <Stack spacing={5} maxW="900px">
          {error ? (
            <Alert status="error" fontSize="sm">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}

          {/* ---------------------------------------------------- details */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Name</FormLabel>
              <Input size="sm" value={form.employee_name} onChange={set("employee_name")} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Mobile</FormLabel>
              <Input size="sm" value={form.primary_contact_number} onChange={set("primary_contact_number")} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Date of birth</FormLabel>
              <Input type="date" size="sm" value={form.dob} onChange={set("dob")} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Joining date</FormLabel>
              <Input type="date" size="sm" value={form.date_of_joining} onChange={set("date_of_joining")} />
              <FormHelperText>Cannot be in the future.</FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Outlet</FormLabel>
              <Select size="sm" placeholder="Select outlet" value={form.store_id} onChange={set("store_id")}>
                {outlets.map((o) => (
                  <option key={o.outlet_id} value={o.outlet_id}>
                    {o.outlet_name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Designation</FormLabel>
              <Select
                size="sm"
                placeholder="Select designation"
                value={form.designation_id}
                onChange={set("designation_id")}
              >
                {(designations || []).map((d) => (
                  <option key={d.designation_id} value={d.designation_id}>
                    {d.designation_name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Department</FormLabel>
              <Select
                size="sm"
                placeholder="Select department"
                value={form.department_id}
                onChange={set("department_id")}
              >
                {(departments || []).map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </Select>
            </FormControl>
          </SimpleGrid>

          <Button
            size="sm"
            variant="outline"
            alignSelf="flex-start"
            isLoading={checking}
            isDisabled={!form.employee_name.trim()}
            onClick={runDuplicateCheck}
          >
            Check for an existing employee
          </Button>

          {/* ------------------------------------------ duplicate warning */}
          {summary.show ? (
            <Alert status="warning" alignItems="flex-start" fontSize="sm">
              <AlertIcon />
              <Stack spacing={3} width="100%">
                <Box>
                  <Text fontWeight="bold">{summary.heading}</Text>
                  <Text>{summary.subheading}</Text>
                </Box>
                {summary.matches.map((m) => (
                  <Box key={m.employee_id} borderWidth="1px" borderRadius="md" p={2} bg="white">
                    <Stack direction={{ base: "column", sm: "row" }} align={{ sm: "center" }} spacing={2}>
                      <Text fontWeight="semibold">
                        {m.employee_name} (ID {m.employee_id})
                      </Text>
                      <EmploymentBadge status={m.is_active ? 1 : 0} />
                      <ConfidenceBadge confidence={m.confidence} />
                      {m.suggested_action === "rejoin" ? (
                        <Link href={`/hr/employees/${m.employee_id}`} passHref>
                          <Button size="xs" colorScheme="green">
                            Rejoin this employee
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/hr/employees/${m.employee_id}`} passHref>
                          <Button size="xs" variant="outline">
                            Review
                          </Button>
                        </Link>
                      )}
                    </Stack>
                    <Text color="gray.600">
                      Matched on {(m.matched_on || []).join(" and ")}
                      {m.last_ended_on ? ` · left ${m.last_ended_on}` : ""}
                    </Text>
                  </Box>
                ))}
                <Text color="gray.700">
                  This is advice, not a block. If none of these is the same person, carry on below.
                </Text>
              </Stack>
            </Alert>
          ) : duplicates ? (
            <Alert status="success" fontSize="sm">
              <AlertIcon />
              No possible duplicate found.
            </Alert>
          ) : null}

          <Divider />

          {/* -------------------------------------------------- Aadhaar */}
          <Box>
            <Text fontWeight="bold" mb={1}>
              Aadhaar
            </Text>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Preferred, but not required. Skipping does not hold up joining, bank setup, attendance or
              payroll — the employee simply shows as Aadhaar Pending until it is done.
            </Text>
            {verification ? (
              <Alert status="success" fontSize="sm">
                <AlertIcon />
                <Stack spacing={0}>
                  <Text fontWeight="bold">
                    Aadhaar verified <Badge colorScheme="green">ending {verification.aadhaar_last4}</Badge>
                  </Text>
                  <Text>It will be attached to this employee when you create them.</Text>
                </Stack>
              </Alert>
            ) : (
              <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
                <Button size="sm" colorScheme="purple" onClick={() => setAadhaarOpen(true)}>
                  Verify Aadhaar now
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setVerification(null)}>
                  Skip for now
                </Button>
              </Stack>
            )}
          </Box>

          <Divider />

          <Stack direction="row" spacing={3}>
            <Button colorScheme="purple" isLoading={busy} isDisabled={!required} onClick={create}>
              Create employee
            </Button>
            <Link href="/hr/employees" passHref>
              <Button variant="ghost">Cancel</Button>
            </Link>
          </Stack>
        </Stack>
      </CustomContainer>

      <AadhaarVerifyModal
        isOpen={aadhaarOpen}
        onClose={() => setAadhaarOpen(false)}
        employeeName={form.employee_name}
        onVerified={(decision, outcome) => {
          setAadhaarOpen(false);
          if (outcome && outcome.kind === "create") {
            setVerification(decision);
            // The verified name and date of birth are better than anything
            // typed by hand, so they fill what is still blank.
            const suggested = decision.suggested_employee_fields || {};
            setForm((f) => ({
              ...f,
              employee_name: f.employee_name || suggested.employee_name || "",
              dob: f.dob || suggested.dob || "",
            }));
            return;
          }
          // Already employed, or should be rejoined: this is not a create.
          if (outcome && outcome.employeeId) {
            router.push(`/hr/employees/${outcome.employeeId}`);
          }
        }}
      />
    </GlobalWrapper>
  );
}

export default AddEmployee;
