import React, { useRef, useState } from "react";
import { Avatar, Box, Button, Stack, Text } from "@chakra-ui/react";
import { resizeToDataUri, ACCEPTED_TYPES } from "../../../util/employeePhoto";

/**
 * The employee's photo, and the only place in the application that can set
 * one.
 *
 * IT WRITES THE COLUMN THAT ALREADY EXISTS. `new_employee.employee_image` is
 * on the employee-master editable allowlist and is what every avatar in the
 * application already renders - the employee list card, the onboarding
 * queue, the comment threads. What was missing was any way to put a photo
 * there, so a record could only ever show initials. This saves through the
 * same POST /hr/employee/:id/edit as every other field on the profile, with
 * no new endpoint, no new storage and no second place a photo can live.
 *
 * THE FILE IS RESIZED BEFORE IT IS SENT, always - see
 * `util/employeePhoto.js`. A phone photo is several megabytes and would be
 * carried on every subsequent read of the profile; what is stored is a
 * 512-pixel JPEG of about thirty kilobytes.
 *
 * NO PHOTO IS NOT AN ERROR STATE. Chakra draws the initials from the name,
 * which is what almost every employee will show and is a perfectly good
 * answer.
 */
function EmployeePhotoHeader({ employee = {}, canEdit = false, onSave, saving = false, toast }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const photo = employee.employee_image || "";

  const choose = () => inputRef.current && inputRef.current.click();

  const onPicked = async (event) => {
    const file = event.target.files && event.target.files[0];
    // Cleared immediately so picking the SAME file again still fires a
    // change event - otherwise a retry after a failure does nothing.
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const dataUri = await resizeToDataUri(file);
      await onSave({ employee_image: dataUri });
    } catch (err) {
      if (toast) {
        toast({
          title: (err && err.message) || "That photo could not be used",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onSave({ employee_image: "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack direction="row" spacing={4} align="center">
      <Avatar size="lg" name={employee.employee_name || undefined} src={photo || undefined} />
      <Box minW="0">
        <Text fontWeight="semibold" fontSize="md" color="gray.900" noOfLines={2}>
          {employee.employee_name || "Unnamed"}
        </Text>
        {canEdit ? (
          <Stack direction="row" spacing={2} mt={1} align="center">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={onPicked}
              style={{ display: "none" }}
              data-testid="employee-photo-input"
            />
            <Button
              size="xs"
              variant="outline"
              onClick={choose}
              isLoading={busy || saving}
              loadingText="Saving"
            >
              {photo ? "Change photo" : "Upload photo"}
            </Button>
            {photo ? (
              <Button size="xs" variant="ghost" colorScheme="red" onClick={remove} isDisabled={busy || saving}>
                Remove
              </Button>
            ) : null}
          </Stack>
        ) : null}
        {canEdit ? (
          <Text fontSize="10px" color="gray.500" mt={1}>
            Resized to 512px and stored as a small JPEG; the original file is not kept.
          </Text>
        ) : null}
      </Box>
    </Stack>
  );
}

export default EmployeePhotoHeader;
