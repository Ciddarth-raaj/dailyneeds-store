import React, { useRef, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { FieldArray, Formik } from "formik";
import { Button, IconButton } from "@chakra-ui/button";
import CustomInput from "../../../components/customInput/customInput";
import styles from "../../../styles/createEpayment.module.css";
import currencyFormatter from "../../../util/currencyFormatter";
import Table from "../../../components/table/table";
import { Flex } from "@chakra-ui/react";
import EmptyData from "../../../components/EmptyData";
import {
  handleCsvFile,
  handleExcelFile,
  handleFileImport,
} from "../../../util/importFile";
import toast from "react-hot-toast";
import { EBOOK_VALIDATION_SCHEMA } from "../../../validations/ebook";

const EMPTY_POS_OBJECT = {
  paytm_tid: null,
  hdur: null,
  hfpp: null,
  sedc: null,
  ppbl: null,
  is_imported: false,
};

function Create() {
  const [isImported, setIsImported] = useState(false);
  const fileInputRef = useRef(null);

  const getTotal = (item) => {
    return (
      (item.hdur ?? 0) + (item.hfpp ?? 0) + (item.sedc ?? 0) + (item.ppbl ?? 0)
    );
  };

  const getRows = (values) => {
    const totals = {
      total_hdur: 0,
      total_hfpp: 0,
      total_sedc: 0,
      total_ppbl: 0,
    };

    values.pos_list.forEach((item) => {
      totals.total_hdur += item.hdur;
      totals.total_hfpp += item.hfpp;
      totals.total_sedc += item.sedc;
      totals.total_ppbl += item.ppbl;
    });

    return [
      {
        particulars: "UPI",
        total: currencyFormatter(totals.total_hdur),
      },
      {
        particulars: "Card",
        total: currencyFormatter(totals.total_hfpp),
      },
      {
        particulars: "Sodexo",
        total: currencyFormatter(totals.total_sedc),
      },
      {
        particulars: "Paytm",
        total: currencyFormatter(totals.total_ppbl),
      },
      {
        particulars: "Total",
        total: currencyFormatter(
          totals.total_hdur +
            totals.total_hfpp +
            totals.total_sedc +
            totals.total_ppbl
        ),
      },
    ];
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event, setValues) => {
    try {
      const file = event.target.files[0];
      const parsedData = await handleFileImport(file);
      handleImportedList(parsedData, setValues);
    } catch (err) {
      console.log(err);
    }
  };

  const handleImportedList = (list, setValues) => {
    try {
      if (list) {
        const data = {};

        list.forEach((item) => {
          const PAYTM_TID = item.Paytm_Tid.replaceAll("'", "");
          if (!data[PAYTM_TID]) {
            data[PAYTM_TID] = {};
          }

          const ITEM_KEY = item["Bank/Gateway"].replaceAll("'", "");

          if (data[PAYTM_TID][ITEM_KEY]) {
            data[PAYTM_TID][ITEM_KEY] += item.Settled_Amount;
          } else {
            data[PAYTM_TID][ITEM_KEY] = item.Settled_Amount;
          }
        });

        const posList = [];

        Object.keys(data).forEach((paytm_tid) => {
          posList.push({
            paytm_tid: paytm_tid,
            hdur: data[paytm_tid].HDUR ?? 0,
            hfpp: data[paytm_tid].HFPP ?? 0,
            sedc: data[paytm_tid].SEDC ?? 0,
            ppbl: data[paytm_tid].PPBL ?? 0,
            is_imported: true,
          });
        });

        setValues({ pos_list: posList });
        setIsImported(true);
      } else {
        throw "Error parsing file";
      }
    } catch (err) {
      console.log(err);
      toast.error("Error parsing file");
    }
  };

  const onSubmitHandler = (values) => {
    const { pos_list } = values;

    console.log("CIDD", pos_list);
  };

  return (
    <GlobalWrapper>
      <Formik
        initialValues={{ pos_list: [] }}
        validationSchema={EBOOK_VALIDATION_SCHEMA}
        onSubmit={onSubmitHandler}
        onReset={() => setIsImported(false)}
      >
        {(formikProps) => {
          const { handleSubmit, resetForm, values, setValues } = formikProps;

          return (
            <CustomContainer
              title="Add E-Payment"
              filledHeader
              rightSection={
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileChange(e, setValues)}
                  />

                  <Button colorScheme="whiteAlpha" onClick={triggerFileInput}>
                    Import
                  </Button>
                </>
              }
            >
              {!isImported && <EmptyData message="Import Data to Continue" />}

              <FieldArray
                name="pos_list"
                render={(arrayHelpers) =>
                  isImported && (
                    <div>
                      {values.pos_list.map((item, index) => (
                        <div key={index} className={styles.inputSubContainer}>
                          <CustomInput
                            label="Paytm TID *"
                            name={`pos_list.${index}.paytm_tid`}
                            type="number"
                            disabled={item.is_imported}
                          />
                          <CustomInput
                            label="UPI *"
                            name={`pos_list.${index}.hdur`}
                            type="number"
                            disabled={item.is_imported}
                          />
                          <CustomInput
                            label="Card *"
                            name={`pos_list.${index}.hfpp`}
                            type="number"
                            disabled={item.is_imported}
                          />
                          <CustomInput
                            label="Sodexo *"
                            name={`pos_list.${index}.sedc`}
                            type="number"
                            disabled={item.is_imported}
                          />
                          <CustomInput
                            label="Paytm *"
                            name={`pos_list.${index}.ppbl`}
                            type="number"
                            disabled={item.is_imported}
                          />
                          <CustomInput
                            label="Total"
                            name={`pos_list.${index}.total`}
                            type="number"
                            editable={false}
                            value={currencyFormatter(getTotal(item))}
                          />

                          <IconButton
                            mb="14px"
                            variant="outline"
                            colorScheme="red"
                            onClick={() => arrayHelpers.remove(index)}
                            disabled={item.is_imported}
                          >
                            <i className="fa fa-trash" aria-hidden="true" />
                          </IconButton>
                        </div>
                      ))}

                      <Flex justifyContent="flex-end" mb="22px">
                        <Button
                          onClick={() => arrayHelpers.push(EMPTY_POS_OBJECT)}
                          variant="ghost"
                          colorScheme="purple"
                        >
                          Add Row
                        </Button>
                      </Flex>
                    </div>
                  )
                }
              />
              {isImported && (
                <>
                  <Table
                    heading={{
                      particulars: "Particulars",
                      total: "Total",
                    }}
                    rows={getRows(values)}
                    variant="plain"
                  />

                  <Flex justifyContent="flex-end" gap="12px">
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={resetForm}
                    >
                      Reset
                    </Button>
                    <Button colorScheme="purple" onClick={handleSubmit}>
                      Save
                    </Button>
                  </Flex>
                </>
              )}
            </CustomContainer>
          );
        }}
      </Formik>
    </GlobalWrapper>
  );
}

export default Create;
