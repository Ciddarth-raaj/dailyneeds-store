import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { Button, Flex, Grid, Text, Box, Switch } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import CustomModal from "../../../components/CustomModal";
import { Formik, useFormikContext } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import moment from "moment";
import { usePurchaseAcknowledgementById } from "../../../customHooks/usePurchaseAcknowledgements";
import { useDistributors } from "../../../customHooks/useDistributors";
import { usePurchaseReturnsByDistributor } from "../../../customHooks/usePurchaseReturnsByDistributor";
import { updatePurchaseReturnExtra } from "../../../helper/purchaseReturn";
import usePermissions from "../../../customHooks/usePermissions";
import EmptyData from "../../../components/EmptyData";
import { capitalize } from "../../../util/string";

const validationSchema = Yup.object({
  distributor_id: Yup.string().trim().required("Distributor is required"),
  invoice_date: Yup.string().trim().required("Invoice date is required"),
  amount: Yup.number()
    .min(0, "Amount must be ≥ 0")
    .nullable()
    .transform((v) => (v === "" || isNaN(v) ? null : v)),
});

function SyncDistributorId({ setSelectedDistributorId }) {
  const { values } = useFormikContext();
  useEffect(() => {
    setSelectedDistributorId(values.distributor_id ?? "");
  }, [values.distributor_id, setSelectedDistributorId]);
  return null;
}

