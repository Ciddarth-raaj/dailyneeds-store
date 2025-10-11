import React, { useEffect, useState } from "react";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomInput from "../../components/customInput/customInput";
import styles from "../../styles/master.module.css";
import { Button, Switch, Flex, Text, Badge } from "@chakra-ui/react";
import toast from "react-hot-toast";
import materialcategory from "../../helper/materialcategory";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import useOutlets from "../../customHooks/useOutlets";
import moment from "moment";
import {
  createEBConsumption,
  updateEBConsumption,
} from "../../helper/eb_consumption";
import useEBConsumptionById from "../../customHooks/useEBConsumptionById";
import { useUser } from "../../contexts/UserContext";

const CONSUMPTION_VALIDATION_SCHEMA = Yup.object().shape({
  date: Yup.date().required("Required"),
  branch_id: Yup.string().required("Required"),
  opening_units: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .required("Required"),
  closing_units: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .required("Required"),
});

const INITIAL_VALUES = {
  date: new Date(),
  branch_id: "",
  opening_units: "",
  closing_units: "",
};

function EBConsumptionForm() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";

  const { ebConsumption } = useEBConsumptionById(paramId);
  const { storeId } = useUser().userConfig;
  const { outlets } = useOutlets();

  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  useEffect(() => {
    if (ebConsumption) {
      setInitialValues({
        date: moment(ebConsumption.date),
        branch_id: ebConsumption.branch_id,
        opening_units: ebConsumption.opening_units,
        closing_units: ebConsumption.closing_units,
      });
    } else {
      setInitialValues({
        date: new Date(),
        branch_id: storeId,
        opening_units: "",
        closing_units: "",
      });
    }
  }, [ebConsumption, storeId]);

  const handleSubmit = (values) => {
    const data = {
      date: moment(values.date).format("YYYY-MM-DD"),
      branch_id: values.branch_id,
      closing_units: values.closing_units,
      opening_units: values.opening_units,
    };

    toast.promise(
      editMode ? updateEBConsumption(paramId, data) : createEBConsumption(data),
      {
        loading: "Creating EB Consumption!",
        success: (data) => {
          if (data.code === 200) {
            router.push("/eb-consumption");
            return "Successfully Created EB Consumption!";
          } else {
            throw data;
          }
        },
        error: (err) => {
          console.log(err);
          return "Error Creating EB Consumption!";
        },
      }
    );
  };

  return (
    <GlobalWrapper>
      <CustomContainer
        title={
          viewMode
            ? "View EB Consumption"
            : editMode
            ? "Edit EB Consumption"
            : "Add New EB Consumption"
        }
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={CONSUMPTION_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm, values, setFieldValue } =
              formikProps;

            return (
              <div className={styles.inputContainer}>
                <CustomInput
                  label="Date"
                  isRequired
                  placeholder="DD/MM/YYYY"
                  name="date"
                  type="date"
                  method="datepicker"
                  editable={!viewMode}
                />

                <CustomInput
                  label="Select Branch"
                  isRequired
                  placeholder="Click here to select employee..."
                  name="branch_id"
                  method="switch"
                  values={OUTLETS_LIST}
                  editable={!viewMode}
                />

                <Flex gap="22px">
                  <CustomInput
                    label="Opening Units"
                    placeholder="0"
                    name="opening_units"
                    type="number"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Closing Units"
                    placeholder="0"
                    name="closing_units"
                    type="number"
                    editable={!viewMode}
                  />
                </Flex>

                <Badge
                  colorPalette="secondary"
                  size="lg"
                  w="fit-content"
                >{`Total Consumption: ${
                  values.closing_units - values.opening_units
                }`}</Badge>

                {!viewMode && (
                  <Flex
                    className={styles.buttonContainer}
                    mt={8}
                    justify="flex-end"
                  >
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={() => resetForm()}
                    >
                      Reset
                    </Button>

                    <Button colorScheme="purple" onClick={handleSubmit}>
                      {editMode ? "Update" : "Create"}
                    </Button>
                  </Flex>
                )}
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EBConsumptionForm;
