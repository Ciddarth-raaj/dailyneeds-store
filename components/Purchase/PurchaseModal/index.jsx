import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Button,
  Checkbox,
  Divider,
  Flex,
  Stack,
  Text,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { Formik, useFormikContext } from "formik";
import React, { useEffect, useRef, useState } from "react";
import CustomInput from "../../customInput/customInput";

import styles from "./styles.module.css";
import moment from "moment";
import toast from "react-hot-toast";
import currencyFormatter from "../../../util/currencyFormatter";
import {
  buildPurchaseGstRows,
  calculateTotalAmount,
  IGST_DISPLAY_PERCS,
  LOCAL_GST_HALF_PERCS,
  LOCAL_PURCHASE_28_PERC,
  LOCAL_PURCHASE_40_PERC,
  shouldShowIGST,
} from "../../../util/purchase";
import { purchaseDiscrepancies } from "../../../util/purchaseDiscrepancy";

const JV_LEDGER_LIST = [
  { id: 1, value: "Ready to Pay" },
  { id: 2, value: "Due Payment Pending" },
  { id: 3, value: "Payment Hold" },
];

const DEFAULT_GST_PERCS = IGST_DISPLAY_PERCS;

const INITIAL_VALUES = {
  invoice_amount: 0.0,
  mmh_mrc_refno: "",
  supplier_name: "",
  supplier_gstn: "",
  mmh_mrc_dt: "",
  mmh_dist_bill_dt: "",
  mmh_mrc_amt: 0.0,
  gst: DEFAULT_GST_PERCS.map((PERC) => ({
    VALUE: null,
    PERC,
    TAXABLE: null,
  })),
  cgst: [
    { VALUE: null, PERC: 0, TAXABLE: null },
    { VALUE: null, PERC: 2.5, TAXABLE: null },
    { VALUE: null, PERC: 6, TAXABLE: null },
    { VALUE: null, PERC: 9, TAXABLE: null },
    { VALUE: null, PERC: 14, TAXABLE: null },
  ],
  sgst: [
    { VALUE: null, PERC: 0, TAXABLE: null },
    { VALUE: null, PERC: 2.5, TAXABLE: null },
    { VALUE: null, PERC: 6, TAXABLE: null },
    { VALUE: null, PERC: 9, TAXABLE: null },
    { VALUE: null, PERC: 14, TAXABLE: null },
  ],
  tot_gst_cess_amt: 0.0,
  cash_discount: 0.0,
  scheme_difference: 0.0,
  mmh_manual_disc: 0.0,
  cost_difference: 0.0,
  due: 0.0,
  freight_charges: 0.0,
  mmd_goods_tcs_amt: 0.0,
  round_off: 0.0,
  jv_ledger: 0.0,
  narration: "",
  supplier_credit_note: 0.0,
};

/**
 * The modal's GST rows for a purchase: one row per slab, taken from IGST for
 * an other-state supplier and from CGST/SGST otherwise (shouldShowIGST).
 */
function buildModalGstRows(item) {
  let gst = buildPurchaseGstRows(item);

  const isIgst = shouldShowIGST(item);
  const requiredPercs = isIgst ? IGST_DISPLAY_PERCS : LOCAL_GST_HALF_PERCS;

  const existingPercs = gst.map((taxItem) =>
    isIgst ? taxItem.PERC : taxItem.PERC / 2
  );

  const missingGstItems = requiredPercs
    .filter((perc) => !existingPercs.includes(perc))
    .map((perc) => ({
      VALUE: null,
      PERC: isIgst ? perc : perc * 2,
      TAXABLE: null,
    }));

  gst = [...gst, ...missingGstItems].sort((a, b) => a.PERC - b.PERC);

  if (!isIgst) {
    [LOCAL_PURCHASE_40_PERC, LOCAL_PURCHASE_28_PERC].forEach((perc) => {
      if (!gst.some((g) => Number(g.PERC) === perc)) {
        gst.push({
          VALUE: null,
          PERC: perc,
          TAXABLE: null,
        });
      }
    });
    gst.sort((a, b) => a.PERC - b.PERC);
  }

  return gst;
}

