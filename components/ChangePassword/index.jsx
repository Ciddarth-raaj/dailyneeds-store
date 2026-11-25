import React, { useEffect, useState } from "react";
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";

import CustomModal from "../CustomModal";
import UserHelper from "../../helper/user";

/** Must match AUTH_PASSWORD_MIN_LENGTH in the API, which is what actually enforces it. */
export const MIN_PASSWORD_LENGTH = 8;

const EMPTY = { current: "", next: "", confirm: "" };

/**
 * The first problem with the form, or null when it is ready to submit.
 *
 * Kept apart from the component so the rules read in one place: the two new
 * fields must agree, the new password must be long enough, and it must
 * actually be a change. The server checks all of this again — this only
 * saves the user a round trip and tells them which field is wrong.
 */
export function validate({ current, next, confirm }) {
  if (current === "") return { field: "current", message: "Enter your current password" };
  if (next.length < MIN_PASSWORD_LENGTH) {
    return {
      field: "next",
      message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  if (next === current) {
    return {
      field: "next",
      message: "New password must be different from the current one",
    };
  }
  if (confirm !== next) {
    return { field: "confirm", message: "The two new passwords do not match" };
  }
  return null;
}

/** A password box with its own show/hide toggle. */
function PasswordField({ label, value, onChange, error, autoFocus }) {
  const [visible, setVisible] = useState(false);

  return (
    <FormControl isInvalid={Boolean(error)}>
      <FormLabel fontSize="14px" mb="6px">
        {label}
      </FormLabel>
      <InputGroup>
        <Input
          type={visible ? "text" : "password"}
          value={value}
          autoFocus={autoFocus}
          autoComplete={label === "Current password" ? "current-password" : "new-password"}
          onChange={(event) => onChange(event.target.value)}
        />
        <InputRightElement width="3rem">
          <Button
            h="1.6rem"
            size="sm"
            variant="ghost"
            tabIndex={-1}
            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
            onClick={() => setVisible((shown) => !shown)}
          >
            <i
              className={visible ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}
              aria-hidden="true"
            />
          </Button>
        </InputRightElement>
      </InputGroup>
      {error ? <FormErrorMessage fontSize="13px">{error}</FormErrorMessage> : null}
    </FormControl>
  );
}

/**
 * Change-your-own-password dialog, opened from the header menu.
 *
 * Only the signed-in user's password can be changed here — the API takes
 * the account from the token. The current password is asked for as well,
 * so a session left open on a shared shop-floor terminal cannot be used to
 * lock its owner out.
 *
 * The token keeps working afterwards: it carries no password, and forcing a
 * re-login would only interrupt whatever the user was in the middle of.
 */
function ChangePasswordModal({ isOpen, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Never leave a typed password sitting in state behind a closed dialog.
  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY);
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  const set = (field) => (value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError(null);
  };

  const submit = async () => {
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    try {
      await UserHelper.changePassword(form.current, form.next);
      toast.success("Password changed");
      onClose();
    } catch (err) {
      // The server tells apart a wrong current password from a rejected new
      // one; show its wording rather than flattening both into "failed".
      const message = err?.message || "Could not change password";
      setError({ field: "current", message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const errorFor = (field) => (error?.field === field ? error.message : null);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title="Change Password"
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            mr="10px"
            onClick={onClose}
            isDisabled={saving}
          >
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={submit} isLoading={saving}>
            Change Password
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving) submit();
        }}
      >
        <Stack spacing="16px">
          <Text fontSize="13px" color="gray.600">
            Enter your current password, then the new one twice. It must be at
            least {MIN_PASSWORD_LENGTH} characters.
          </Text>
          <PasswordField
            label="Current password"
            value={form.current}
            onChange={set("current")}
            error={errorFor("current")}
            autoFocus
          />
          <PasswordField
            label="New password"
            value={form.next}
            onChange={set("next")}
            error={errorFor("next")}
          />
          <PasswordField
            label="Confirm new password"
            value={form.confirm}
            onChange={set("confirm")}
            error={errorFor("confirm")}
          />
          {/* Lets Enter submit the form without a visible second button. */}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </Stack>
      </form>
    </CustomModal>
  );
}

export default ChangePasswordModal;
