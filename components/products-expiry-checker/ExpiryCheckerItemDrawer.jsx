import React, { useMemo, useEffect, useRef } from "react";
import { Button, VStack } from "@chakra-ui/react";
import { Formik, Form, useFormikContext } from "formik";
import * as Yup from "yup";
import Drawer from "../Drawer";
import CustomInput from "../customInput/customInput";
import { useUser } from "../../contexts/UserContext";
import useOutlets from "../../customHooks/useOutlets";
import { createOrUpdateExpiryCheckerItem } from "../../helper/productsExpiryChecker";
import toast from "react-hot-toast";

const validationSchema = Yup.object({
  branch_id: Yup.mixed().required("Branch is required"),
  qty: Yup.number()
    .required("Qty is required")
    .min(0, "Must be ≥ 0"),
});

/**
 * Drawer to add or edit an expiry checker item (branch + qty).
 * If preselectedBranchId is provided, branch is preselected and disabled.
 * Else if user has storeId, branch is preselected and disabled.
 */
function ExpiryCheckerItemDrawer({
  isOpen,
  onClose,
  row,
  refetch,
  preselectedBranchId,
}) {
  const { storeId } = useUser().userConfig;
  const { outlets } = useOutlets({ skipIds: [1] });
  const prevBranchRef = useRef(null);

  const branchesList = useMemo(() => {
    const list = Array.isArray(outlets) ? outlets : outlets?.data;
    return Array.isArray(list) ? list : [];
  }, [outlets]);

  const branchOptions = useMemo(
    () =>
      branchesList.map((o) => ({
        id: o.outlet_id ?? o.id,
        value: o.outlet_name ?? o.name ?? `Branch ${o.outlet_id ?? o.id}`,
      })),
    [branchesList]
  );

  const itemsByBranchId = useMemo(() => {
    const map = {};
    (row?.items || []).forEach((it) => {
      const key = it.branch_id ?? it.branch?.outlet_id;
      if (key != null) map[key] = it;
    });
    return map;
  }, [row?.items]);

  const initialBranchId = useMemo(() => {
    if (preselectedBranchId != null && preselectedBranchId !== "") {
      const id = Number(preselectedBranchId);
      if (!Number.isNaN(id)) return id;
    }
    if (storeId != null && storeId !== "") {
      const id = Number(storeId);
      if (!Number.isNaN(id)) return id;
    }
    return "";
  }, [storeId, preselectedBranchId]);

  const isBranchDisabled =
    (preselectedBranchId != null && preselectedBranchId !== "") ||
    (storeId != null && storeId !== "");

  useEffect(() => {
    if (!isOpen) prevBranchRef.current = null;
  }, [isOpen]);

  const getInitialValues = () => {
    const branchId = initialBranchId || "";
    const existing = branchId ? itemsByBranchId[branchId] : null;
    return {
      branch_id: branchId,
      qty: existing?.qty != null ? existing.qty : "",
    };
  };

  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (values) => {
    if (!row?.products_expiry_checker_id) return;
    setSaving(true);
    try {
      await createOrUpdateExpiryCheckerItem({
        products_expiry_checker_id: row.products_expiry_checker_id,
        branch_id: Number(values.branch_id),
        qty: Number(values.qty),
      });
      toast.success("Expiry checker item saved");
      refetch?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add / Edit qty by branch"
      size="md"
      footer={
        <Button
          colorScheme="purple"
          size="sm"
          type="submit"
          form="expiry-checker-item-form"
          isLoading={saving}
          loadingText="Saving..."
        >
          Save
        </Button>
      }
    >
      {row && (
        <Formik
          enableReinitialize
          initialValues={getInitialValues()}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          <ExpiryCheckerItemForm
            branchOptions={branchOptions}
            isBranchDisabled={isBranchDisabled}
            itemsByBranchId={itemsByBranchId}
            prevBranchRef={prevBranchRef}
          />
        </Formik>
      )}
    </Drawer>
  );
}

function ExpiryCheckerItemForm({
  branchOptions,
  isBranchDisabled,
  itemsByBranchId,
  prevBranchRef,
}) {
  const { setFieldValue, values } = useFormikContext();

  useEffect(() => {
    const branchId = values.branch_id;
    if (!branchId || branchId === prevBranchRef.current) return;
    prevBranchRef.current = branchId;
    const existing = itemsByBranchId[branchId];
    if (existing != null) {
      setFieldValue("qty", existing.qty != null ? existing.qty : "");
    }
  }, [values.branch_id, setFieldValue, itemsByBranchId, prevBranchRef]);

  return (
    <Form id="expiry-checker-item-form">
      <VStack align="stretch" spacing={4}>
        <CustomInput
          label="Branch"
          name="branch_id"
          method="searchable-dropdown"
          values={branchOptions}
          placeholder="Select branch"
          editable={!isBranchDisabled}
        />
        <CustomInput
          label="Qty"
          name="qty"
          type="number"
          placeholder="0"
        />
      </VStack>
    </Form>
  );
}

export default ExpiryCheckerItemDrawer;
