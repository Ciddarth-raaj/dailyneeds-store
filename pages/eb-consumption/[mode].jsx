import React, { useEffect, useState } from "react";
import CustomContainer from "../../components/CustomContainer";
import { Formik, FieldArray, useFormikContext } from "formik";
import * as Yup from "yup";
import CustomInput from "../../components/customInput/customInput";
import styles from "../../styles/master.module.css";
import {
  Button,
  Switch,
  Flex,
  Text,
  Badge,
  Box,
  Divider,
} from "@chakra-ui/react";
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
import useEBMaster from "../../customHooks/useEBMaster";
import EmptyData from "../../components/EmptyData";

// Component to watch branch_id changes and populate eb_machines
function BranchWatcher({ filteredEbList, viewMode, editMode }) {
  const { values, setFieldValue } = useFormikContext();
  const [prevBranchId, setPrevBranchId] = useState(values.branch_id);

  useEffect(() => {
    if (
      values.branch_id &&
      values.branch_id !== prevBranchId &&
      !viewMode &&
      !editMode
    ) {
      const filtered = filteredEbList(values.branch_id);
      const ebMachines = filtered.map((machine) => ({
        eb_machine_id: machine.eb_machine_id,
        machine_number: machine.machine_number,
        nickname: machine.nickname,
        store_name: machine.store_name,
        opening_units: "",
        closing_units: "",
      }));
      setFieldValue("eb_machines", ebMachines);
      setPrevBranchId(values.branch_id);
    }
  }, [
    values.branch_id,
    prevBranchId,
    viewMode,
    editMode,
    filteredEbList,
    setFieldValue,
  ]);

  return null;
}

const CONSUMPTION_VALIDATION_SCHEMA = Yup.object().shape({
  date: Yup.date().required("Required"),
  branch_id: Yup.string().required("Required"),
  eb_machines: Yup.array()
    .of(
      Yup.object().shape({
        eb_machine_id: Yup.number().required(),
        opening_units: Yup.number()
          .typeError("Must be a number")
          .min(0, "Must be ≥ 0")
          .required("Required"),
        closing_units: Yup.number()
          .typeError("Must be a number")
          .min(0, "Must be ≥ 0")
          .required("Required"),
      })
    )
    .min(1, "At least one EB machine is required"),
});

const INITIAL_VALUES = {
  date: new Date(),
  branch_id: "",
  eb_machines: [],
};

function EBConsumptionForm() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";

  const { ebConsumption } = useEBConsumptionById(paramId);
  const { storeId } = useUser().userConfig;
  const { outlets } = useOutlets();
  const { ebMasterList } = useEBMaster();

  const filteredEbList = (storeId) =>
    ebMasterList.filter((item) => (storeId ? item.store_id == storeId : true));

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
        eb_machines: ebConsumption.eb_machines || [],
      });
    } else {
      setInitialValues({
        date: new Date(),
        branch_id: storeId || "",
        eb_machines: [],
      });
    }
  }, [ebConsumption, storeId]);

  const handleSubmit = (values) => {
    const data = {
      date: moment(values.date).format("YYYY-MM-DD"),
      branch_id: values.branch_id,
      eb_machines: values.eb_machines.map((machine) => ({
        eb_machine_id: machine.eb_machine_id,
        opening_units: parseFloat(machine.opening_units) || 0,
        closing_units: parseFloat(machine.closing_units) || 0,
      })),
    };

    toast.promise(
      editMode ? updateEBConsumption(paramId, data) : createEBConsumption(data),
      {
        loading: editMode
          ? "Updating EB Consumption!"
          : "Creating EB Consumption!",
        success: (data) => {
          if (data.code === 200) {
            router.push("/eb-consumption");
            return editMode
              ? "Successfully Updated EB Consumption!"
              : "Successfully Created EB Consumption!";
          } else {
            throw data;
          }
        },
        error: (err) => {
          console.log(err);
          return editMode
            ? "Error Updating EB Consumption!"
            : "Error Creating EB Consumption!";
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
            const { handleSubmit, resetForm, values } = formikProps;

            const totalConsumption =
              values.eb_machines?.reduce((sum, machine) => {
                const opening = parseFloat(machine.opening_units) || 0;
                const closing = parseFloat(machine.closing_units) || 0;
                return sum + (closing - opening);
              }, 0) || 0;

            return (
              <div className={styles.inputContainer}>
                <BranchWatcher
                  filteredEbList={filteredEbList}
                  viewMode={viewMode}
                  editMode={editMode}
                />
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
                  placeholder="Click here to select branch..."
                  name="branch_id"
                  method="switch"
                  values={OUTLETS_LIST}
                  editable={!viewMode}
                />

                {values.branch_id && (
                  <CustomContainer title="EB Machines" smallHeader size="sm">
                    {values.eb_machines && values.eb_machines.length > 0 && (
                      <>
                        <FieldArray name="eb_machines">
                          {() => (
                            <div
                              style={{
                                gap: "22px",
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              {values.eb_machines.map((machine, index) => (
                                <CustomContainer
                                  smallHeader
                                  size="sm"
                                  filledHeader
                                  key={machine.eb_machine_id || index}
                                  rightSection={
                                    <Badge
                                      colorPalette="secondary"
                                      size="md"
                                      mt={2}
                                      w="fit-content"
                                    >
                                      Consumption:{" "}
                                      {(parseFloat(machine.closing_units) ||
                                        0) -
                                        (parseFloat(machine.opening_units) ||
                                          0)}
                                    </Badge>
                                  }
                                  title={`${machine.machine_number} ${
                                    machine.nickname
                                      ? ` - ${machine.nickname}`
                                      : ""
                                  }`}
                                >
                                  <Flex gap="22px">
                                    <CustomInput
                                      label="Opening Units"
                                      placeholder="0"
                                      name={`eb_machines.${index}.opening_units`}
                                      type="number"
                                      editable={!viewMode}
                                    />
                                    <CustomInput
                                      label="Closing Units"
                                      placeholder="0"
                                      name={`eb_machines.${index}.closing_units`}
                                      type="number"
                                      editable={!viewMode}
                                    />
                                  </Flex>
                                </CustomContainer>
                              ))}
                            </div>
                          )}
                        </FieldArray>

                        <Divider my={4} />
                        <Badge
                          colorPalette="purple"
                          size="lg"
                          w="fit-content"
                          mt={2}
                        >
                          Total Consumption: {totalConsumption}
                        </Badge>
                      </>
                    )}

                    {values.branch_id && values.eb_machines?.length === 0 && (
                      <EmptyData message="No EB machines found for the selected branch." />
                    )}
                  </CustomContainer>
                )}

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