function PurchaseAckForm() {
  const router = useRouter();
  const { mode, id: idQuery } = router.query;
  const id = idQuery != null ? String(idQuery).trim() : null;
  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const canAdd = usePermissions("add_purchase_acknowledgement");
  const { distributors, loading: loadingDist } = useDistributors();
  const { purchaseAcknowledgement, loading: loadingAck } =
    usePurchaseAcknowledgementById(id, {
      enabled: !!id && (viewMode || editMode),
    });

  const [selectedDistributorId, setSelectedDistributorId] = useState("");
  const distributorIdForPr =
    editMode || viewMode
      ? purchaseAcknowledgement?.distributor_id ?? selectedDistributorId
      : selectedDistributorId;

  const {
    purchaseReturns,
    loading: loadingPr,
    refetch: refetchPr,
  } = usePurchaseReturnsByDistributor(distributorIdForPr, {
    enabled: !!distributorIdForPr,
  });

  const [productsModalRow, setProductsModalRow] = useState(null);

  const productListRows = useMemo(() => {
    const items = productsModalRow?.items || [];
    return items.map((it, idx) => ({
      id: `${productsModalRow?.mprh_pr_no}-${idx}-${it.MPR_ITEM_CODE}`,
      MPR_ITEM_CODE: it.MPR_ITEM_CODE,
      product_name:
        it.product?.de_display_name ?? it.product?.gf_item_name ?? "—",
      MPR_ITEM_QTY: it.MPR_ITEM_QTY,
      MPR_ITEM_AMOUNT: it.MPR_ITEM_AMOUNT,
    }));
  }, [productsModalRow]);

  useEffect(() => {
    if (purchaseAcknowledgement?.distributor_id) {
      setSelectedDistributorId(purchaseAcknowledgement.distributor_id);
    }
  }, [purchaseAcknowledgement?.distributor_id]);

  const [initialValues, setInitialValues] = useState({
    distributor_id: "",
    invoice_date: moment().format("YYYY-MM-DD"),
    amount: "",
  });

  useEffect(() => {
    if (createMode) {
      setInitialValues({
        distributor_id: "",
        invoice_date: moment().format("YYYY-MM-DD"),
        amount: "",
      });
      return;
    }
    if (purchaseAcknowledgement) {
      setInitialValues({
        distributor_id: purchaseAcknowledgement.distributor_id ?? "",
        invoice_date: purchaseAcknowledgement.invoice_date
          ? moment(purchaseAcknowledgement.invoice_date).format("YYYY-MM-DD")
          : "",
        amount:
          purchaseAcknowledgement.amount != null
            ? String(purchaseAcknowledgement.amount)
            : "",
      });
      setSelectedDistributorId(purchaseAcknowledgement.distributor_id ?? "");
    }
  }, [createMode, purchaseAcknowledgement]);

  const handleStatusChange = useCallback(
    (row, newStatus) => () => {
      const prNo = row?.mprh_pr_no;
      if (!prNo) return;
      toast.promise(
        updatePurchaseReturnExtra(prNo, { status: newStatus }).then(() => {
          refetchPr();
        }),
        {
          loading: "Updating status...",
          success: `Status set to ${newStatus === "done" ? "Done" : "Open"}`,
          error: (err) => err.message || "Failed to update status",
        }
      );
    },
    [refetchPr]
  );

  const prTableRows = useMemo(() => {
    return (purchaseReturns || []).map((pr) => {
      const items = pr?.items || [];
      const totalQty = items.reduce(
        (s, it) => s + (Number(it.MPR_ITEM_QTY) || 0),
        0
      );
      return {
        mprh_pr_no: pr.mprh_pr_no,
        mprh_pr_refno: pr.mprh_pr_refno ?? "—",
        total_qty: totalQty,
        total_amount: pr.mprh_net_amount != null ? pr.mprh_net_amount : "—",
        no_of_boxes: pr.no_of_boxes ?? "—",
        status: pr.status,
        items: pr.items,
      };
    });
  }, [purchaseReturns]);

  const prColDefs = useMemo(
    () => [
      { field: "mprh_pr_refno", headerName: "PR No", type: "id" },
      { field: "total_qty", headerName: "Total Qty", type: "number" },
      { field: "total_amount", headerName: "Total Amount", type: "currency" },
      { field: "no_of_boxes", headerName: "No. of Boxes", type: "number" },
      ...(canAdd
        ? [
            {
              field: "status",
              headerName: "Status",
              hideExport: true,
              cellRenderer: (params) => {
                const row = params.data;
                const status = row?.status;
                const isDone = status === "done";

                if (!status) {
                  return "-";
                }

                return (
                  <Switch
                    size="sm"
                    colorScheme="purple"
                    isChecked={isDone}
                    onChange={() => {
                      handleStatusChange(row, isDone ? "open" : "done")();
                    }}
                  />
                );
              },
            },
          ]
        : [
            {
              field: "status",
              headerName: "Status",
              type: "badge-column",
              valueGetter: (params) => {
                const row = params.data;
                const status = row?.status;
                if (!status) {
                  return { label: "N/A", colorScheme: "gray" };
                }

                return {
                  label: capitalize(status),
                  colorScheme: status === "done" ? "green" : "blue",
                };
              },
            },
          ]),
      {
        field: "mprh_pr_no",
        type: "action-icons",
        headerName: "Actions",
        valueGetter: (params) => {
          const row = params.data;
          const prRow = purchaseReturns?.find(
            (p) => p.mprh_pr_no === row?.mprh_pr_no
          );
          const id = row?.mprh_pr_no;

          return [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/purchase/purchase-return/view?mprh_pr_no=${encodeURIComponent(
                id
              )}`,
            },
            {
              label: "View products",
              icon: "fa-solid fa-list",
              colorScheme: "blue",
              onClick: () => setProductsModalRow(prRow || row),
            },
          ];
        },
      },
    ],
    [canAdd, handleStatusChange, purchaseReturns]
  );

  const handleSubmit = async (values) => {
    const payload = {
      distributor_id: values.distributor_id.trim(),
      invoice_date: values.invoice_date.trim(),
      amount: Number(values.amount) || 0,
    };

    if (createMode) {
      try {
        const { createPurchaseAcknowledgement } = await import(
          "../../../helper/purchaseAcknowledgement"
        );
        const res = await createPurchaseAcknowledgement(payload);
        const newId = res?.purchase_acknowledgement_id;
        toast.success("Created");
        if (newId != null) {
          router.push(`/purchase/purchase-acknowledgement/view?id=${newId}`);
        } else {
          router.push("/purchase/purchase-acknowledgement");
        }
      } catch (err) {
        toast.error(err.message || "Failed to create");
      }
      return;
    }

    if (editMode && id) {
      try {
        const { updatePurchaseAcknowledgement } = await import(
          "../../../helper/purchaseAcknowledgement"
        );
        await updatePurchaseAcknowledgement(id, payload);
        toast.success("Updated");
        router.push("/purchase/purchase-acknowledgement");
      } catch (err) {
        toast.error(err.message || "Failed to update");
      }
    }
  };

  const loading =
    (editMode || viewMode) && loadingAck && !purchaseAcknowledgement;
  const notFound =
    (editMode || viewMode) && !loadingAck && !purchaseAcknowledgement && id;

  if (loading) {
    return (
      <GlobalWrapper title="Purchase Acknowledgement">
        <CustomContainer title="Loading..." filledHeader>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (notFound) {
    return (
      <GlobalWrapper title="Purchase Acknowledgement">
        <CustomContainer title="Not found" filledHeader>
          <Text>Purchase acknowledgement not found.</Text>
          <Button
            mt={4}
            colorScheme="purple"
            onClick={() => router.push("/purchase/purchase-acknowledgement")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode
    ? "View Purchase Acknowledgement"
    : editMode
    ? "Edit Purchase Acknowledgement"
    : "Create Purchase Acknowledgement";

  const isReadOnly = viewMode;

  return (
    <GlobalWrapper
      title={title}
      permissionKey={
        viewMode
          ? "view_purchase_acknowledgement"
          : "add_purchase_acknowledgement"
      }
    >
      <CustomModal
        isOpen={productsModalRow != null}
        onClose={() => setProductsModalRow(null)}
        title={`Products — ${productsModalRow?.mprh_pr_refno ?? "PR"}`}
        size="lg"
        footer={false}
      >
        <AgGrid
          rowData={productListRows}
          columnDefs={[
            { field: "MPR_ITEM_CODE", headerName: "Item Code" },
            { field: "product_name", headerName: "Product", flex: 2 },
            { field: "MPR_ITEM_QTY", headerName: "Qty", type: "number" },
            {
              field: "MPR_ITEM_AMOUNT",
              headerName: "Amount",
              type: "currency",
            },
          ]}
          tableKey="purchase-ack-products-modal"
        />
      </CustomModal>

      <CustomContainer title={title} filledHeader>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ setFieldValue, values, handleSubmit: formikSubmit }) => (
            <form onSubmit={formikSubmit}>
              <SyncDistributorId
                setSelectedDistributorId={setSelectedDistributorId}
              />
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                mb={6}
                fontSize="sm"
              >
                <CustomInput
                  label="Distributor"
                  name="distributor_id"
                  method="searchable-dropdown"
                  values={(distributors || []).map((d) => ({
                    id: d.MDM_DIST_CODE,
                    value: d.MDM_DIST_NAME ?? d.MDM_DIST_CODE,
                  }))}
                  placeholder="Select distributor..."
                  editable={!isReadOnly && createMode}
                />
                <CustomInput
                  label="Invoice Date"
                  name="invoice_date"
                  type="date"
                  editable={!isReadOnly}
                />
                <CustomInput
                  label="Amount"
                  name="amount"
                  type="number"
                  min={0}
                  editable={!isReadOnly}
                />
              </Grid>

              {!viewMode && (values.distributor_id || distributorIdForPr) && (
                <Box mb={6}>
                  <CustomContainer
                    title="Purchase Returns"
                    size="xs"
                    filledHeader
                    smallHeader
                  >
                    {loadingPr ? (
                      <Text py={2}>Loading...</Text>
                    ) : prTableRows.length === 0 ? (
                      <EmptyData message="No open purchase returns for this distributor." />
                    ) : (
                      <AgGrid
                        rowData={prTableRows}
                        columnDefs={prColDefs}
                        tableKey={`purchase-ack-pr-${distributorIdForPr}`}
                        gridOptions={{
                          getRowId: (params) =>
                            String(params.data?.mprh_pr_no ?? ""),
                        }}
                      />
                    )}
                  </CustomContainer>
                </Box>
              )}

              <Flex gap={3} justify="flex-end" mt={6}>
                <Button
                  type="button"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() =>
                    router.push("/purchase/purchase-acknowledgement")
                  }
                >
                  {viewMode ? "Back" : "Cancel"}
                </Button>
                {!viewMode && (
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

export default PurchaseAckForm;
