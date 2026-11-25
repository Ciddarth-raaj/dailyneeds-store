import React, { useState } from "react";
import {
  Button,
  Input,
  Checkbox,
  Text,
  Alert,
  AlertIcon,
  Link,
  Stack,
  FormControl,
  FormLabel,
  FormHelperText,
  useToast,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import HrHelper from "../../helper/hr";
import { aadhaarOutcome } from "../../util/hrStatus";

/**
 * Stage 0C / C3 — Aadhaar verification through DigiLocker, used from two
 * places.
 *
 * It used to be an OTP typed in here (Aadhaar OKYC). UIDAI discontinued OKYC,
 * so the employee now consents on DigiLocker instead:
 *
 *   enter       HR types the Aadhaar number and records consent
 *   digilocker  the EMPLOYEE opens the DigiLocker link, logs in with the OTP
 *               sent to their Aadhaar-linked mobile, and allows Aadhaar
 *   outcome     "Check status" reads the result; the last four digits must
 *               match the number typed here
 *
 *
 *   Add Employee    verify first, then create with the verification attached
 *   Employee profile verify later, then attach to the existing employee_id
 *
 * The two differ only in what happens after a successful verification, so the
 * caller supplies `onVerified(decision)` and this component stays the same.
 *
 * THEY NO LONGER SHARE ONE PAIR OF ENDPOINTS, and that is the fix this prop
 * carries. `employeeId` is the whole difference:
 *
 *   absent   Add Employee. The onboarding endpoints, unchanged:
 *            `employee_create` plus `edit_employee_sensitive`, because the
 *            body carries an Aadhaar number and B3 guards that write.
 *   present  An employee who already exists. The existing-employee endpoints,
 *            which require `verify_employee_aadhaar` + branch scope and refuse
 *            an Aadhaar that is already VERIFIED.
 *
 * A store manager holds the second set and not the first, which is why the
 * profile's "Verify now" used to end in "You do not have permission to perform
 * this action". Nothing about Add Employee changes: with no `employeeId` this
 * component calls exactly what it always called.
 *
 * WHAT NEVER LEAVES THIS COMPONENT: the Aadhaar number is held in local state
 * only long enough to POST it. It is never logged, stored or put in a URL, and
 * the backend never sends it back. What comes back is an opaque token, the
 * DigiLocker link, the last four digits, and a decision.
 */
function AadhaarVerifyModal({ isOpen, onClose, onVerified, employeeName, employeeId = null }) {
  const toast = useToast();

  const [step, setStep] = useState("enter"); // enter -> digilocker -> outcome
  const [aadhaar, setAadhaar] = useState("");
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState(null);
  const [decision, setDecision] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setStep("enter");
    setAadhaar("");
    setConsent(false);
    setSession(null);
    setDecision(null);
    setNotice(null);
    setError(null);
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  /** The backend's refusals arrive as `{ code, msg }`; show the message it chose. */
  const failed = (res) => res && res.code && res.code !== 200;

  const initiate = async () => {
    setError(null);
    if (!consent) {
      setError("The employee's consent is required before an Aadhaar can be sent for verification.");
      return;
    }
    setBusy(true);
    try {
      const payload = { aadhaar_number: aadhaar.replace(/\s/g, ""), consent_given: true };
      const res = employeeId
        ? await HrHelper.initiateAadhaarForEmployee(employeeId, payload)
        : await HrHelper.initiateAadhaar(payload);
      if (failed(res)) {
        setError(res.msg || "Could not start DigiLocker verification.");
        return;
      }
      setSession(res);
      setStep("digilocker");
      // The number has done its job; drop it rather than leaving it in state.
      setAadhaar("");
    } catch (err) {
      setError("Could not reach the verification service. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  /** Lets HR send the link to the employee's own phone. */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(session.authorization_url);
      toast({ title: "DigiLocker link copied", status: "info", duration: 3000 });
    } catch (err) {
      setError("Could not copy the link. Open it instead, or copy it from the address bar.");
    }
  };

  const check = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const payload = { verification_token: session.verification_token };
      const res = employeeId
        ? await HrHelper.completeAadhaarForEmployee(employeeId, payload)
        : await HrHelper.completeAadhaar(payload);
      if (failed(res)) {
        // A provider hiccup is retryable and the session survives; anything
        // else means starting again, and the message says which.
        setError(res.msg || "The Aadhaar could not be verified.");
        return;
      }
      if (res.status === "pending") {
        setNotice(res.message || "Not finished on DigiLocker yet.");
        return;
      }
      setDecision(res);
      setStep("outcome");
    } catch (err) {
      setError("Could not reach the verification service. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const outcome = aadhaarOutcome(decision);

  const body = (
    <Stack spacing={4}>
      {error ? (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          {error}
        </Alert>
      ) : null}

      {notice ? (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          {notice}
        </Alert>
      ) : null}

      {step === "enter" ? (
        <>
          <FormControl>
            <FormLabel fontSize="sm">Aadhaar number</FormLabel>
            <Input
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
              placeholder="12 digits"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
            />
            <FormHelperText>
              The employee then confirms it on DigiLocker with an OTP sent to their Aadhaar-linked
              mobile. The number is encrypted and never shown again - only the last four digits.
            </FormHelperText>
          </FormControl>
          <Checkbox isChecked={consent} onChange={(e) => setConsent(e.target.checked)}>
            <Text fontSize="sm">
              {employeeName ? `${employeeName} has` : "The employee has"} consented to this Aadhaar
              being verified for employment onboarding.
            </Text>
          </Checkbox>
        </>
      ) : null}

      {step === "digilocker" && session ? (
        <>
          <Text fontSize="sm">
            Ask {employeeName || "the employee"} to open DigiLocker, log in with the OTP sent to the
            mobile registered against Aadhaar ending <strong>{session.aadhaar_last4}</strong>, and allow
            their Aadhaar to be shared.
          </Text>
          <Stack direction="row" spacing={3}>
            <Button
              as={Link}
              href={session.authorization_url}
              isExternal
              colorScheme="purple"
              variant="outline"
              size="sm"
              _hover={{ textDecoration: "none" }}
            >
              Open DigiLocker
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink}>
              Copy link
            </Button>
          </Stack>
          <Text fontSize="sm" color="gray.600">
            When DigiLocker says it is done, click Check status.
          </Text>
        </>
      ) : null}

      {step === "outcome" && outcome ? (
        <Alert
          status={outcome.tone === "success" ? "success" : outcome.tone === "warning" ? "warning" : "error"}
          flexDirection="column"
          alignItems="flex-start"
          fontSize="sm"
        >
          <Stack spacing={1}>
            <Text fontWeight="bold">
              <AlertIcon />
              {outcome.title}
            </Text>
            <Text>{outcome.detail}</Text>
            {decision && decision.aadhaar_last4 ? (
              <Text color="gray.600">Aadhaar ending {decision.aadhaar_last4}</Text>
            ) : null}
          </Stack>
        </Alert>
      ) : null}
    </Stack>
  );

  const footer = (
    <>
      <Button variant="ghost" mr={3} onClick={close} size="sm">
        Cancel
      </Button>
      {step === "enter" ? (
        <Button colorScheme="purple" size="sm" isLoading={busy} onClick={initiate}>
          Continue to DigiLocker
        </Button>
      ) : null}
      {step === "digilocker" ? (
        <Button colorScheme="purple" size="sm" isLoading={busy} onClick={check}>
          Check status
        </Button>
      ) : null}
      {step === "outcome" ? (
        <Button
          colorScheme="purple"
          size="sm"
          onClick={() => {
            const d = decision;
            reset();
            onVerified(d, outcome);
          }}
        >
          {outcome ? outcome.cta : "Continue"}
        </Button>
      ) : null}
    </>
  );

  return (
    <CustomModal isOpen={isOpen} onClose={close} title="Verify Aadhaar" footer={footer} size="md" isCentered>
      {body}
    </CustomModal>
  );
}

export default AadhaarVerifyModal;
