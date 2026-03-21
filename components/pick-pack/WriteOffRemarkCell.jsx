import React, { useMemo, useState } from "react";
import { Box } from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomInput from "../customInput/customInput";
import { updatePickPackWriteOff } from "../../helper/pickPackWriteOff";

/**
 * Inline remark searchable dropdown for pick-pack write-off grid.
 * Saves on selection via PUT only (no list refetch).
 */
export default function WriteOffRemarkCell({
  data,
  remarkOptions = [],
  onRemarkUpdated,
  isEditable = true,
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

  const handleChange = async (newId) => {
    if (writeOffId == null || newId == null || newId === "") return;
    const remarkId = parseInt(String(newId), 10);
    if (Number.isNaN(remarkId)) return;

    const selected = remarkOptions.find(
      (r) => String(r.remark_id) === String(remarkId)
    );
    const remark_value = selected?.label ?? "";

    setSaving(true);
    try {
      await updatePickPackWriteOff(writeOffId, {
        remark_id: remarkId,
        remark_str: null,
      });
      toast.success("Remark saved");
      onRemarkUpdated?.(writeOffId, {
        remark_id: remarkId,
        remark_str: null,
        remark_value,
      });
    } catch (err) {
      toast.error(err?.message || "Failed to save remark");
    } finally {
      setSaving(false);
    }
  };

  if (!isEditable) {
    return (
      <Box py={2} fontSize="sm">
        {data?.remark_value ? String(data.remark_value) : ""}
      </Box>
    );
  }

  return (
    <Box
      py={1}
      w="100%"
      onMouseDown={(e) => e.stopPropagation()}
      sx={{
        "& .personalInputs": { marginBottom: "0 !important" },
      }}
    >
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
  );
}
