import {
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

  const onSubmitHandler = (values) => {
    const internalValues = {
      cash_discount: values.cash_discount,
      scheme_difference: values.scheme_difference,
      cost_difference: values.cost_difference,
      due: values.due,
      freight_charges: values.freight_charges,
      round_off: values.round_off,
      jv_ledger: values.jv_ledger,
      narration: values.narration,
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
      tot_sgst_amt: values.tot_sgst_amt,
      tot_cgst_amt: values.tot_cgst_amt,
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
                      label="JV Ledger"
                      name="jv_ledger"
                      type="number"
                    />
                  </div>

                  <div className={styles.inputContainer}>
                    <CustomInput label="Narration" name="narration" />
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
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
