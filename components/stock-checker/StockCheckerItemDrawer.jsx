import React, { useMemo, useEffect, useRef } from "react";
import { Button, VStack } from "@chakra-ui/react";
import { Formik, Form, useFormikContext } from "formik";
import * as Yup from "yup";
import Drawer from "../Drawer";
import CustomInput from "../customInput/customInput";
import { useUser } from "../../contexts/UserContext";
import useOutlets from "../../customHooks/useOutlets";
import { createOrUpdateStockCheckerItem } from "../../helper/stockChecker";
import toast from "react-hot-toast";

const validationSchema = Yup.object({
  branch_id: Yup.mixed().required("Branch is required"),
  physical_stock: Yup.number()
    .required("Physical stock is required")
    .min(0, "Must be ≥ 0"),
  system_stock: Yup.number()
    .required("System stock is required")
    .min(0, "Must be ≥ 0"),
});

/**
 * Drawer to add or edit a stock checker item (branch + physical/system stock).
 * If preselectedBranchId is provided (e.g. from Assigned Products row), branch is preselected and disabled.
 * Else if user has storeId, branch is preselected and disabled.
 * If the selected branch already has an item, physical/system stock are prefilled.
 */
function StockCheckerItemDrawer({
  isOpen,
  onClose,
  row,
  refetch,
  preselectedBranchId,
}) {
  const { storeId } = useUser().userConfig;
  const { outlets } = useOutlets();
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
      physical_stock: existing?.physical_stock ?? "",
      system_stock: existing?.system_stock ?? "",
    };
  };

  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (values) => {
    if (!row?.stock_checker_id) return;
    setSaving(true);
    try {
      await createOrUpdateStockCheckerItem({
        stock_checker_id: row.stock_checker_id,
        branch_id: Number(values.branch_id),
        physical_stock: Number(values.physical_stock),
        system_stock: Number(values.system_stock),
      });
      toast.success("Stock checker item saved");
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
      title="Add / Edit stock by branch"
      size="md"
      footer={
        <Button
          colorScheme="purple"
          size="sm"
          type="submit"
          form="stock-checker-item-form"
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
          <StockCheckerItemForm
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

function StockCheckerItemForm({
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
      setFieldValue(
        "physical_stock",
        existing.physical_stock != null ? existing.physical_stock : ""
      );
      setFieldValue(
        "system_stock",
        existing.system_stock != null ? existing.system_stock : ""
      );
    }
  }, [values.branch_id, setFieldValue, itemsByBranchId, prevBranchRef]);

  return (
    <Form id="stock-checker-item-form">
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
          label="Physical stock"
          name="physical_stock"
          type="number"
          placeholder="0"
        />
        <CustomInput
          label="System stock"
          name="system_stock"
          type="number"
          placeholder="0"
        />
      </VStack>
    </Form>
  );
}

export default StockCheckerItemDrawer;
