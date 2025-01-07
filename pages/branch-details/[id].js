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
    if (designations) {
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

  const handleSubmit = (values) => {
    const params = {
      outlet_details: {
        outlet_name: values.outlet_name,
        outlet_nickname: values.outlet_nickname,
        outlet_phone: values.outlet_phone,
        phone: values.phone,
        outlet_address: values.outlet_address,
        telegram_username: values.telegram_username,
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
                  />
                  <CustomInput
                    label="Branch Nickname"
                    name="outlet_nickname"
                    type="text"
                  />
                </div>

                <div className={styles.inputHolder}>
                  <CustomInput
                    label="Primary Phone Number"
                    name="outlet_phone"
                    type="number"
                  />
                  <CustomInput
                    label="Telegram Username"
                    name="telegram_username"
                    type="text"
                  />
                </div>

                <div className={styles.inputHolder}>
                  <CustomInput
                    label="Phone Numbers (Separated by ,)"
                    name="phone"
                    type="text"
                    method="TextArea"
                  />

                  <CustomInput
                    label="Address"
                    name="outlet_address"
                    type="text"
                    method="TextArea"
                  />
                </div>

                <CustomContainer title="Employee Count" smallHeader>
                  <div className={styles.contentHolder}>
                    {designations.map((m, i) => (
                      <div className={styles.inputHolder} key={i}>
                        <CustomInput
                          placeholder="0"
                          name={`budget[${i}].count`}
                          type="number"
                          label={`${m.value} Count`}
                        />
                      </div>
                    ))}
                  </div>
                </CustomContainer>

                <div className={styles.buttonContainer}>
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={handleReset}
                  >
                    Reset
                  </Button>
                  <Button colorScheme="purple" onClick={handleSubmit}>
                    Create
                  </Button>
                </div>
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default BranchEditor;
