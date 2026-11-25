import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";

import CustomModal from "../CustomModal";
import UserHelper from "../../helper/user";
import { MIN_PASSWORD_LENGTH } from "../ChangePassword";

/**
 * Reset a forgotten password with a code sent over Telegram.
 *
 * Two steps in one dialog. The first asks for the username and triggers the
 * send; the second takes the code and the new password. The username is
 * carried between them rather than asked for twice.
 *
 * The first step's message is deliberately non-committal — the server will
 * not say whether the account exists or has Telegram linked, so this cannot
 * claim a code is on its way. Saying "if..." is the honest phrasing and it
 * keeps the screen from being used to find out who works here.
 */
function ForgotPasswordModal({ isOpen, onClose, initialUsername = "" }) {
  const [step, setStep] = useState("request");
  const [username, setUsername] = useState(initialUsername);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("request");
      setUsername(initialUsername);
      setCode("");
      setPassword("");
      setConfirm("");
      setError(null);
      setBusy(false);
      setDone(false);
    }
  }, [isOpen, initialUsername]);

  const requestCode = async () => {
    if (username.trim() === "") {
      setError("Enter your username");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await UserHelper.forgotPassword(username.trim());
      setStep("verify");
    } catch (err) {
      setError(err?.message || "Could not send a code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    if (code.trim() === "") {
      setError("Enter the code from Telegram");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError("The two new passwords do not match");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await UserHelper.resetPassword(username.trim(), code.trim(), password);
      setDone(true);
    } catch (err) {
      setError(err?.message || "Could not reset password");
    } finally {
      setBusy(false);
    }
  };

  const footer = done ? (
    <Button colorScheme="purple" onClick={onClose}>
      Back to login
    </Button>
  ) : (
    <>
      <Button variant="ghost" mr="10px" onClick={onClose} isDisabled={busy}>
        Cancel
      </Button>
      <Button
        colorScheme="purple"
        isLoading={busy}
        onClick={step === "request" ? requestCode : submitReset}
      >
        {step === "request" ? "Send code" : "Reset password"}
      </Button>
    </>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title="Forgot Password"
      size="sm"
      footer={footer}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || done) return;
          if (step === "request") requestCode();
          else submitReset();
        }}
      >
        <Stack spacing="16px">
          {done ? (
            <Alert status="success" borderRadius="md" fontSize="13px">
              <AlertIcon />
              Password changed. Sign in with your new password.
            </Alert>
          ) : null}

          {!done && step === "request" ? (
            <>
              <Text fontSize="13px" color="gray.600">
                Enter your username. If that account has Telegram linked, a
                reset code will be sent to it.
              </Text>
              <FormControl isInvalid={Boolean(error)}>
                <FormLabel fontSize="14px" mb="6px">
                  Username
                </FormLabel>
                <Input
                  value={username}
                  autoFocus
                  autoCapitalize="none"
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError(null);
                  }}
                />
                {error ? (
                  <FormErrorMessage fontSize="13px">{error}</FormErrorMessage>
                ) : null}
              </FormControl>
              {/* No Telegram link, no code. Say so here rather than let
                  someone wait for a message that will never arrive. */}
              <Text fontSize="12px" color="gray.500">
                Haven&apos;t linked Telegram? Ask an admin to reset your
                password instead.
              </Text>
            </>
          ) : null}

          {!done && step === "verify" ? (
            <>
              <Text fontSize="13px" color="gray.600">
                If <strong>{username.trim()}</strong> has Telegram linked, a
                six-digit code has been sent there. It expires in 10 minutes.
              </Text>
              <FormControl>
                <FormLabel fontSize="14px" mb="6px">
                  Code from Telegram
                </FormLabel>
                <Input
                  value={code}
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setError(null);
                  }}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="14px" mb="6px">
                  New password
                </FormLabel>
                <Input
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                />
              </FormControl>
              <FormControl isInvalid={Boolean(error)}>
                <FormLabel fontSize="14px" mb="6px">
                  Confirm new password
                </FormLabel>
                <Input
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    setError(null);
                  }}
                />
                {error ? (
                  <FormErrorMessage fontSize="13px">{error}</FormErrorMessage>
                ) : null}
              </FormControl>
              <Button
                variant="link"
                size="sm"
                colorScheme="purple"
                alignSelf="flex-start"
                isDisabled={busy}
                onClick={() => {
                  setStep("request");
                  setError(null);
                }}
              >
                Send another code
              </Button>
            </>
          ) : null}

          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </Stack>
      </form>
    </CustomModal>
  );
}

export default ForgotPasswordModal;
