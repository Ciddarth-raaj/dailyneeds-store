import React, { useMemo, useState } from "react";
import { Box } from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomInput from "../customInput/customInput";
import { updatePickPackVerification } from "../../helper/pickPackVerifications";

function isRowVerified(row) {
  const v = row?.is_verified;
  return v === true || v === 1 || v === "1";
}

/**
 * Inline remark searchable dropdown for pick-pack verifications grid.
 */
export default function VerificationRemarkCell({
  data,
  remarkOptions = [],
  onRemarkUpdated,
  isEditable = true,
}) {
  const [saving, setSaving] = useState(false);
  const verificationId = data?.pick_pack_verification_id;

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
    if (verificationId == null) return;

    if (newId == null || newId === "") {
      setSaving(true);
      try {
        await updatePickPackVerification(verificationId, {
          remark_id: null,
          remark_str: null,
        });
        toast.success("Remark cleared");
        onRemarkUpdated?.(verificationId, {
          remark_id: null,
          remark_str: null,
          remark_value: "",
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

    setSaving(true);
    try {
      await updatePickPackVerification(verificationId, {
        remark_id: remarkId,
        remark_str: null,
      });
      toast.success("Remark saved");
      onRemarkUpdated?.(verificationId, {
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

  if (!effectiveEditable) {
    return (
      <Box py={2} fontSize="sm">
        {readOnlyLabel}
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
