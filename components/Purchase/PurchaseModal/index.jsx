import {
  Badge,
  Button,
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

const JV_LEDGER_LIST = [
  { id: 1, value: "Ready to Pay" },
  { id: 2, value: "Due Payment Pending" },
  { id: 3, value: "Payment Hold" },
];

const INITIAL_VALUES = {
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

function PurchaseModal({ isOpen, onClose, item, updatePurchase }) {
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  useEffect(() => {
    if (item) {
      // Get existing PERC values
      const existingPercs = item.sgst.map((item) => parseFloat(item.PERC));

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
        ...item.sgst.map((item) => ({
          VALUE: parseFloat(item.VALUE),
          PERC: parseFloat(item.PERC * 2),
          TAXABLE: parseFloat(item.TAXABLE),
        })),
        ...missingGstItems,
      ].sort((a, b) => a.PERC - b.PERC);

      setInitialValues(structuredClone({ ...INITIAL_VALUES, ...item }));
    }
  }, [item]);

  const calculateTotalAmount = (values) => {
    let {
      cash_discount,
      scheme_difference,
      cost_difference,
      due,
      freight_charges,
      supplier_credit_note,
      round_off,
      mmd_goods_tcs_amt,
      gst,
    } = values;

    let total_gst = 0;
    let total_cgst = 0;
    let total_sgst = 0;

    gst.forEach((item) => {
      total_gst += item.TAXABLE;

      const taxedValue = (item.TAXABLE * item.PERC) / 100;

      total_cgst += taxedValue;
      total_sgst += taxedValue;
    });

    if (isNaN(cash_discount)) {
      cash_discount = 0;
    } else {
      cash_discount = -1 * cash_discount;
    }

    if (isNaN(scheme_difference)) {
      scheme_difference = 0;
    } else {
      scheme_difference = -1 * scheme_difference;
    }

    if (isNaN(cost_difference)) {
      cost_difference = 0;
    } else {
      cost_difference = -1 * cost_difference;
    }

    if (isNaN(freight_charges)) {
      freight_charges = 0;
    } else {
      freight_charges = freight_charges;
    }

    if (isNaN(supplier_credit_note)) {
      supplier_credit_note = 0;
    } else {
      supplier_credit_note = -1 * supplier_credit_note;
    }

    if (isNaN(round_off)) {
      round_off = 0;
    }

    if (isNaN(mmd_goods_tcs_amt)) {
      mmd_goods_tcs_amt = 0;
    }

    const total_amount =
      parseFloat(cash_discount) -
      parseFloat(scheme_difference) -
      parseFloat(cost_difference) -
      parseFloat(due) +
      parseFloat(freight_charges) -
      parseFloat(supplier_credit_note) +
      parseFloat(round_off) +
      parseFloat(mmd_goods_tcs_amt) +
      total_sgst +
      total_cgst +
      total_gst;

    return {
      total_amount: isNaN(total_amount)
        ? "-"
        : parseFloat(total_amount)?.toFixed(2),
      total_sgst: total_sgst?.toFixed(2),
      total_cgst: total_cgst?.toFixed(2),
      total_gst: total_gst?.toFixed(2),
    };
  };

  const onSubmitHandler = (values) => {
    const { total_amount, total_sgst, total_cgst } =
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
    };

    const convertedGst = values.gst
      .filter((item) => item.TAXABLE)
      .map((item) => ({
        PERC: item.PERC / 2,
        VALUE: item.TAXABLE ? (item.TAXABLE * (item.PERC / 2)) / 100 : null,
        TAXABLE: item.TAXABLE,
      }));

    const externalValues = {
      mmh_mrc_refno: values.mmh_mrc_refno,
      supplier_name: values.supplier_name,
      supplier_gstn: values.supplier_gstn,
      mmh_mrc_dt: values.mmh_mrc_dt,
      mmh_dist_bill_dt: values.mmh_dist_bill_dt,
      mmh_mrc_amt: values.mmh_mrc_amt,
      cgst: convertedGst,
      sgst: convertedGst,
      tot_gst_cess_amt: values.tot_gst_cess_amt,
      mmh_manual_disc: values.mmh_manual_disc,
      mmd_goods_tcs_amt: values.mmd_goods_tcs_amt,
      retail_outlet_id: values.retail_outlet_id,
      supplier_id: values.supplier_id,
      mmh_mrc_no: values.mmh_mrc_no,
      mmh_dist_bill_no: values.mmh_dist_bill_no,
      tot_sgst_amt: total_sgst,
      tot_cgst_amt: total_cgst,
      tot_igst_amt: values.tot_igst_amt,
      ts: values.ts,
      igst: values.igst,
      cess: values.cess,
    };

    toast.promise(
      updatePurchase(values.purchase_id, {
        purchase: externalValues,
        purchase_internal: internalValues,
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
                      editable={false}
                    />
                    <CustomInput
                      label="MRC Date"
                      name={`mmh_mrc_dt`}
                      editable={false}
                      value={moment(item.mmh_mrc_dt).format("DD-MM-YYYY")}
                    />
                    <CustomInput
                      label="Distributor Bill Date"
                      name={`mmh_dist_bill_dt`}
                      editable={false}
                      value={moment(item.mmh_dist_bill_dt).format("DD-MM-YYYY")}
                    />
                    <CustomInput
                      label="MRC Amount"
                      name={`mmh_mrc_amt`}
                      type="number"
                      editable={false}
                    />
                  </div>

                  {values.gst.map((item, index) => (
                    <div key={index} className={styles.inputContainer}>
                      <CustomInput
                        label={`Local Purchase ${item.PERC}%`}
                        name={`gst.${index}.TAXABLE`}
                        type="number"
                      />
                      <CustomInput
                        label={`CGST ${item.PERC / 2}% Input`}
                        name={`cgst.${index}.VALUE`}
                        disabled={true}
                        value={
                          values.gst[index].TAXABLE
                            ? parseFloat(
                                (values.gst[index].TAXABLE * (item.PERC / 2)) /
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
                                (values.gst[index].TAXABLE * (item.PERC / 2)) /
                                  100
                              ).toFixed(2)
                            : ""
                        }
                      />
                    </div>
                  ))}

                  <CustomInput
                    label="CESS 12% Input"
                    name="tot_gst_cess_amt"
                    type="number"
                  />

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="Cash Discount"
                      name="cash_discount"
                      type="number"
                    />
                    <CustomInput
                      label="Scheme Difference"
                      name="scheme_difference"
                      type="number"
                    />
                    <CustomInput
                      label="Discount on Purchase"
                      name="mmh_manual_disc"
                      type="number"
                    />
                  </div>

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="Cost Difference"
                      name="cost_difference"
                      type="number"
                    />
                    <CustomInput label="Due" name="due" type="number" />
                    <CustomInput
                      label="Freight Charges"
                      name="freight_charges"
                      type="number"
                    />
                  </div>

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="TCS @0.1%"
                      name="mmd_goods_tcs_amt"
                      type="number"
                    />
                    <CustomInput
                      label="Round Off"
                      name="round_off"
                      type="number"
                    />
                    <CustomInput
                      label="Supplier Credit Note"
                      name="supplier_credit_note"
                      type="number"
                    />
                  </div>

                  <div className={styles.inputContainer}>
                    <CustomInput
                      label="JV Ledger"
                      name="jv_ledger"
                      values={JV_LEDGER_LIST}
                      method="switch"
                    />

                    <CustomInput label="Narration" name="narration" />
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Badge>
                  Total Amount :{" "}
                  {currencyFormatter(calculateTotalAmount(values).total_amount)}
                </Badge>
                <Button
                  variant="ghost"
                  colorScheme="red"
                  mr={3}
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button colorScheme="purple" onClick={handleSubmit}>
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </Formik>
      </ModalContent>
    </Modal>
  );
}

export default PurchaseModal;
