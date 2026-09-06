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
import { validate } from "../components/ChangePassword";

/**
 * Standalone change-password screen (Stage 0A).
 *
 * Reached from the login flow when the account is flagged
 * must_change_password. While enforcement is on, the session can reach
 * nothing else until this succeeds, so the page offers no navigation away
 * except sign-out.
 */
export default function ChangePasswordPage() {
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setRequired(params.get("required") === "1");
    if (!localStorage.getItem("Token")) window.location.href = "/login";
  }, []);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate(values);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await UserHelper.changePassword(values.current, values.next);
      toast.success("Password updated");
      // The server issued token_valid_from on change; sign in again cleanly.
      localStorage.clear();
      window.location.href = "/login";
    } catch (err) {
      setError({ field: null, message: err?.message || "Could not change password" });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await UserHelper.logout();
    } catch (err) {
      // ignore
    }
    localStorage.clear();
    window.location.href = "/login";
  };

  const fieldError = (field) => (error && error.field === field ? error.message : null);

  return (
    <Container className={styles.mainWrapper}>
      <form onSubmit={submit}>
        <div className={styles.wrapper}>
          <h3 className={styles.title}>
            <img src={"/assets/dnds-logo.png"} alt="logo" />
          </h3>

          <Stack spacing={4}>
            {required && (
              <Alert status="warning" borderRadius="md" alignItems="flex-start">
                <AlertIcon />
                <Box fontSize="13px">
                  <AlertDescription>
                    You need to choose a new password before continuing. Your current one is a
                    default or has been flagged by an administrator.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {error && !error.field && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="13px">{error.message}</AlertDescription>
              </Alert>
            )}

            <FormControl isInvalid={Boolean(fieldError("current"))}>
              <FormLabel fontSize="14px">Current password</FormLabel>
              <Input type="password" value={values.current} onChange={set("current")} autoFocus />
              <FormErrorMessage>{fieldError("current")}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={Boolean(fieldError("next"))}>
              <FormLabel fontSize="14px">New password</FormLabel>
              <Input type="password" value={values.next} onChange={set("next")} />
              <FormErrorMessage>{fieldError("next")}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={Boolean(fieldError("confirm"))}>
              <FormLabel fontSize="14px">Repeat new password</FormLabel>
              <Input type="password" value={values.confirm} onChange={set("confirm")} />
              <FormErrorMessage>{fieldError("confirm")}</FormErrorMessage>
            </FormControl>

            <Text fontSize="12px" color="gray.500">
              Not your employee code, mobile number or username, and not the password you were
              given when your account was created.
            </Text>

            <Button type="submit" colorScheme="purple" isLoading={busy}>
              Change password
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out instead
            </Button>
          </Stack>
        </div>
      </form>
    </Container>
  );
}
