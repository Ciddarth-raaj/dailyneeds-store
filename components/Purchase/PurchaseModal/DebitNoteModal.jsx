import {
  Badge,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { Formik } from "formik";
import React, { useEffect, useState } from "react";
import CustomInput from "../../customInput/customInput";

import styles from "./styles.module.css";
import moment from "moment";
import toast from "react-hot-toast";
import currencyFormatter from "../../../util/currencyFormatter";
import { calculateTotalAmount, shouldShowIGST } from "../../../util/debit-note";

const JV_LEDGER_LIST = [
  { id: 1, value: "Ready to Pay" },
  { id: 2, value: "Due Payment Pending" },
  { id: 3, value: "Payment Hold" },
];

const INITIAL_VALUES = {
  invoice_amount: 0.0,
  mmh_mrc_refno: "",
  supplier_name: "",
  supplier_gstn: "",
  mmh_mrc_dt: "",
  mmh_dist_bill_dt: "",
  mmh_mrc_amt: 0.0,
  gst: [
    { VALUE: null, PERC: 0, TAXABLE: null },
    { VALUE: null, PERC: 5, TAXABLE: null },
    { VALUE: null, PERC: 12, TAXABLE: null },
    { VALUE: null, PERC: 18, TAXABLE: null },
    { VALUE: null, PERC: 28, TAXABLE: null },
  ],
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

function DebitNoteModal({
  isOpen,
  onClose,
  item,
  updatePurchase,
  unapprovePurchase,
}) {
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [editable, setEditable] = useState(true);

  useEffect(() => {
    if (item) {
      if (item?.is_approved) {
        setEditable(false);
      } else {
        setEditable(true);
      }

      const taxList = shouldShowIGST(item) ? item.igst : item.sgst;

      // Get existing PERC values
      const existingPercs = taxList.map((taxItem) =>
        shouldShowIGST(item)
          ? parseFloat(taxItem.PERC) / 2
          : parseFloat(taxItem.PERC)
      );

      // Required PERC values
      const requiredPercs = [0, 2.5, 6, 9, 14];

      // Add missing PERC values with 0 VALUE
      const missingGstItems = requiredPercs
        .filter((perc) => !existingPercs.includes(perc))
        .map((perc) => ({
          VALUE: null,
          PERC: perc * 2,
          TAXABLE: null,
        }));

      // Combine existing and missing items and sort by PERC
      item.gst = [
        ...taxList.map((taxItem) => ({
          // VALUE: taxItem.VALUE ? parseFloat(taxItem.VALUE).toFixed(2) : null,
          VALUE: taxItem.VALUE,
          PERC: parseFloat(taxItem.PERC * (shouldShowIGST(item) ? 1 : 2)),
          // TAXABLE: parseFloat(taxItem.TAXABLE).toFixed(2),
          TAXABLE: taxItem.TAXABLE,
        })),
        ...missingGstItems,
      ].sort((a, b) => a.PERC - b.PERC);

      setInitialValues(structuredClone({ ...INITIAL_VALUES, ...item }));
    }
  }, [item]);

  const onSubmitHandler = (values) => {
    const isTotalAmountMismatch =
      Math.floor(calculateTotalAmount(values).total_amount) !=
      Math.floor(item.mmh_mrc_amt);

    const { total_amount, total_sgst, total_cgst, total_igst } =
      calculateTotalAmount(values);

    const internalValues = {
      scheme_difference: values.scheme_difference,
      narration: values.narration,
      total_amount,
      tcs_value: values.tcs_value,
      mmh_mrc_refno: values.mmh_mrc_refno,
    };

    const convertedGst = values.gst
      .filter((taxItem) => taxItem.TAXABLE)
      .map((taxItem) => {
        const PERC = shouldShowIGST(item) ? taxItem.PERC : taxItem.PERC / 2;
        return {
          PERC: PERC,
          VALUE: taxItem.TAXABLE
            ? parseFloat((taxItem.TAXABLE * PERC) / 100).toFixed(2)
            : null,
          TAXABLE: taxItem.TAXABLE,
        };
      });

    const externalValues = {
      store_id: values.store_id,
      mprh_pr_no: values.mprh_pr_no,
      mprh_pr_refno: values.mprh_pr_refno,
      mprh_pr_dt: values.mprh_pr_dt,
      mprh_dist_code: values.mprh_dist_code,
      supplier_id: values.supplier_id,
      supplier_name: values.supplier_name,
      supplier_gstn: values.supplier_gstn,
      tot_sgst_amt: values.tot_sgst_amt,
      tot_cgst_amt: values.tot_cgst_amt,
      tot_igst_amt: values.tot_igst_amt,
      tot_gst_cess_amt: values.tot_gst_cess_amt,
      tot_item_qty: values.tot_item_qty,
      tot_item_value: values.tot_item_value,
      ts: values.ts,
      sgst: item.sgst,
      cgst: item.cgst,
      igst: item.ignst,
      cess: item.cess,
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
      updatePurchase(values.debit_note_id, {
        purchase: externalValues,
        purchase_internal: internalValues,
        // send_not_matched_notification: isTotalAmountMismatch,
        send_not_matched_notification: false,
      }),
      {
        loading: "Updating Purchase Record!",
        success: (response) => {
          if (response.code === 200) {
            onClose();
            return "Purchase Record Updated!";
          } else {
            throw err;
          }
        },
        error: (err) => {
          console.log(err);
          return "Error updating Purchase Record!";
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
                <div className={styles.purchaseForm}>
                  <div className={styles.topContainer}>
                    <CustomInput
                      label="MPRH Ref No"
                      name={`mprh_pr_refno`}
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
                      editable={false}
                    />
                    <CustomInput
                      label="MPRH Date"
                      name={`mprh_pr_dt`}
                      editable={false}
                      value={moment(item.mprh_pr_dt).format("DD-MM-YYYY")}
                    />
                    <CustomInput
                      label="MPRH Amount"
                      name={`tot_item_value`}
                      type="number"
                      editable={false}
                    />
                  </div>

                  <CustomInput
                    label="MRC Ref No"
                    name="mmh_mrc_refno"
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

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="CESS 12% Input"
                      name="tot_gst_cess_amt"
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
                      label="TCS @0.1%"
                      name="tcs_value"
                      type="number"
                      disabled={!editable}
                    />
                  </div>

                  <div className={styles.inputContainer}>
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
                      Math.floor(item.tot_item_value)
                        ? "visible"
                        : "hidden",
                  }}
                >
                  MPRH Amount and Total Amount does not match
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
                  {editable ? (
                    <Button colorScheme="purple" onClick={handleSubmit}>
                      Save & Approve
                    </Button>
                  ) : (
                    <Button
                      colorScheme="purple"
                      onClick={() => unapproveHandler(item.debit_note_id)}
                    >
                      Unlock
                    </Button>
                  )}
                </Flex>
              </ModalFooter>
            </>
          )}
        </Formik>
      </ModalContent>
    </Modal>
  );
}

export default DebitNoteModal;
