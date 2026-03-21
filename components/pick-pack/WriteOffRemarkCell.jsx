import React, { useMemo, useState } from "react";
import { Box, Text, Tooltip } from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomInput from "../customInput/customInput";
import { updatePickPackWriteOff } from "../../helper/pickPackWriteOff";
import { SHORTAGE_ID } from "../../constants";

function isRowVerified(row) {
  const v = row?.is_verified;
  return v === true || v === 1 || v === "1";
}

/**
 * Inline remark searchable dropdown for pick-pack write-off grid.
 * Saves on selection via PUT; parent refetches month list after success. Shortage opens employee modal.
 */
export default function WriteOffRemarkCell({
  data,
  remarkOptions = [],
  onRemarkUpdated,
  onShortageEmployeeRequired,
  isEditable = true,
  employeeMap = {},
}) {
  const [saving, setSaving] = useState(false);
  const writeOffId = data?.pick_pack_write_off_id;

  const dropdownValues = useMemo(
    () =>
      remarkOptions.map((r) => ({
        id: String(r.remark_id),
        value: r.label || `Remark ${r.remark_id}`,
      })),
    [remarkOptions]
  );

  const value =
    data?.remark_id != null && data?.remark_id !== ""
      ? String(data.remark_id)
      : "";

  const verified = isRowVerified(data);
  /** Verified rows are read-only even if AG Grid reuses a stale isEditable prop */
  const effectiveEditable = isEditable && !verified;

  const readOnlyLabel = useMemo(() => {
    if (data?.remark_value != null && String(data.remark_value).trim() !== "") {
      return String(data.remark_value);
    }
    const rid = data?.remark_id;
    if (rid == null || rid === "") return "";
    const opt = remarkOptions.find((r) => String(r.remark_id) === String(rid));
    return opt?.label ?? "";
  }, [data?.remark_value, data?.remark_id, remarkOptions]);

  const handleChange = async (newId) => {
    if (writeOffId == null) return;

    /** SearchableDropdown clear button passes null */
    if (newId == null || newId === "") {
      setSaving(true);
      try {
        await updatePickPackWriteOff(writeOffId, {
          remark_id: null,
          remark_str: null,
          reason_employee_id: null,
        });
        toast.success("Remark cleared");
        onRemarkUpdated?.(writeOffId, {
          remark_id: null,
          remark_str: null,
          remark_value: "",
          reason_employee_id: null,
          reason_employee_name: null,
        });
      } catch (err) {
        toast.error(err?.message || "Failed to clear remark");
      } finally {
        setSaving(false);
      }
      return;
    }

    const remarkId = parseInt(String(newId), 10);
    if (Number.isNaN(remarkId)) return;

    const selected = remarkOptions.find(
      (r) => String(r.remark_id) === String(remarkId)
    );
    const remark_value = selected?.label ?? "";

    if (Number(remarkId) === Number(SHORTAGE_ID)) {
      onShortageEmployeeRequired?.({
        writeOffId,
        remarkId,
        remark_value,
      });
      return;
    }

    setSaving(true);
    try {
      await updatePickPackWriteOff(writeOffId, {
        remark_id: remarkId,
        remark_str: null,
        reason_employee_id: null,
      });
      toast.success("Remark saved");
      onRemarkUpdated?.(writeOffId, {
        remark_id: remarkId,
        remark_str: null,
        remark_value,
        reason_employee_id: null,
      });
    } catch (err) {
      toast.error(err?.message || "Failed to save remark");
    } finally {
      setSaving(false);
    }
  };

  const isShortage = Number(value) === Number(SHORTAGE_ID);
  const employeeText = employeeMap[data?.reason_employee_id]
    ? `${employeeMap[data?.reason_employee_id]?.employee_name} (${
        employeeMap[data?.reason_employee_id]?.employee_id
      })`
    : "Not Found";
  if (!effectiveEditable) {
    return (
      <Box py={2} fontSize="sm">
        {readOnlyLabel}
        {isShortage && (
          <Text as="span" color="gray.500" fontSize="xs">
            {` - ${employeeText}`}
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box
      py={1}
      w="100%"
      onMouseDown={(e) => e.stopPropagation()}
      sx={{
        "& .personalInputs": {
          margin: "0 !important",
          padding: "0 !important",
        },
      }}
    >
      <Tooltip label={isShortage ? employeeText : ""}>
        <Box>
          <CustomInput
            method="searchable-dropdown"
            values={dropdownValues}
            value={value}
            onChange={handleChange}
            placeholder=""
            editable={true}
            ignoreMarginBottom
            isDisabled={saving}
            containerStyle={{ marginBottom: 0 }}
          />
        </Box>
      </Tooltip>
    </Box>
  );
}
