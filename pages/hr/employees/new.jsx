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
  FormErrorMessage,
  FormHelperText,
  Textarea,
  SimpleGrid,
  Box,
  Divider,
  Badge,
  Heading,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AadhaarVerifyModal from "../../../components/hr/AadhaarVerifyModal";
import OnboardingStepper from "../../../components/hr/OnboardingStepper";
import { ConfidenceBadge, EmploymentBadge } from "../../../components/hr/StatusBadges";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDesignations from "../../../customHooks/useDesignations";
import useDepartments from "../../../customHooks/useDepartments";
import useWorkShiftOptions from "../../../customHooks/useWorkShiftOptions";
import HrHelper from "../../../helper/hr";
import { duplicateSummary } from "../../../util/hrStatus";
import {
  ONBOARDING_STAGES,
  applyVerifiedDemographics,
  buildCreatePayload,
  buildEducationPayload,
  createdSummary,
  isCreateStage,
  isFinalStage,
  validateStage,
} from "../../../util/hrOnboarding";

/**
 * Add Employee — the store manager's onboarding wizard.
 *
 *   1 Aadhaar  →  2 Personal  →  3 Employment  →  Employee ID  →  4 Education
 *
 * THE SAME ORDER AS THE PROFILE. These are sections 1-4 of the one employee
 * master; the profile shows all eight in the same sequence, and the manager's
 * part is the first four. Sections 5-8 (Payment Details, Statutory Details,
 * Payroll, Documents) are governed by their own designation rights and are
 * not in this wizard - not shown as disabled future steps either, because a
 * step somebody cannot take is a step they will ask to be given.
 *
 * THE EMPLOYEE IS CREATED AT THE END OF STAGE 3, NOT STAGE 4. Finishing
 * Employment creates the record and allocates the permanent Employee ID -
 * the same moment it always was. Stage 4 then records Education AGAINST that
 * ID, through the onboarding education endpoint, which takes `employee_create`
 * rather than the profile's `employee_edit`: the manager who just created the
 * employee finishes the education without being given the editor.
 *
 * THE INITIAL SHIFT is chosen on stage 3, from the NEW work shift master
 * (active shifts only, through the assignment endpoint's options read) and
 * sent with the create as `default_work_shift_id`. It is optional: a hire
 * whose shift is not yet decided is still created, and Employee Shift
 * Assignment can put them on one later. The legacy `shift_id` is never sent.
 *
 * WHY AADHAAR IS FIRST rather than at the bottom of a long form. The Aadhaar
 * OTP flow already answers "this person is already employed" and "this person
 * should be rejoined", and the cheapest moment to hear either is BEFORE a
 * second employee ID exists for somebody who already has one. That mistake is
 * permanent; a redirect is not.
 *
 * TWO THINGS THIS SCREEN STILL WILL NOT DO. It will not block a create
 * because a name looked similar - the duplicate check is a warning that is
 * read and overruled. And it will not require an Aadhaar: "Skip for now" is a
 * first-class choice, not a nag. What stage 1 asks for is a decision, not an
 * Aadhaar - and either answer moves straight on to stage 2, which is why that
 * stage has no Next button of its own.
 *
 * ONE EMPLOYEE, CREATED ONCE. Nothing is written before stage 3 completes -
 * no draft record, no temporary id and no second creation path; the Aadhaar
 * verification is attached in the same transaction by the existing backend
 * create. Once created, Back cannot return to the stages that made it: a
 * created employee is edited on the profile, not re-created here.
 *
 * SALARY, PAYMENT TYPE, BANK, PF, ESI AND PAN ARE NOWHERE IN THIS FLOW.
 *
 * Back preserves everything entered; Next validates only the stage in front
 * of the manager.
 */