/** A DATE value as the YYYY-MM-DD a date input takes, in local time. */
const toDateInput = (value) =>
  value ? moment(value).format("YYYY-MM-DD") : "";

/**
 * When Accounts change the GSTIN between local and other-state, the rows
 * switch to the tax the stored bill has of that kind (IGST or CGST/SGST),
 * the same rows the screen shows when the bill is opened with that GSTIN.
 */
function GstTypeWatcher({ item }) {
  const { values, setFieldValue } = useFormikContext();
  const isIgst = shouldShowIGST(values);
  const previous = useRef(isIgst);
  useEffect(() => {
    if (previous.current === isIgst) return;
    previous.current = isIgst;
    setFieldValue(
      "gst",
      buildModalGstRows({ ...item, supplier_gstn: values.supplier_gstn })
    );
  }, [isIgst]);
  return null;
}

function PurchaseModal({
  isOpen,
  onClose,
  item,
  updatePurchase,
  unapprovePurchase,
  readOnly = false,
}) {
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [editable, setEditable] = useState(true);
  // Accounts confirm that tax of the kind this supplier's GSTIN does not
  // show (e.g. IGST from a supplier with no GSTIN) is re-entered below as
  // the kind it does show. Without it, saving would drop that tax silently.
  const [taxOverride, setTaxOverride] = useState(false);

  useEffect(() => {
    if (item) {
      if (readOnly || item?.is_approved) {
        setEditable(false);
      } else {
        setEditable(true);
      }

      item.gst = buildModalGstRows(item);

      setTaxOverride(false);
      setInitialValues(
        structuredClone({
          ...INITIAL_VALUES,
          ...item,
          mmh_mrc_dt: toDateInput(item.mmh_mrc_dt),
          mmh_dist_bill_dt: toDateInput(item.mmh_dist_bill_dt),
        })
      );
    }
  }, [item]);

  const liveDiscrepancies = (values) =>
    purchaseDiscrepancies({
      supplier_gstn: values.supplier_gstn,
      sgst: item?.sgst,
      cgst: item?.cgst,
      igst: item?.igst,
      mmh_mrc_dt: values.mmh_mrc_dt,
      mmh_dist_bill_dt: values.mmh_dist_bill_dt,
      mmh_mrc_refno: values.mmh_mrc_refno,
      voucher_fy: item?.voucher_fy,
      entered_at: item?.entered_at,
    });

  // Save is held while a blocking discrepancy is open: the tax one until
  // the GSTIN is corrected or Accounts confirm the re-entered tax, the MRC
  // date one until the date is in its ref no's financial year.
  const isTaxBlocked = (values) =>
    liveDiscrepancies(values).some(
      (d) =>
        d.severity === "block" &&
        !(d.code === "TAX_TYPE_MISMATCH" && taxOverride)
    );

  // Bill amount minus what the screen adds up before the round-off: the
  // full difference, whatever its size or sign.
  const calculatedDifference = (values) => {
    const before = calculateTotalAmount({ ...values, round_off: 0 }).total_amount;
    const diff = parseFloat(values.mmh_mrc_amt) - parseFloat(before);
    return isNaN(diff) ? null : parseFloat(diff.toFixed(2));
  };

  const onSubmitHandler = (values) => {
    if (isTaxBlocked(values)) {
      toast.error("Correct the flagged GSTIN, tax or MRC date first");
      return;
    }

    const isTotalAmountMismatch =
      Math.floor(calculateTotalAmount(values).total_amount) !=
      Math.floor(item.mmh_mrc_amt);

    const { total_amount, total_sgst, total_cgst, total_igst } =
      calculateTotalAmount(values);

    const internalValues = {
      cash_discount: values.cash_discount,
      scheme_difference: values.scheme_difference,
      cost_difference: values.cost_difference,
      due: values.due,
      freight_charges: values.freight_charges,
      round_off: values.round_off,
      jv_ledger: values.jv_ledger,
      narration: values.narration,
      supplier_credit_note: values.supplier_credit_note,
      total_amount,
      invoice_amount: values.invoice_amount,
    };

    const convertedGst = values.gst
      .filter((taxItem) => taxItem.TAXABLE)
      .map((taxItem) => {
        const PERC = shouldShowIGST(values) ? taxItem.PERC : taxItem.PERC / 2;
        return {
          PERC: PERC,
          VALUE: taxItem.TAXABLE
            ? parseFloat((taxItem.TAXABLE * PERC) / 100).toFixed(2)
            : null,
          TAXABLE: taxItem.TAXABLE,
        };
      });

    const externalValues = {
      mmh_mrc_refno: values.mmh_mrc_refno,
      supplier_name: values.supplier_name,
      supplier_gstn: values.supplier_gstn,
      mmh_mrc_dt: values.mmh_mrc_dt,
      mmh_dist_bill_dt: values.mmh_dist_bill_dt,
      mmh_mrc_amt: values.mmh_mrc_amt,
      cgst: item.cgst,
      sgst: item.sgst,
      igst: item.igst,
      tot_gst_cess_amt: 0,
      mmh_manual_disc: values.mmh_manual_disc,
      mmd_goods_tcs_amt: values.mmd_goods_tcs_amt,
      retail_outlet_id: values.retail_outlet_id,
      supplier_id: values.supplier_id,
      mmh_mrc_no: values.mmh_mrc_no,
      mmh_dist_bill_no: values.mmh_dist_bill_no,
      tot_sgst_amt: item.tot_sgst_amt,
      tot_cgst_amt: item.tot_cgst_amt,
      tot_igst_amt: item.tot_igst_amt,
      ts: values.ts,
      cess: [],
    };

    if (shouldShowIGST(values)) {
      externalValues.igst = convertedGst;
      externalValues.tot_igst_amt = total_igst;

      externalValues.cgst = [];
      externalValues.sgst = [];
      externalValues.tot_sgst_amt = 0;
      externalValues.tot_cgst_amt = 0;
    } else {
      externalValues.cgst = convertedGst;
      externalValues.sgst = convertedGst;
      externalValues.tot_sgst_amt = total_sgst;
      externalValues.tot_cgst_amt = total_cgst;

      externalValues.igst = [];
      externalValues.tot_igst_amt = 0;
    }

    toast.promise(
      updatePurchase(values.purchase_id, {
        purchase: externalValues,
        purchase_internal: internalValues,
        send_not_matched_notification: isTotalAmountMismatch,
      }),
      {
        loading: "Updating Purchase Record!",
        success: (response) => {
          if (response?.code === 200) {
            onClose();
            return "Purchase Record Updated!";
          }
          throw new Error(response?.msg || "Error updating Purchase Record!");
        },
        error: (err) => {
          console.log(err);
          return err?.message || "Error updating Purchase Record!";
        },
      }
    );
  };

  const unapproveHandler = async (purchase_id) => {
    await unapprovePurchase(purchase_id);
    setEditable(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Purchase</ModalHeader>
        <ModalCloseButton />
        <Formik
          enableReinitialize
          initialValues={initialValues}
          // validationSchema={ACCOUNT_VALIDATION_SCHEMA}
          onSubmit={onSubmitHandler}
        >
          {({ values, handleSubmit }) => (
            <>
              <ModalBody>
                <GstTypeWatcher item={item} />
                <DiscrepancyPanel
                  live={liveDiscrepancies(values)}
                  stored={item.discrepancies}
                  editable={editable}
                  taxOverride={taxOverride}
                  setTaxOverride={setTaxOverride}
                  isIgst={shouldShowIGST(values)}
                />
                <div className={styles.purchaseForm}>
                  <div className={styles.topContainer}>
                    <CustomInput
                      label="MRC Ref No"
                      name={`mmh_mrc_refno`}
                      type="text"
                      editable={false}
                    />
                    <CustomInput
                      label="Supplier Name"
                      name={`supplier_name`}
                      type="text"
                      editable={false}
                    />
                    <CustomInput
                      label="Supplier GSTN"
                      name={`supplier_gstn`}
                      type="text"
                      editable={editable}
                    />
                    <CustomInput
                      label="MRC Date"
                      name={`mmh_mrc_dt`}
                      type="date"
                      editable={editable}
                      value={
                        editable
                          ? values.mmh_mrc_dt
                          : moment(item.mmh_mrc_dt).format("DD-MM-YYYY")
                      }
                    />
                    <CustomInput
                      label="Distributor Bill Date"
                      name={`mmh_dist_bill_dt`}
                      type="date"
                      editable={editable}
                      value={
                        editable
                          ? values.mmh_dist_bill_dt
                          : moment(item.mmh_dist_bill_dt).format("DD-MM-YYYY")
                      }
                    />
                    <CustomInput
                      label="MRC Amount"
                      name={`mmh_mrc_amt`}
                      type="number"
                      editable={false}
                    />
                  </div>

                  <CustomInput
                    label="Invoice Amount"
                    name={`invoice_amount`}
                    type="number"
                    disabled={!editable}
                  />

                  {values.gst.map((item, index) => (
                    <div key={index} className={styles.inputContainer}>
                      <CustomInput
                        label={`${
                          shouldShowIGST(values) ? "IGST" : "Local"
                        } Purchase ${item.PERC}%`}
                        name={`gst.${index}.TAXABLE`}
                        type="number"
                        disabled={!editable}
                      />

                      {shouldShowIGST(values) ? (
                        <CustomInput
                          label={`IGST ${item.PERC}% Input`}
                          name={`igst.${index}.VALUE`}
                          disabled={true}
                          value={
                            values.gst[index].TAXABLE
                              ? parseFloat(
                                  (values.gst[index].TAXABLE * item.PERC) / 100
                                ).toFixed(2)
                              : ""
                          }
                        />
                      ) : (
                        <>
                          <CustomInput
                            label={`CGST ${item.PERC / 2}% Input`}
                            name={`cgst.${index}.VALUE`}
                            disabled={true}
                            value={
                              values.gst[index].TAXABLE
                                ? parseFloat(
                                    (values.gst[index].TAXABLE *
                                      (item.PERC / 2)) /
                                      100
                                  ).toFixed(2)
                                : ""
                            }
                          />
                          <CustomInput
                            label={`SGST ${item.PERC / 2}% Input`}
                            name={`sgst.${index}.VALUE`}
                            disabled={true}
                            value={
                              values.gst[index].TAXABLE
                                ? parseFloat(
                                    (values.gst[index].TAXABLE *
                                      (item.PERC / 2)) /
                                      100
                                  ).toFixed(2)
                                : ""
                            }
                          />
                        </>
                      )}
                    </div>
                  ))}

                  <Divider my={4} borderColor="gray.200" />

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="Cash Discount"
                      name="cash_discount"
                      type="number"
                      disabled={!editable}
                    />
                    <CustomInput
                      label="Scheme Difference"
                      name="scheme_difference"
                      type="number"
                      disabled={!editable}
                    />
                    <CustomInput
                      label="Discount on Purchase"
                      name="mmh_manual_disc"
                      type="number"
                      disabled={!editable}
                    />
                  </div>

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="Cost Difference"
                      name="cost_difference"
                      type="number"
                      disabled={!editable}
                    />
                    <CustomInput
                      label="Due"
                      name="due"
                      type="number"
                      disabled={!editable}
                    />
                    <CustomInput
                      label="Freight Charges"
                      name="freight_charges"
                      type="number"
                      disabled={!editable}
                    />
                  </div>

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="TCS @0.1%"
                      name="mmd_goods_tcs_amt"
                      type="number"
                      disabled={!editable}
                    />
                    <CustomInput
                      label="Round Off"
                      name="round_off"
                      type="number"
                      disabled={!editable}
                    />
                    <CustomInput
                      label="Supplier Credit Note"
                      name="supplier_credit_note"
                      type="number"
                      disabled={!editable}
                    />
                  </div>

                  <RoundOffDifference
                    difference={calculatedDifference(values)}
                    roundOff={values.round_off}
                    editable={editable}
                  />

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="JV Ledger"
                      name="jv_ledger"
                      values={JV_LEDGER_LIST}
                      method="switch"
                      disabled={!editable}
                    />

                    <CustomInput
                      label="Narration"
                      name="narration"
                      disabled={!editable}
                    />
                  </div>
                </div>
              </ModalBody>

              <ModalFooter justifyContent="space-between">
                <Badge
                  colorScheme="red"
                  style={{
                    visibility:
                      Math.floor(calculateTotalAmount(values).total_amount) !=
                      Math.floor(item.mmh_mrc_amt)
                        ? "visible"
                        : "hidden",
                  }}
                >
                  MRC Amount and Total Amount does not match
                </Badge>

                <Flex alignItems="center">
                  <Badge>
                    Total Amount :{" "}
                    {currencyFormatter(
                      calculateTotalAmount(values).total_amount,
                      2
                    )}
                  </Badge>
                  <Button
                    variant="ghost"
                    colorScheme="red"
                    mr={3}
                    onClick={onClose}
                  >
                    Close
                  </Button>
                  {!readOnly &&
                    (editable ? (
                      <Button
                        colorScheme="purple"
                        onClick={handleSubmit}
                        isDisabled={isTaxBlocked(values)}
                        title={
                          isTaxBlocked(values)
                            ? "Correct the flagged GSTIN, tax or MRC date first"
                            : undefined
                        }
                      >
                        Save & Approve
                      </Button>
                    ) : (
                      <Button
                        colorScheme="purple"
                        onClick={() => unapproveHandler(item.purchase_id)}
                      >
                        Unlock
                      </Button>
                    ))}
                </Flex>
              </ModalFooter>
            </>
          )}
        </Formik>
      </ModalContent>
    </Modal>
  );
}

const TAX_KIND_LABEL = { true: "IGST", false: "CGST/SGST" };

/**
 * What Accounts must look at on this bill: the live check of the GSTIN and
 * dates being edited (util/purchaseDiscrepancy.js), and what the server
 * flagged (e.g. a RetailPilot change not applied over a correction).
 */
function DiscrepancyPanel({ live, stored, editable, taxOverride, setTaxOverride, isIgst }) {
  const liveCodes = new Set(live.map((d) => d.code));
  const serverOnly = (stored || []).filter((d) => !liveCodes.has(d.code) && d.code === "RETAILPILOT_CHANGE_NOT_APPLIED");
  const list = [...live, ...serverOnly];
  if (!list.length) return null;
  const taxMismatch = live.find((d) => d.code === "TAX_TYPE_MISMATCH");

  return (
    <Stack spacing={2} mb={4}>
      {list.map((d) => (
        <Alert
          key={d.code}
          status={d.severity === "block" ? "error" : "warning"}
          borderRadius="6px"
          fontSize="sm"
        >
          <AlertIcon />
          <AlertDescription>{d.message}</AlertDescription>
        </Alert>
      ))}
      {taxMismatch && editable && (
        <Checkbox
          isChecked={taxOverride}
          onChange={(e) => setTaxOverride(e.target.checked)}
          colorScheme="red"
          fontSize="sm"
        >
          The supplier's GSTIN is right: I have entered the tax below as{" "}
          {TAX_KIND_LABEL[isIgst]}, and the other tax will be removed on save
        </Checkbox>
      )}
    </Stack>
  );
}

/** The bill's difference, shown next to the round-off Accounts enter. */
function RoundOffDifference({ difference, roundOff, editable }) {
  const { setFieldValue } = useFormikContext();
  if (difference == null) return null;
  const same = parseFloat(roundOff || 0).toFixed(2) === difference.toFixed(2);
  return (
    <Flex align="center" gap={3} mb={4} fontSize="sm">
      <Text>
        Bill amount minus calculated total:{" "}
        <b>{currencyFormatter(difference, 2)}</b>
        {same ? " (the round-off above)" : ""}
      </Text>
      {editable && !same && (
        <Button size="xs" variant="outline" onClick={() => setFieldValue("round_off", difference)}>
          Use as round-off
        </Button>
      )}
    </Flex>
  );
}

export default PurchaseModal;
