import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import CustomInput from "../customInput/customInput";
import toast from "react-hot-toast";
import { updatePickPackWriteOff } from "../../helper/pickPackWriteOff";

const employeeCustomRenderer = (option) => (
  <Flex align="flex-start" direction="column" gap={0} py={1} minW={0}>
    <Text fontSize="sm" fontWeight={600} noOfLines={1}>
      {option.employee_name ?? option.value}
    </Text>
    <Text fontSize="xs" color="gray.500" noOfLines={1}>
      {[option.designation_name, option.store_name].filter(Boolean).join(" · ") ||
        `ID: ${option.employee_id}`}
    </Text>
  </Flex>
);

const employeeRenderSelected = (option) =>
  option
    ? `${option.employee_name ?? option.value} (ID: ${option.employee_id})`
    : "";

/**
 * After user picks "Shortage" remark, select employee for reason_employee_id.
 */
export default function WriteOffShortageEmployeeModal({
  isOpen,
  onClose,
  writeOffId,
  remarkId,
  remarkLabel,
  employeeOptions = [],
  employeesLoading,
  onSuccess,
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setEmployeeId("");
  }, [isOpen, writeOffId]);

  const handleSave = useCallback(async () => {
    if (writeOffId == null || remarkId == null) return;
    const eid = employeeId ? parseInt(String(employeeId), 10) : NaN;
    if (Number.isNaN(eid)) {
      toast.error("Select an employee");
      return;
    }
    setSaving(true);
    try {
      await updatePickPackWriteOff(writeOffId, {
        remark_id: remarkId,
        reason_employee_id: eid,
        remark_str: null,
      });
      toast.success("Saved");
      onSuccess?.(writeOffId, {
        remark_id: remarkId,
        reason_employee_id: eid,
        remark_str: null,
        remark_value: remarkLabel ?? "",
      });
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [
    writeOffId,
    remarkId,
    remarkLabel,
    employeeId,
    onSuccess,
    onClose,
  ]);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select employee (shortage)"
      size="md"
      footer={
        <Flex gap={2} justify="flex-end" w="100%">
          <Button variant="ghost" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={handleSave}
            isLoading={saving}
            loadingText="Saving..."
          >
            Save
          </Button>
        </Flex>
      }
    >
      <Text fontSize="sm" color="gray.600" mb={4}>
        Choose the employee linked to this shortage write-off.
      </Text>
      {employeesLoading ? (
        <Text fontSize="sm">Loading employees…</Text>
      ) : (
        <CustomInput
          label="Employee"
          method="searchable-dropdown"
          values={employeeOptions}
          value={employeeId}
          onChange={(id) => setEmployeeId(id != null ? String(id) : "")}
          placeholder="Search employee…"
          editable={true}
          customRenderer={employeeCustomRenderer}
          renderSelected={employeeRenderSelected}
        />
      )}
    </CustomModal>
  );
}