function AddEmployee() {
  const router = useRouter();
  const toast = useToast();
  const canCreate = usePermissions(["employee_create"]);

  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();
  const { departments } = useDepartments();
  const shiftOptions = useWorkShiftOptions(canCreate);

  const [stage, setStage] = useState(0);
  // The furthest stage reached, so a completed step stays clickable on the
  // stepper and going back never loses what was entered.
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    // personal
    employee_name: "",
    father_name: "",
    primary_contact_number: "",
    alternate_contact_number: "",
    dob: "",
    gender: "",
    marital_status: "",
    marriage_date: "",
    spouse_name: "",
    blood_group: "",
    email_id: "",
    permanent_address: "",
    residential_address: "",
    // employment
    date_of_joining: "",
    store_id: "",
    designation_id: "",
    department_id: "",
    default_work_shift_id: "",
    // education - stage 4, written against the Employee ID stage 3 creates
    qualification: "",
    additional_course: "",
    previous_experience: "",
  });

  const [duplicates, setDuplicates] = useState(null);
  const [checking, setChecking] = useState(false);
  const [aadhaarOpen, setAadhaarOpen] = useState(false);
  const [verification, setVerification] = useState(null); // {verification_id, aadhaar_last4}
  const [aadhaarSkipped, setAadhaarSkipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // The create's result. Set at the end of stage 3; stage 4 runs against
  // `created.employee_id`, and the success screen appears after stage 4.
  const [created, setCreated] = useState(null);
  const [finished, setFinished] = useState(false);

  const set = (key) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  // The backend's own minimum for a create: a name and a joining date. They
  // are collected in stages 2 and 3, so this is only ever true on the last
  // stage - which is the only stage that offers the create.
  const required = form.employee_name.trim() && form.date_of_joining;

  const stageKey = ONBOARDING_STAGES[stage].key;
  const stageContext = { verification, aadhaarSkipped };

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

  /** Move to a stage, remembering how far the manager got so Back loses nothing. */
  const goTo = (target) => {
    setErrors({});
    setStage(target);
    setFurthest((f) => Math.max(f, target));
  };

  /**
   * STAGE 1 HAS NO NEXT OF ITS OWN. Verifying or skipping IS the answer it
   * asks for, so either one moves the manager on rather than being confirmed a
   * second time on a button that says nothing.
   */
  const leaveAadhaar = () => goTo(stage + 1);

  const skipAadhaar = () => {
    setAadhaarSkipped(true);
    leaveAadhaar();
  };

  const next = async () => {
    const found = validateStage(stageKey, form, stageContext);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    // Leaving the personal stage is the earliest point at which a name,
    // mobile and date of birth all exist, so it is the earliest the
    // name-based check can say anything - and it is still before anything is
    // created. It never blocks: the answer is shown on the next stage, beside
    // the button that would create the second record.
    if (stageKey === "personal") await runDuplicateCheck();
    goTo(stage + 1);
  };

  const back = () => {
    setErrors({});
    // Once the employee exists, the stages that created it are closed:
    // anything about them is changed on the profile, not re-created here.
    if (created) return;
    setStage((s) => Math.max(0, s - 1));
  };

  const create = async () => {
    setError(null);
    const found = validateStage("employment", form, stageContext);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setBusy(true);
    try {
      const payload = buildCreatePayload(form, verification);
      const res = await HrHelper.createEmployee(payload);
      if (res && res.code && res.code !== 200) {
        setError(res.msg || "The employee could not be created.");
        return;
      }
      if (!res || !res.employee_id) {
        // A 200 with no id is not a success to celebrate, and it is not
        // safely a failure to retry either: creating a second record for the
        // same person is the one mistake that cannot be undone.
        setError(
          "The server did not return an Employee ID, so it is not certain whether the employee was created. Check the employee list before trying again."
        );
        return;
      }
      setCreated(res);
      toast({
        title: `Employee ${res.employee_id} created`,
        description: "Record their education next, or skip it.",
        status: "success",
        duration: 5000,
      });
      // Straight on to stage 4, against the ID that now exists.
      goTo(stage + 1);
    } catch (err) {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Stage 4. Saves the education columns against the created employee, or
   * finishes at once when nothing was typed - a blank education is a
   * finished onboarding, not a failed one.
   */
  const finishEducation = async () => {
    setError(null);
    const payload = buildEducationPayload(form);
    if (!payload) {
      setFinished(true);
      return;
    }
    setBusy(true);
    try {
      const res = await HrHelper.saveOnboardingEducation(created.employee_id, payload);
      if (res && res.code && res.code !== 200) {
        setError(res.msg || "The education details could not be saved. The employee has already been created.");
        return;
      }
      setFinished(true);
    } catch (err) {
      setError("Could not reach the server. The employee has already been created.");
    } finally {
      setBusy(false);
    }
  };

  const summary = duplicateSummary(duplicates);
  const success = finished ? createdSummary(created) : null;

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

  /* ------------------------------------------------------ after stage 4 */
  if (success) {
    return (
      <GlobalWrapper title="Employee created">
        <CustomContainer title="Employee created" filledHeader>
          <Stack spacing={5} maxW="700px">
            <Alert status="success" alignItems="flex-start" fontSize="sm">
              <AlertIcon />
              <Stack spacing={2}>
                <Heading size="sm">{success.title}</Heading>
                <Text>
                  Employee ID <strong>{success.employeeId}</strong> is permanent and is how every
                  other screen refers to {form.employee_name.trim() || "this employee"}.
                </Text>
                <Text>{success.aadhaarNote}</Text>
                <Text color="gray.700">{success.hrNote}</Text>
              </Stack>
            </Alert>

            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
              <Link href={`/hr/employees/${success.employeeId}`} passHref>
                <Button colorScheme="purple">Open employee</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  // A fresh person, not an edit of the last one.
                  router.reload();
                }}
              >
                Add another employee
              </Button>
              <Link href="/hr/employees" passHref>
                <Button variant="ghost">Back to employees</Button>
              </Link>
            </Stack>
          </Stack>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  /* ----------------------------------------------------------- the stages */
  return (
    <GlobalWrapper title="Add Employee">
      <CustomContainer title="Add Employee" filledHeader>
        <Stack spacing={5} maxW="900px">
          <OnboardingStepper
            stages={ONBOARDING_STAGES}
            current={stage}
            furthest={furthest}
            onSelect={(index) => {
              // Backwards only, only to somewhere already reached, and never
              // back across the create.
              if (index < stage && !created) {
                setErrors({});
                setStage(index);
              }
            }}
          />

          <Box>
            <Heading size="sm">{ONBOARDING_STAGES[stage].title}</Heading>
            <Text fontSize="sm" color="gray.600">
              {ONBOARDING_STAGES[stage].blurb}
            </Text>
          </Box>

          {error ? (
            <Alert status="error" fontSize="sm">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}

          {/* ============================================= 1. Aadhaar ==== */}
          {stageKey === "aadhaar" ? (
            <Stack spacing={4}>
              {/* Only shown on a RETURN to stage 1 - a fresh decision moves the
                  manager straight on, so there is nothing to report yet. */}
              {verification ? (
                <Alert status="success" fontSize="sm">
                  <AlertIcon />
                  <Text fontWeight="bold">
                    Aadhaar verified{" "}
                    <Badge colorScheme="green">ending {verification.aadhaar_last4}</Badge>
                  </Text>
                </Alert>
              ) : aadhaarSkipped ? (
                <Alert status="info" fontSize="sm">
                  <AlertIcon />
                  <Text>Aadhaar Pending.</Text>
                </Alert>
              ) : null}

              <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
                <Button
                  size="sm"
                  colorScheme="purple"
                  onClick={() => {
                    setErrors({});
                    setAadhaarOpen(true);
                  }}
                >
                  {verification ? "Verify a different Aadhaar" : "Verify Aadhaar"}
                </Button>
                {verification ? (
                  // A verified Aadhaar has no Skip to offer, and coming back to
                  // this stage must not be a dead end.
                  <Button size="sm" variant="outline" onClick={leaveAadhaar}>
                    Continue
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={skipAadhaar}>
                    Skip for now
                  </Button>
                )}
              </Stack>

              <Text fontSize="xs" color="gray.600">
                Aadhaar can be completed later if skipped.
              </Text>
            </Stack>
          ) : null}

          {/* ============================================ 2. Personal ==== */}
          {stageKey === "personal" ? (
            <Stack spacing={4}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired isInvalid={Boolean(errors.employee_name)}>
                  <FormLabel fontSize="sm">Name</FormLabel>
                  <Input size="sm" value={form.employee_name} onChange={set("employee_name")} />
                  <FormErrorMessage fontSize="xs">{errors.employee_name}</FormErrorMessage>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Father&apos;s name</FormLabel>
                  <Input size="sm" value={form.father_name} onChange={set("father_name")} />
                </FormControl>
                <FormControl isInvalid={Boolean(errors.primary_contact_number)}>
                  <FormLabel fontSize="sm">Mobile</FormLabel>
                  <Input
                    size="sm"
                    inputMode="numeric"
                    value={form.primary_contact_number}
                    onChange={set("primary_contact_number")}
                  />
                  <FormErrorMessage fontSize="xs">{errors.primary_contact_number}</FormErrorMessage>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Alternate contact</FormLabel>
                  <Input
                    size="sm"
                    inputMode="numeric"
                    value={form.alternate_contact_number}
                    onChange={set("alternate_contact_number")}
                  />
                  <FormHelperText fontSize="xs">Used as the emergency contact.</FormHelperText>
                </FormControl>
                <FormControl isInvalid={Boolean(errors.dob)}>
                  <FormLabel fontSize="sm">Date of birth</FormLabel>
                  <Input type="date" size="sm" value={form.dob} onChange={set("dob")} />
                  <FormErrorMessage fontSize="xs">{errors.dob}</FormErrorMessage>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Gender</FormLabel>
                  <Select size="sm" placeholder="Not recorded" value={form.gender} onChange={set("gender")}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Marital status</FormLabel>
                  <Select
                    size="sm"
                    placeholder="Not recorded"
                    value={form.marital_status}
                    onChange={set("marital_status")}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Blood group</FormLabel>
                  <Input size="sm" value={form.blood_group} onChange={set("blood_group")} />
                </FormControl>
                {form.marital_status === "Married" ? (
                  <>
                    <FormControl>
                      <FormLabel fontSize="sm">Spouse&apos;s name</FormLabel>
                      <Input size="sm" value={form.spouse_name} onChange={set("spouse_name")} />
                    </FormControl>
                    <FormControl isInvalid={Boolean(errors.marriage_date)}>
                      <FormLabel fontSize="sm">Marriage date</FormLabel>
                      <Input
                        type="date"
                        size="sm"
                        value={form.marriage_date}
                        onChange={set("marriage_date")}
                      />
                      <FormErrorMessage fontSize="xs">{errors.marriage_date}</FormErrorMessage>
                    </FormControl>
                  </>
                ) : null}
                <FormControl isInvalid={Boolean(errors.email_id)}>
                  <FormLabel fontSize="sm">Email</FormLabel>
                  <Input size="sm" type="email" value={form.email_id} onChange={set("email_id")} />
                  <FormErrorMessage fontSize="xs">{errors.email_id}</FormErrorMessage>
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">Residential address</FormLabel>
                  <Input
                    size="sm"
                    value={form.residential_address}
                    onChange={set("residential_address")}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Permanent address</FormLabel>
                  <Input
                    size="sm"
                    value={form.permanent_address}
                    onChange={set("permanent_address")}
                  />
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
              {summary.show ? (
                <DuplicateWarning summary={summary} />
              ) : duplicates ? (
                <Alert status="success" fontSize="sm">
                  <AlertIcon />
                  No possible duplicate found.
                </Alert>
              ) : null}
            </Stack>
          ) : null}

          {/* ========================================== 3. Employment ==== */}
          {stageKey === "employment" ? (
            <Stack spacing={4}>
              {/* The warning sits here, on the stage that creates the record,
                  because this is the last moment at which a second employee ID
                  can still be avoided. */}
              <DuplicateWarning summary={summary} />

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired isInvalid={Boolean(errors.date_of_joining)}>
                  <FormLabel fontSize="sm">Joining date</FormLabel>
                  <Input
                    type="date"
                    size="sm"
                    value={form.date_of_joining}
                    onChange={set("date_of_joining")}
                  />
                  {errors.date_of_joining ? (
                    <FormErrorMessage fontSize="xs">{errors.date_of_joining}</FormErrorMessage>
                  ) : (
                    <FormHelperText fontSize="xs">Cannot be in the future.</FormHelperText>
                  )}
                </FormControl>
                <FormControl isRequired isInvalid={Boolean(errors.store_id)}>
                  <FormLabel fontSize="sm">Outlet</FormLabel>
                  <Select size="sm" placeholder="Select outlet" value={form.store_id} onChange={set("store_id")}>
                    {outlets.map((o) => (
                      <option key={o.outlet_id} value={o.outlet_id}>
                        {o.outlet_name}
                      </option>
                    ))}
                  </Select>
                  <FormErrorMessage fontSize="xs">{errors.store_id}</FormErrorMessage>
                </FormControl>
                <FormControl isRequired isInvalid={Boolean(errors.designation_id)}>
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
                  <FormErrorMessage fontSize="xs">{errors.designation_id}</FormErrorMessage>
                </FormControl>
                <FormControl isRequired isInvalid={Boolean(errors.department_id)}>
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
                  <FormErrorMessage fontSize="xs">{errors.department_id}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={Boolean(errors.default_work_shift_id)}>
                  <FormLabel fontSize="sm">Shift</FormLabel>
                  {/* The NEW work shift master, active shifts only. */}
                  <Select
                    size="sm"
                    placeholder={
                      shiftOptions.loading
                        ? "Loading shifts…"
                        : shiftOptions.options.length === 0
                        ? "No active shifts available"
                        : "Select shift (optional)"
                    }
                    value={form.default_work_shift_id}
                    onChange={set("default_work_shift_id")}
                    isDisabled={shiftOptions.loading || shiftOptions.options.length === 0}
                  >
                    {shiftOptions.options.map((o) => (
                      <option key={o.work_shift_id} value={o.work_shift_id}>
                        {[o.shift_code, o.shift_name].filter(Boolean).join(" - ")}
                        {o.timing ? ` · ${o.timing}` : ""}
                      </option>
                    ))}
                  </Select>
                  {errors.default_work_shift_id ? (
                    <FormErrorMessage fontSize="xs">{errors.default_work_shift_id}</FormErrorMessage>
                  ) : (
                    <FormHelperText fontSize="xs">
                      {shiftOptions.denied || shiftOptions.error
                        ? "Shifts could not be listed. The employee can still be created and assigned a shift later."
                        : "Can be left blank and assigned later from Employee Shift Assignment."}
                    </FormHelperText>
                  )}
                </FormControl>
              </SimpleGrid>

              <Alert status="info" fontSize="sm">
                <AlertIcon />
                <Stack spacing={0}>
                  <Text fontWeight="bold">This creates the employee and their Employee ID.</Text>
                  <Text>
                    Education follows on the next stage. Payment, statutory, payroll and document
                    details are completed afterwards on the same employee record by whoever holds
                    those rights.
                  </Text>
                </Stack>
              </Alert>
            </Stack>
          ) : null}

          {/* =========================================== 4. Education ==== */}
          {stageKey === "education" ? (
            <Stack spacing={4}>
              {created ? (
                <Alert status="success" fontSize="sm">
                  <AlertIcon />
                  <Text>
                    Employee <strong>{created.employee_id}</strong> has been created. Education is
                    recorded against that ID.
                  </Text>
                </Alert>
              ) : null}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">Qualification</FormLabel>
                  <Input size="sm" value={form.qualification} onChange={set("qualification")} />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Additional course</FormLabel>
                  <Input size="sm" value={form.additional_course} onChange={set("additional_course")} />
                </FormControl>
              </SimpleGrid>
              <FormControl>
                <FormLabel fontSize="sm">Previous experience</FormLabel>
                <Textarea
                  size="sm"
                  rows={3}
                  value={form.previous_experience}
                  onChange={set("previous_experience")}
                />
                <FormHelperText fontSize="xs">
                  All optional. Leave blank and choose Finish if not known yet.
                </FormHelperText>
              </FormControl>
            </Stack>
          ) : null}

          <Divider />

          {/* -------------------------------------------------- the footer */}
          <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
            {stage > 0 && !created ? (
              <Button variant="outline" onClick={back} isDisabled={busy}>
                Back
              </Button>
            ) : null}

            {isCreateStage(stage) ? (
              <Button colorScheme="purple" isLoading={busy} isDisabled={!required} onClick={create}>
                Create employee &amp; generate ID
              </Button>
            ) : isFinalStage(stage) ? (
              <Button colorScheme="purple" isLoading={busy} onClick={finishEducation}>
                {buildEducationPayload(form) ? "Save education & finish" : "Finish without education"}
              </Button>
            ) : stageKey === "aadhaar" ? null : (
              <Button colorScheme="purple" isLoading={checking} onClick={next}>
                Next
              </Button>
            )}

            {created ? null : (
              <Link href="/hr/employees" passHref>
                <Button variant="ghost">Cancel</Button>
              </Link>
            )}
          </Stack>

          {/* A disabled button with no explanation is a dead end. The gate is
              the backend's own minimum, and it says which half is missing. */}
          {isCreateStage(stage) && !required ? (
            <Text fontSize="xs" color="gray.600">
              {form.employee_name.trim()
                ? "A joining date is needed before the employee can be created."
                : "A name and a joining date are needed before the employee can be created. The name is on the previous stage."}
            </Text>
          ) : null}
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
            setAadhaarSkipped(false);
            // The verified name and date of birth are better than anything
            // typed by hand, so they fill what is still blank.
            setForm((f) => applyVerifiedDemographics(f, decision));
            // The decision has been made, so stage 1 is finished with.
            leaveAadhaar();
            return;
          }
          // Already employed, or should be rejoined: this is not a create, and
          // it is why stage 1 asks before anything exists.
          if (outcome && outcome.employeeId) {
            router.push(`/hr/employees/${outcome.employeeId}`);
          }
        }}
      />
    </GlobalWrapper>
  );
}

/**
 * The possible-duplicate warning. ADVICE, NOT A BLOCK - it never disables the
 * create, and the inactive matches are the half that matters: that is where a
 * second employee ID would otherwise be created for somebody who should be
 * rejoined onto the ID they already have.
 */
function DuplicateWarning({ summary }) {
  if (!summary || !summary.show) return null;
  return (
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
          This is advice, not a block. If none of these is the same person, carry on.
        </Text>
      </Stack>
    </Alert>
  );
}

export default AddEmployee;
