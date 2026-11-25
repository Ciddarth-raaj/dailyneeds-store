/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { toast } from "react-toastify";

import styles from "../styles/login.module.css";
import UserHelper from "../helper/user";

/** Mirrors AUTH_PASSWORD_MIN_LENGTH on the API, which is what enforces it. */
const MIN_LENGTH = 8;

/**
 * Redeem a setup or reset link (Stage 0A / B5).
 *
 * The link carries a single-use token. This page never sees the account it
 * belongs to — it sends the token and the chosen password, and the server
 * decides. A wrong, used or expired token gets one generic message.
 */
export default function SetupPassword() {
  const [token, setToken] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  const problem = (() => {
    if (!token) return "This link is missing its token. Ask your administrator for a new one.";
    if (next.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters`;
    if (confirm !== next) return "The two passwords do not match";
    return null;
  })();

  const submit = async (e) => {
    e.preventDefault();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await UserHelper.setupPassword(token, next);
      setDone(true);
      toast.success("Password set. You can sign in now.");
    } catch (err) {
      setError(err?.message || "Could not set password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container className={styles.mainWrapper}>
      <form onSubmit={submit}>
        <div className={styles.wrapper}>
          <h3 className={styles.title}>
            <img src={"/assets/dnds-logo.png"} alt="logo" />
          </h3>

          {done ? (
            <Stack spacing={4}>
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <AlertDescription>Your password is set.</AlertDescription>
              </Alert>
              <Button colorScheme="purple" onClick={() => (window.location.href = "/login")}>
                Go to sign in
              </Button>
            </Stack>
          ) : (
            <Stack spacing={4}>
              <Text fontSize="14px">Choose a password for your dnds.co.in account.</Text>

              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <Box fontSize="13px">
                    <AlertDescription>{error}</AlertDescription>
                  </Box>
                </Alert>
              )}

              <FormControl isInvalid={Boolean(error) && next.length < MIN_LENGTH}>
                <FormLabel fontSize="14px">New password</FormLabel>
                <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoFocus />
                <FormErrorMessage>At least {MIN_LENGTH} characters</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(error) && confirm !== next}>
                <FormLabel fontSize="14px">Repeat new password</FormLabel>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <FormErrorMessage>The two passwords must match</FormErrorMessage>
              </FormControl>

              <Text fontSize="12px" color="gray.500">
                Not your employee code, mobile number or username. Pick something you will remember
                without writing it down.
              </Text>

              <Button type="submit" colorScheme="purple" isLoading={busy} isDisabled={!token}>
                Set password
              </Button>
            </Stack>
          )}
        </div>
      </form>
    </Container>
  );
}
