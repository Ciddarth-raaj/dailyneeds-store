import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { Button, Flex, Grid, Text, Box, IconButton } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import CustomModal from "../../../components/CustomModal";
import PurchaseReturnStatusSwitch from "../../../components/purchase-return/PurchaseReturnStatusSwitch";
import PurchaseReturnsMobileCards from "../../../components/purchase-return/PurchaseReturnsMobileCards";
import { Formik, Form, useFormikContext, FieldArray } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import moment from "moment";
import { usePurchaseAcknowledgementById } from "../../../customHooks/usePurchaseAcknowledgements";
import { useDistributors } from "../../../customHooks/useDistributors";
import { usePurchaseReturnsByDistributor } from "../../../customHooks/usePurchaseReturnsByDistributor";
import usePermissions from "../../../customHooks/usePermissions";
import EmptyData from "../../../components/EmptyData";
import { capitalize } from "../../../util/string";

const invoiceItemSchema = Yup.object({
  invoice_no: Yup.string().trim().max(100).required("Required"),
  invoice_date: Yup.string().trim().required("Required"),
  amount: Yup.number()
    .min(0, "Must be ≥ 0")
    .required("Required")
    .transform((v) => (v === "" || isNaN(v) ? null : v)),
});

const validationSchema = Yup.object({
  distributor_id: Yup.string().trim().required("Required"),
  invoices: Yup.array().of(invoiceItemSchema).min(1, "Required"),
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
  } = usePurchaseReturnsByDistributor(distributorIdForPr, id, {
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

  const defaultInvoiceRow = () => ({
    invoice_no: "",
    invoice_date: moment().format("YYYY-MM-DD"),
    amount: "",
  });

  const [initialValues, setInitialValues] = useState({
    distributor_id: "",
    invoices: [defaultInvoiceRow()],
  });

  useEffect(() => {
    if (createMode) {
      setInitialValues({
        distributor_id: "",
        invoices: [defaultInvoiceRow()],
      });
      return;
    }
    if (purchaseAcknowledgement) {
      const invoices = purchaseAcknowledgement.invoices;
      const invoiceRows =
        Array.isArray(invoices) && invoices.length > 0
          ? invoices.map((inv) => ({
              invoice_no: inv.invoice_no ?? "",
              invoice_date: inv.invoice_date
                ? moment(inv.invoice_date).format("YYYY-MM-DD")
                : moment().format("YYYY-MM-DD"),
              amount: inv.amount != null ? String(inv.amount) : "",
            }))
          : [defaultInvoiceRow()];
      setInitialValues({
        distributor_id: purchaseAcknowledgement.distributor_id ?? "",
        invoices: invoiceRows,
      });
      setSelectedDistributorId(purchaseAcknowledgement.distributor_id ?? "");
    }
  }, [createMode, purchaseAcknowledgement]);

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

  const invoiceGridColumns = useMemo(
    () => [
      { field: "invoice_no", headerName: "Invoice No" },
      {
        field: "invoice_date",
        headerName: "Invoice Date",
        type: "date",
      },
      {
        field: "amount",
        headerName: "Amount",
        type: "currency",
      },
    ],
    []
  );

  const invoiceGridRows = useMemo(() => {
    const list = purchaseAcknowledgement?.invoices;
    if (!Array.isArray(list)) return [];
    return list.map((inv, idx) => ({
      id: inv.purchase_acknowledgement_invoice_id ?? `inv-${idx}`,
      invoice_no: inv?.invoice_no,
      invoice_date: inv?.invoice_date,
      amount: inv?.amount != null ? Number(inv.amount) : null,
    }));
  }, [purchaseAcknowledgement?.invoices]);

  const prColDefs = useMemo(
    () => [
      { field: "mprh_pr_refno", headerName: "PR No", type: "id" },
      { field: "total_qty", headerName: "Total Qty", type: "number" },
      { field: "total_amount", headerName: "Total Amount", type: "currency" },
      { field: "no_of_boxes", headerName: "No. of Boxes", type: "number" },
      ...(canAdd && !createMode
        ? [
            {
              field: "status",
              headerName: "Status",
              hideExport: true,
              cellRenderer: (params) => {
                const row = params.data;
                if (!row?.status) return "-";
                return (
                  <PurchaseReturnStatusSwitch
                    row={row}
                    onSuccess={refetchPr}
                    purchaseAcknowledgementId={
                      id != null ? Number(id) || null : null
                    }
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
    [canAdd, id, purchaseReturns, refetchPr]
  );

  const handleSubmit = async (values) => {
    const payload = {
      distributor_id: String(values.distributor_id).trim(),
      invoices: (values.invoices || []).map((inv) => ({
        invoice_no: String(inv.invoice_no).trim() || undefined,
        invoice_date:
          String(inv.invoice_date).trim() || moment().format("YYYY-MM-DD"),
        amount: Number(inv.amount) || 0,
      })),
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
            <Form>
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
                  ignoreMarginBottom
                />
              </Grid>

              <Box mb={6}>
                <CustomContainer
                  title="Invoices"
                  size="xs"
                  filledHeader
                  smallHeader
                  rightSection={
                    !isReadOnly && (
                      <Button
                        type="button"
                        size="sm"
                        colorScheme="purple"
                        variant="outline"
                        onClick={() =>
                          setFieldValue("invoices", [
                            ...values.invoices,
                            defaultInvoiceRow(),
                          ])
                        }
                        leftIcon={<i className="fa fa-plus" />}
                      >
                        Add invoice
                      </Button>
                    )
                  }
                >
                  {viewMode ? (
                    invoiceGridRows.length === 0 ? (
                      <EmptyData message="No invoices." />
                    ) : (
                      <AgGrid
                        rowData={invoiceGridRows}
                        columnDefs={invoiceGridColumns}
                        tableKey="purchase-ack-invoices-view"
                        gridOptions={{
                          getRowId: (params) =>
                            String(params.data?.id ?? params.rowIndex),
                        }}
                      />
                    )
                  ) : (
                    <FieldArray name="invoices">
                      {({ push, remove }) => (
                        <>
                          {(values.invoices || []).map((inv, index) => (
                            <Grid
                              key={index}
                              templateColumns={{
                                base: "1fr auto",
                                md: "1fr 1fr 1fr auto",
                              }}
                              gap={3}
                              alignItems="flex-end"
                              mb={3}
                              fontSize="sm"
                            >
                              <CustomInput
                                label={index === 0 ? "Invoice No" : ""}
                                name={`invoices.${index}.invoice_no`}
                                placeholder="Invoice number"
                                editable={!isReadOnly}
                                ignoreMarginBottom
                              />
                              <CustomInput
                                label={index === 0 ? "Invoice Date" : ""}
                                name={`invoices.${index}.invoice_date`}
                                method="datepicker"
                                editable={!isReadOnly}
                                ignoreMarginBottom
                              />
                              <CustomInput
                                label={index === 0 ? "Amount" : ""}
                                name={`invoices.${index}.amount`}
                                type="number"
                                min={0}
                                editable={!isReadOnly}
                                ignoreMarginBottom
                              />
                              {!isReadOnly && (
                                <IconButton
                                  icon={<i className="fa fa-trash" />}
                                  colorScheme="red"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  isDisabled={
                                    (values.invoices || []).length <= 1
                                  }
                                />
                              )}
                            </Grid>
                          ))}
                        </>
                      )}
                    </FieldArray>
                  )}
                </CustomContainer>

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
              </Box>

              {(values.distributor_id || distributorIdForPr) && (
                <Box mb={6}>
                  <CustomContainer
                    title="Purchase Returns"
                    size="xs"
                    filledHeader
                    smallHeader
                    toggleChildren
                    rightSection={
                      createMode ? (
                        <Text fontSize="xs" color="purple.500">
                          Save before updating status
                        </Text>
                      ) : null
                    }
                  >
                    {loadingPr ? (
                      <Text py={2}>Loading...</Text>
                    ) : prTableRows.length === 0 ? (
                      <EmptyData message="No open purchase returns for this distributor." />
                    ) : (
                      <>
                        <Box display={{ base: "none", md: "block" }}>
                          <AgGrid
                            rowData={prTableRows}
                            columnDefs={prColDefs}
                            tableKey={`purchase-ack-pr-${distributorIdForPr}`}
                            gridOptions={{
                              getRowId: (params) =>
                                String(params.data?.mprh_pr_no ?? ""),
                            }}
                          />
                        </Box>
                        <Box display={{ base: "block", md: "none" }}>
                          <PurchaseReturnsMobileCards
                            rows={prTableRows}
                            purchaseReturns={purchaseReturns}
                            canAdd={canAdd}
                            onViewProducts={setProductsModalRow}
                            onStatusSuccess={refetchPr}
                            purchaseAcknowledgementId={
                              id != null ? Number(id) || null : null
                            }
                          />
                        </Box>
                      </>
                    )}
                  </CustomContainer>
                </Box>
              )}
            </Form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseAckForm;
