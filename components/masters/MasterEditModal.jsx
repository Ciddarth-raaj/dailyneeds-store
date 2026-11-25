import React, { useEffect, useState } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";

/**
 * Rename a master, or retire it.
 *
 * Shared by the Department and Designation master screens, which need exactly
 * the same two fields and differ only in what the record is called.
 *
 * ============================================== WHY A MODAL, NOT THE PAGE ===
 *
 * Both masters already have a detail page that can edit them, and both list
 * screens can reach it. The reason editing happens here instead is the list:
 * navigating away and back loses the grid's sort, filter and scroll position,
 * so retiring six departments meant re-finding your place six times. A modal
 * edits in place and hands the row straight back.
 *
 * The detail pages are unchanged and still work; this is a second door to the
 * same two columns, not a replacement.
 *
 * ================================================= STATUS IS 1 OR 0 ========
 *
 * `status` is `int DEFAULT '1'` on both tables and the whole application reads
 * `status === 1` as Active. The control therefore offers exactly those two
 * values and submits a number, never a string - `"0"` would be truthy
 * everywhere it is later read.
 *
 * INACTIVE IS NOT DELETION. Retiring a master writes one column on one row.
 * Employees already assigned to it stay assigned to it, and nothing about
 * their record changes; the backend's update touches no employee table. That
 * is why this dialog says so rather than asking "are you sure".
 */
export const STATUS = { ACTIVE: 1, INACTIVE: 0 };

function MasterEditModal({
  isOpen,
  onClose,
  onSave,
  /** "Department" or "Designation" — the only thing that differs. */
  noun,
  /** The row being edited: `{ id, name, status }`. */
  record,
  saving,
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState(STATUS.ACTIVE);
  const [error, setError] = useState(null);

  // Prefill from the record every time the dialog opens on a new row. Without
  // the `record` dependency, opening a second row would show the first one's
  // values - which is the sort of thing that renames the wrong master.
  useEffect(() => {
    if (!isOpen || !record) return;
    setName(record.name ?? "");
    // A missing status means Active, matching the column default. Anything
    // that is not 1 is Inactive, which is how every list in the app reads it.
    setStatus(Number(record.status) === STATUS.INACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE);
    setError(null);
  }, [isOpen, record]);

  const submit = async () => {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      setError(`${noun} name cannot be empty`);
      return;
    }
    setError(null);
    // The id is the record's own, never re-derived from the name: editing
    // renames a row, it never creates a second one.
    const ok = await onSave({ id: record.id, name: trimmed, status: Number(status) });
    if (ok) onClose();
  };

  const wasActive = Number(record && record.status) !== STATUS.INACTIVE;
  const retiring = wasActive && Number(status) === STATUS.INACTIVE;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">Edit {noun}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm">{noun} Name</FormLabel>
              <Input
                size="sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${noun} name`}
                autoFocus
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Status</FormLabel>
              <Select
                size="sm"
                value={String(status)}
                onChange={(e) => setStatus(Number(e.target.value))}
              >
                <option value={String(STATUS.ACTIVE)}>Active</option>
                <option value={String(STATUS.INACTIVE)}>Inactive</option>
              </Select>
            </FormControl>

            {retiring && (
              // Said plainly, because "Inactive" reads like deletion and is
              // not. Nobody assigned to this master loses it.
              <Text fontSize="xs" color="gray.600">
                Employees already assigned to this {noun.toLowerCase()} keep it.
                Making it inactive only stops it being offered for new use.
              </Text>
            )}

            {error && (
              <Text fontSize="xs" color="red.600">
                {error}
              </Text>
            )}
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button size="sm" variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="purple" isLoading={saving} onClick={submit}>
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default MasterEditModal;
