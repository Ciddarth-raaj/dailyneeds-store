import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import {
  Button,
  Flex,
  Grid,
  Text,
  Box,
  Select,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import moment from "moment";
import { usePurchaseReturnById } from "../../../customHooks/usePurchaseReturnById";
import { usePurchaseReturns } from "../../../customHooks/usePurchaseReturns";

const validationSchema = Yup.object({
  no_of_boxes: Yup.number()
    .min(0, "Must be ≥ 0")
    .nullable()
    .transform((v) => (v === "" || isNaN(v) ? null : v)),
});

function PurchaseReturnForm() {
  const router = useRouter();
  const { mode, mprh_pr_no: mprhPrNoQuery } = router.query;
  const mprh_pr_no =
    typeof mprhPrNoQuery === "string" ? mprhPrNoQuery : mprhPrNoQuery?.[0];

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const { purchaseReturns, loading: loadingList } = usePurchaseReturns();
  const prsWithoutExtra = useMemo(
    () =>
      (purchaseReturns || []).filter(
        (pr) => pr.status == null && pr.no_of_boxes == null
      ),
    [purchaseReturns]
  );

  const {
    purchaseReturn,
    loading: loadingPr,
    createExtra,
    updateExtra,
  } = usePurchaseReturnById(mprh_pr_no, {
    enabled: !!mprh_pr_no && (viewMode || editMode || createMode),
  });

  const itemsGridRows = useMemo(() => {
    const pr = purchaseReturn;
    const items = pr?.items || [];
    return items.map((it, idx) => ({
      id: `${pr?.mprh_pr_no}-${idx}-${it.MPR_ITEM_CODE}`,
      MPR_ITEM_CODE: it.MPR_ITEM_CODE,
      imageUrl: it.product?.image_url ?? null,
      product_name:
        it.product?.de_display_name ?? it.product?.gf_item_name ?? "-",
      MPR_ITEM_QTY: it.MPR_ITEM_QTY,
      MPR_ITEM_AMOUNT: it.MPR_ITEM_AMOUNT,
      MPR_MRC_NO: it.MPR_MRC_NO,
    }));
  }, [purchaseReturn]);

  const itemsColDefs = useMemo(
    () => [
      { field: "MPR_ITEM_CODE", headerName: "Item Code", type: "id" },
      {
        field: "imageUrl",
        headerName: "Image",
        type: "image",
      },
      { field: "product_name", headerName: "Product" },
      { field: "MPR_ITEM_QTY", headerName: "Qty" },
      {
        field: "MPR_ITEM_AMOUNT",
        headerName: "Amount",
        type: "currency",
      },
      { field: "MPR_MRC_NO", headerName: "MRC No", hideByDefault: true },
    ],
    []
  );

  const [initialValues, setInitialValues] = useState({
    mprh_pr_no: "",
    mprh_pr_refno: "",
    mprh_pr_dt: "",
    mprh_basic_amount: "",
    mprh_net_amount: "",
    mprh_dist_code: "",
    distributor_name: "",
    no_of_boxes: 0,
  });

  useEffect(() => {
    if (createMode && !mprh_pr_no) return;
    if (createMode) {
      setInitialValues((prev) => ({
        ...prev,
        mprh_pr_no: purchaseReturn?.mprh_pr_no ?? "",
        mprh_pr_refno: purchaseReturn?.mprh_pr_refno ?? "",
        mprh_pr_dt: purchaseReturn?.mprh_pr_dt
          ? moment(purchaseReturn.mprh_pr_dt).format("DD-MM-YYYY")
          : "",
        mprh_basic_amount:
          purchaseReturn?.mprh_basic_amount != null
            ? String(purchaseReturn.mprh_basic_amount)
            : "",
        mprh_net_amount:
          purchaseReturn?.mprh_net_amount != null
            ? String(purchaseReturn.mprh_net_amount)
            : "",
        mprh_dist_code: purchaseReturn?.mprh_dist_code ?? "",
        distributor_name: purchaseReturn?.distributor_name ?? "",
        no_of_boxes: 0,
      }));
      return;
    }
    if (purchaseReturn) {
      setInitialValues({
        mprh_pr_no: purchaseReturn.mprh_pr_no ?? "",
        mprh_pr_refno: purchaseReturn.mprh_pr_refno ?? "",
        mprh_pr_dt: purchaseReturn.mprh_pr_dt
          ? moment(purchaseReturn.mprh_pr_dt).format("DD-MM-YYYY")
          : "",
        mprh_basic_amount:
          purchaseReturn.mprh_basic_amount != null
            ? String(purchaseReturn.mprh_basic_amount)
            : "",
        mprh_net_amount:
          purchaseReturn.mprh_net_amount != null
            ? String(purchaseReturn.mprh_net_amount)
            : "",
        mprh_dist_code: purchaseReturn.mprh_dist_code ?? "",
        distributor_name: purchaseReturn.distributor_name ?? "",
        no_of_boxes: purchaseReturn.no_of_boxes ?? 0,
      });
    }
  }, [createMode, mprh_pr_no, purchaseReturn]);

  const handleSubmit = async (values) => {
    const payload = {
      no_of_boxes: Number(values.no_of_boxes) || 0,
      status: "open",
    };

    if (createMode && mprh_pr_no) {
      toast.promise(createExtra(payload), {
        loading: "Creating purchase return extra...",
        success: () => {
          router.push("/purchase/purchase-return");
          return "Purchase return extra created";
        },
        error: (err) => err.message || "Failed to create",
      });
      return;
    }

    if (editMode && mprh_pr_no) {
      toast.promise(
        updateExtra({ no_of_boxes: Number(values.no_of_boxes) || 0 }),
        {
          loading: "Updating purchase return extra...",
          success: () => {
            router.push("/purchase/purchase-return");
            return "Purchase return extra updated";
          },
          error: (err) => err.message || "Failed to update",
        }
      );
    }
  };

  const handleSelectPrForCreate = (e) => {
    const prNo = e.target.value;
    if (prNo) {
      router.replace(
        `/purchase/purchase-return/create?mprh_pr_no=${encodeURIComponent(
          prNo
        )}`,
        undefined,
        { shallow: false }
      );
    }
  };

  const loading = !!mprh_pr_no && loadingPr;
  const notFound =
    !!mprh_pr_no &&
    !loadingPr &&
    !purchaseReturn &&
    (viewMode || editMode || createMode);

  if (createMode && !mprh_pr_no) {
    return (
      <GlobalWrapper
        title="Add Purchase Return Extra"
        permissionKey="add_purchase_return"
      >
        <CustomContainer title="Add extra (select PR)" filledHeader>
          {loadingList ? (
            <Text>Loading...</Text>
          ) : prsWithoutExtra.length === 0 ? (
            <Text color="gray.600">
              No purchase returns without extra. All PRs already have extra
              details.
            </Text>
          ) : (
            <FormControl>
              <FormLabel>Purchase return (without extra)</FormLabel>
              <Select
                placeholder="Select PR..."
                onChange={handleSelectPrForCreate}
                maxW="md"
              >
                {prsWithoutExtra.map((pr) => (
                  <option key={pr.mprh_pr_no} value={pr.mprh_pr_no}>
                    {pr.mprh_pr_no}{" "}
                    {pr.mprh_pr_refno ? `(${pr.mprh_pr_refno})` : ""}
                  </option>
                ))}
              </Select>
            </FormControl>
          )}
          <Button
            mt={4}
            variant="outline"
            colorScheme="purple"
            onClick={() => router.push("/purchase/purchase-return")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (loading && !purchaseReturn) {
    return (
      <GlobalWrapper title="Purchase Return">
        <CustomContainer title="Loading..." filledHeader>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (notFound) {
    return (
      <GlobalWrapper title="Purchase Return">
        <CustomContainer title="Not found" filledHeader>
          <Text>Purchase return not found.</Text>
          <Button
            mt={4}
            colorScheme="purple"
            onClick={() => router.push("/purchase/purchase-return")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode
    ? "View Purchase Return"
    : editMode
    ? "Edit Purchase Return Extra"
    : "Add Purchase Return Extra";

  const getPermissionKey = () => {
    if (viewMode) return "view_purchase_return";
    return "add_purchase_return";
  };

  const isExtraEditable = (editMode || createMode) && !!mprh_pr_no;
  const pr = purchaseReturn;

  return (
    <GlobalWrapper title={title} permissionKey={getPermissionKey()}>
      <CustomContainer title={title} filledHeader>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit: formikSubmit }) => (
            <form onSubmit={formikSubmit}>
              <Box mb={6}>
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                  gap={4}
                  fontSize="sm"
                >
                  <CustomInput
                    label="Return No"
                    name="mprh_pr_no"
                    type="text"
                    editable={false}
                  />
                  <CustomInput
                    label="PR No"
                    name="mprh_pr_refno"
                    type="text"
                    editable={false}
                  />
                  <CustomInput
                    label="PR Date"
                    name="mprh_pr_dt"
                    type="text"
                    editable={false}
                  />
                  <CustomInput
                    label="Basic Amount"
                    name="mprh_basic_amount"
                    type="text"
                    editable={false}
                  />
                  <CustomInput
                    label="Net Amount"
                    name="mprh_net_amount"
                    type="text"
                    editable={false}
                  />
                  <CustomInput
                    label="Distributor Code"
                    name="mprh_dist_code"
                    type="text"
                    editable={false}
                  />
                  <CustomInput
                    label="Distributor Name"
                    name="distributor_name"
                    type="text"
                    editable={false}
                  />
                </Grid>
              </Box>

              <Box mb={6}>
                <CustomContainer
                  title="Products"
                  size="xs"
                  filledHeader
                  smallHeader
                >
                  <AgGrid
                    rowData={itemsGridRows}
                    columnDefs={itemsColDefs}
                    tableKey={`purchase-return-items-${pr?.mprh_pr_no}`}
                  />
                </CustomContainer>
              </Box>

              <CustomContainer
                title="Extra details"
                size="xs"
                filledHeader
                smallHeader
              >
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                  gap={4}
                  mb={4}
                >
                  <CustomInput
                    label="No. of boxes"
                    name="no_of_boxes"
                    type="number"
                    min={0}
                    editable={isExtraEditable}
                    ignoreMarginBottom
                  />
                  {pr?.remark != null && String(pr.remark).trim() !== "" && (
                    <Box gridColumn={{ base: "1", md: "1 / -1" }}>
                      <FormControl>
                        <FormLabel fontSize="sm" fontWeight="600">
                          Remark
                        </FormLabel>
                        <Text fontSize="sm" color="gray.700">
                          {pr.remark}
                        </Text>
                      </FormControl>
                    </Box>
                  )}
                </Grid>
              </CustomContainer>

              <Flex gap={3} justify="flex-end" mt={6}>
                <Button
                  type="button"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => router.push("/purchase/purchase-return")}
                >
                  {viewMode ? "Back" : "Cancel"}
                </Button>
                {!viewMode && isExtraEditable && (
                  <Button type="submit" colorScheme="purple">
                    {createMode ? "Create" : "Update"}
                  </Button>
                )}
              </Flex>
            </form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseReturnForm;
