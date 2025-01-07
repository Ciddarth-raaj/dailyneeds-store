import React, { useEffect, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import CustomInput from "../../components/customInput/customInput";
import styles from "./branchModal.module.css";
import { BranchValidation } from "../../util/validation";
import useDesignations from "../../customHooks/useDesignations";
import { Button } from "@chakra-ui/button";
import { Input } from "@chakra-ui/react";
import OutletHelper from "../../helper/outlets";
import toast from "react-hot-toast";
import { useRouter } from "next/router";

function BranchEditor() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editable = !viewMode;

  const [initialValues, setInitialValues] = useState({
    outlet_name: null,
    outlet_nickname: null,
    outlet_phone: null,
    telegram_username: null,
    phone: null,
    outlet_address: null,
    store_id: null,
    budget: [],
  });

  const { designations } = useDesignations();

  useEffect(() => {
    if (designations && !paramId) {
      const updatedBudget = designations.map((item) => ({
        count: null,
        designation: item.value,
        designation_id: item.id,
      }));
      setInitialValues((prev) => ({
        ...prev,
        budget: updatedBudget,
      }));
    }
  }, [designations]);

  const getMergedBudgetArray = (existingBudget, designations) => {
    const mergedBudget = [...existingBudget];

    designations.forEach((designation) => {
      const exists = existingBudget.some(
        (budget) => budget.designation_id === designation.id
      );

      if (!exists) {
        mergedBudget.push({
          count: null,
          designation: designation.value,
          designation_id: designation.id,
        });
      }
    });

    return mergedBudget;
  };

  useEffect(() => {
    async function fetchOoutlet() {
      if (paramId && designations) {
        const response = await OutletHelper.getOutletByOutletId(paramId);

        if (!response.code) {
          const modifiedResponse = response[0];
          modifiedResponse.budget = modifiedResponse.budget.map((item) => ({
            count: parseInt(item.budget),
            designation: item.designation_name,
            designation_id: item.designation_id,
            budget_id: item.budget_id,
          }));

          // Merge with missing designations
          modifiedResponse.budget = getMergedBudgetArray(
            modifiedResponse.budget,
            designations
          );

          setInitialValues(modifiedResponse);
        }
      }
    }
    fetchOoutlet();
  }, [paramId, designations]);

  const handleCreate = (values) => {
    const params = {
      outlet_details: {
        outlet_name: values.outlet_name,
        outlet_nickname: values.outlet_nickname,
        outlet_phone: values.outlet_phone,
        phone: values.phone,
        outlet_address: values.outlet_address,
        telegram_username: values.telegram_username,
        opening_cash: values.opening_cash,
      },
      budget: values.budget,
    };

    toast.promise(OutletHelper.createOutlet(params), {
      loading: "Creating new outlet",
      success: (response) => {
        if (response.code === 200) {
          router.push("/branch-details");
          return "Outlet Created!";
        } else {
          throw err;
        }
      },
      error: (err) => {
        console.log(err);
        return "Error creating Outlet!";
      },
    });
  };

  const handleEdit = (values) => {
    const params = {
      outlet_id: paramId,
      outlet_details: {
        outlet_name: values.outlet_name,
        outlet_nickname: values.outlet_nickname,
        outlet_phone: values.outlet_phone,
        phone: values.phone,
        outlet_address: values.outlet_address,
        telegram_username: values.telegram_username,
        opening_cash: values.opening_cash,
      },
      budget: values.budget,
    };

    toast.promise(OutletHelper.updateOutlet(params), {
      loading: "Updating outlet",
      success: (response) => {
        if (response.code === 200) {
          router.push("/branch-details");
          return "Outlet Updated!";
        } else {
          throw err;
        }
      },
      error: (err) => {
        console.log(err);
        return "Error updating Outlet!";
      },
    });
  };

  const handleSubmit = (values) => {
    if (mode === "edit") {
      handleEdit(values);
    } else {
      handleCreate(values);
    }
  };

  return (
    <GlobalWrapper title="Branch Details">
      <Head />

      <CustomContainer title="Branch Details" filledHeader>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={BranchValidation}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { handleSubmit, handleReset } = formikProps;

            return (
              <div>
                <div className={styles.inputHolder}>
                  <CustomInput
                    label="Branch Name"
                    name="outlet_name"
                    type="text"
                    editable={editable}
                  />
                  <CustomInput
                    label="Branch Nickname"
                    name="outlet_nickname"
                    type="text"
                    editable={editable}
                  />
                  <CustomInput
                    label="Primary Phone Number"
                    name="outlet_phone"
                    type="number"
                    editable={editable}
                  />
                </div>

                <div className={styles.inputHolder}>
                  <CustomInput
                    label="Telegram Username"
                    name="telegram_username"
                    type="text"
                    editable={editable}
                  />
                  <CustomInput
                    label="Opening Cash"
                    name="opening_cash"
                    type="number"
                    editable={editable}
                  />

                  <CustomInput
                    label="Phone Numbers (Separated by ,)"
                    name="phone"
                    type="text"
                    editable={editable}
                  />
                </div>

                <CustomInput
                  label="Address"
                  name="outlet_address"
                  type="text"
                  method="TextArea"
                  editable={editable}
                />

                <CustomContainer title="Employee Count" smallHeader>
                  <div className={styles.contentHolder}>
                    {designations.map((m, i) => (
                      <div className={styles.inputHolder} key={i}>
                        <CustomInput
                          placeholder="0"
                          name={`budget[${i}].count`}
                          type="number"
                          label={`${m.value} Count`}
                          editable={editable}
                        />
                      </div>
                    ))}
                  </div>
                </CustomContainer>

                {!viewMode && (
                  <div className={styles.buttonContainer}>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                    <Button colorScheme="purple" onClick={handleSubmit}>
                      {mode === "edit" ? "Update" : "Create"}
                    </Button>
                  </div>
                )}
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default BranchEditor;
