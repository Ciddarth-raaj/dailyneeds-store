import React, { useState } from "react";
import {
  Button,
  Input,
  Checkbox,
  Text,
  Alert,
  AlertIcon,
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
 * Stage 0C / C3 — the Aadhaar OTP flow, used from two places.
 *
 *   Add Employee    verify first, then create with the verification attached
 *   Employee profile verify later, then attach to the existing employee_id
 *
 * The two differ only in what happens after a successful verification, so the
 * caller supplies `onVerified(decision)` and this component stays the same.
 *
 * WHAT NEVER LEAVES THIS COMPONENT: the Aadhaar number is held in local state
 * only long enough to POST it, and the OTP likewise. Neither is logged, stored
 * or put in a URL, and the backend never sends either back. What comes back is
 * an opaque token, the last four digits, and a decision.
 */
function AadhaarVerifyModal({ isOpen, onClose, onVerified, employeeName }) {
  const toast = useToast();

  const [step, setStep] = useState("enter"); // enter -> otp -> outcome
  const [aadhaar, setAadhaar] = useState("");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState(null);
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setStep("enter");
    setAadhaar("");
    setConsent(false);
    setOtp("");
    setSession(null);
    setDecision(null);
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
      const res = await HrHelper.initiateAadhaar({
        aadhaar_number: aadhaar.replace(/\s/g, ""),
        consent_given: true,
      });
      if (failed(res)) {
        setError(res.msg || "Could not send the OTP.");
        return;
      }
      setSession(res);
      setStep("otp");
      // The number has done its job; drop it rather than leaving it in state.
      setAadhaar("");
      toast({ title: "OTP sent to the registered mobile number", status: "info", duration: 4000 });
    } catch (err) {
      setError("Could not reach the verification service. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await HrHelper.verifyAadhaarOtp({
        verification_token: session.verification_token,
        otp: otp.trim(),
      });
      if (failed(res)) {
        // A wrong digit is retryable and the session survives; anything else
        // means starting again, and the message says which.
        setError(res.msg || "The OTP could not be verified.");
        return;
      }
      setDecision(res);
      setStep("outcome");
      setOtp("");
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
              An OTP goes to the mobile registered against this Aadhaar. The number is encrypted and
              never shown again - only the last four digits.
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

      {step === "otp" ? (
        <>
          <Text fontSize="sm">
            Enter the OTP sent to the mobile registered against Aadhaar ending{" "}
            <strong>{session && session.aadhaar_last4}</strong>.
          </Text>
          <FormControl>
            <FormLabel fontSize="sm">OTP</FormLabel>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6 digits"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
            />
          </FormControl>
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
          Send OTP
        </Button>
      ) : null}
      {step === "otp" ? (
        <Button colorScheme="purple" size="sm" isLoading={busy} onClick={verify} isDisabled={!otp.trim()}>
          Verify OTP
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
