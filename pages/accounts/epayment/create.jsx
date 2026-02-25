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
import EbookHelper from "../../../helper/ebook";
import DatePicker from "react-modern-calendar-datepicker";
import { useUser } from "../../../contexts/UserContext";
import useOutlets from "../../../customHooks/useOutlets";
import { useRouter } from "next/router";
import moment from "moment";

const EMPTY_POS_OBJECT = {
  paytm_tid: null,
  hdur: null,
  hfpp: null,
  sedc: null,
  ppbl: null,
  is_imported: false,
};

function Create() {
  const router = useRouter();
  const [isImported, setIsImported] = useState(false);
  const fileInputRef = useRef(null);
  const { storeId: userStoreId } = useUser().userConfig;

  const { outlets } = useOutlets();
  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

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
      if (list || list.length === 0) {
        let date = new Date();
        if (list.length > 0) {
          const dateStr = list[0].Transaction_Date;
          date = new Date(dateStr.split(" ")[0]);
        }

        const data = {};

        list.forEach((item) => {
          if (!item.POS_ID) return;

          const PAYTM_TID = item.POS_ID.replaceAll("'", "");
          if (!data[PAYTM_TID]) {
            data[PAYTM_TID] = {};
          }

          const ITEM_KEY = item["Bank/Gateway"].replaceAll("'", "");

          if (data[PAYTM_TID][ITEM_KEY]) {
            data[PAYTM_TID][ITEM_KEY] += parseFloat(
              item.Amount.replaceAll("'", "")
            );
          } else {
            data[PAYTM_TID][ITEM_KEY] = parseFloat(
              item.Amount.replaceAll("'", "")
            );
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

        setValues({ pos_list: posList, date, store_id: userStoreId });
        setIsImported(true);
      } else {
        throw "Error parsing file";
      }
    } catch (err) {
      console.log(err);
      toast.error("Error parsing file");
    }
  };

  const onSubmitHandler = async (values) => {
    const { pos_list, date, store_id } = values;
    const modifedPosList = pos_list.map((item) => {
      const tmp = structuredClone(item);
      delete tmp.is_imported;
      return tmp;
    });

    toast.promise(
      EbookHelper.bulkCreateEbook({
        store_id: parseInt(store_id),
        date: moment(date).format("YYYY-MM-DD"),
        ebooks: modifedPosList,
      }),
      {
        loading: "Creating Ebook",
        success: (res) => {
          if (res.code === 200) {
            if (res.updated > 0) {
              router.push("/accounts");
              return `Ebooks updated successfully!`;
            }

            router.push("/accounts");
            return `Ebooks created successfully!`;
          } else {
            throw res.message;
          }
        },
        error: (err) => {
          console.log(err);
          return "Error creating Outlet!";
        },
      }
    );
  };

  return (
    <GlobalWrapper>
      <Formik
        initialValues={{
          pos_list: [],
          date: new Date(),
          store_id: null,
        }}
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

                  <Button
                    colorScheme="purple"
                    onClick={triggerFileInput}
                    size="sm"
                  >
                    Import
                  </Button>
                </>
              }
            >
              {!isImported && <EmptyData message="Import Data to Continue" />}

              {isImported && (
                <div>
                  <CustomInput
                    label="Date"
                    name="date"
                    type="text"
                    method="datepicker"
                    disabled={true}
                  />
                  <CustomInput
                    label="Store"
                    name="store_id"
                    values={OUTLETS_LIST}
                    type="text"
                    method="switch"
                    disabled={userStoreId !== null}
                  />
                </div>
              )}

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
                            // type="number"
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
