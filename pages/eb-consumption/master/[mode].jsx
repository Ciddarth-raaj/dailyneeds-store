import React, { useEffect, useState } from "react";
import CustomContainer from "../../../components/CustomContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomInput from "../../../components/customInput/customInput";
import styles from "../../../styles/master.module.css";
import { Button, Flex } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import useEBMasterById from "../../../customHooks/useEBMasterById";
import { createEBMaster, updateEBMaster } from "../../../helper/eb_master";
import StoreHelper from "../../../helper/store";
import useOutlets from "../../../customHooks/useOutlets";
import { useUser } from "../../../contexts/UserContext";

const EB_MASTER_VALIDATION_SCHEMA = Yup.object().shape({
  machine_number: Yup.string()
    .max(20, "Must be 20 characters or less")
    .required("Required"),
  nickname: Yup.string()
    .max(50, "Must be 50 characters or less")
    .nullable()
    .optional(),
  store_id: Yup.mixed()
    .test("is-valid-store", "Store is required", (value) => {
      return value !== "" && value !== null && value !== undefined;
    })
    .test("is-positive-number", "Must be a positive number", (value) => {
      if (!value) return false;
      const num = parseInt(value);
      return !isNaN(num) && num > 0;
    })
    .required("Required"),
});

const INITIAL_VALUES = {
  machine_number: "",
  nickname: "",
  store_id: "",
};

function EbMachineMasterForm() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const { storeId } = useUser().userConfig;
  const { ebMaster } = useEBMasterById(paramId);
  const { outlets } = useOutlets();
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  useEffect(() => {
    if (ebMaster) {
      setInitialValues({
        machine_number: ebMaster.machine_number || "",
        nickname: ebMaster.nickname || "",
        store_id: ebMaster.store_id || "",
      });
    } else {
      setInitialValues(INITIAL_VALUES);
    }
  }, [ebMaster]);

  useEffect(() => {
    if (storeId && createMode) {
      setInitialValues({
        ...INITIAL_VALUES,
        store_id: storeId,
      });
    }
  }, [storeId, createMode]);

  const STORES_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  const handleSubmit = (values) => {
    const data = {
      machine_number: values.machine_number,
      nickname: values.nickname || null,
      store_id: parseInt(values.store_id),
    };

    toast.promise(
      editMode ? updateEBMaster(paramId, data) : createEBMaster(data),
      {
        loading: editMode
          ? "Updating EB Machine Master..."
          : "Creating EB Machine Master...",
        success: (response) => {
          if (response.eb_machine_id) {
            router.push("/eb-consumption/master");
            return editMode
              ? "Successfully Updated EB Machine Master!"
              : "Successfully Created EB Machine Master!";
          } else {
            throw response;
          }
        },
        error: (err) => {
          console.log(err);
          return editMode
            ? "Error Updating EB Machine Master!"
            : "Error Creating EB Machine Master!";
        },
      }
    );
  };

  const getPermissionKey = () => {
    if (viewMode) {
      return "view_eb_machine_master";
    }

    return "add_eb_machine_master";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer
        title={
          viewMode
            ? "View EB Machine Master"
            : editMode
            ? "Edit EB Machine Master"
            : "Add New EB Machine Master"
        }
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={EB_MASTER_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm } = formikProps;

            return (
              <div className={styles.inputContainer}>
                <CustomInput
                  label="Machine Number"
                  isRequired
                  placeholder="Enter machine number"
                  name="machine_number"
                  type="text"
                  editable={!viewMode}
                />

                <CustomInput
                  label="Nickname"
                  placeholder="Enter nickname (optional)"
                  name="nickname"
                  type="text"
                  editable={!viewMode}
                />

                <CustomInput
                  label="Select Store"
                  isRequired
                  placeholder="Click here to select store..."
                  name="store_id"
                  method="switch"
                  values={STORES_LIST}
                  editable={!viewMode}
                  disabled={storeId !== null}
                />

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

export default EbMachineMasterForm;
