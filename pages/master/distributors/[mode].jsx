import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { Button, Flex, Grid, Text, Alert, AlertIcon, AlertTitle, AlertDescription } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import { useDistributorByCode } from "../../../customHooks/useDistributors";

const validationSchema = Yup.object({
  MDM_DIST_CODE: Yup.string().trim(),
  MDM_DIST_NAME: Yup.string().trim(),
  MDM_SHORT_NAME: Yup.string().trim(),
});

const initialValues = {
  MDM_DIST_CODE: "",
  MDM_DIST_NAME: "",
  MDM_SHORT_NAME: "",
};

function DistributorMode() {
  const router = useRouter();
  const { mode, code: codeQuery } = router.query;
  const code =
    typeof codeQuery === "string" ? codeQuery : codeQuery?.[0];

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const notAllowedMode = createMode || editMode;

  const { distributor, loading } = useDistributorByCode(code, {
    enabled: viewMode && !!code,
  });

  const [formInitialValues, setFormInitialValues] = useState(initialValues);

  useEffect(() => {
    if (distributor) {
      setFormInitialValues({
        MDM_DIST_CODE: distributor.MDM_DIST_CODE ?? "",
        MDM_DIST_NAME: distributor.MDM_DIST_NAME ?? "",
        MDM_SHORT_NAME: distributor.MDM_SHORT_NAME ?? "",
      });
    }
  }, [distributor]);

  if (notAllowedMode) {
    return (
      <GlobalWrapper title="Product Distributors" permissionKey="view_product_distributors">
        <CustomContainer title={createMode ? "Create Distributor" : "Edit Distributor"} filledHeader>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Flex direction="column" gap={1}>
              <AlertTitle>
                {createMode ? "Create" : "Edit"} is not allowed
              </AlertTitle>
              <AlertDescription>
                Product distributors cannot be created or updated. This data is read-only.
              </AlertDescription>
            </Flex>
          </Alert>
          <Button
            mt={4}
            colorScheme="purple"
            onClick={() => router.push("/master/distributors")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (viewMode && loading && !distributor) {
    return (
      <GlobalWrapper title="Product Distributors">
        <CustomContainer title="Loading..." filledHeader>
          <Text py={4}>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (viewMode && !loading && !distributor && code) {
    return (
      <GlobalWrapper title="Product Distributors">
        <CustomContainer title="Not found" filledHeader>
          <Text py={4}>Distributor not found.</Text>
          <Button
            colorScheme="purple"
            onClick={() => router.push("/master/distributors")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="View Distributor" permissionKey="view_product_distributors">
      <CustomContainer title="View Distributor" filledHeader>
        <Formik
          enableReinitialize
          initialValues={formInitialValues}
          validationSchema={validationSchema}
          onSubmit={() => {}}
        >
          {() => (
            <form>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={6}>
                <CustomInput
                  label="Code"
                  name="MDM_DIST_CODE"
                  type="text"
                  editable={false}
                />
                <CustomInput
                  label="Name"
                  name="MDM_DIST_NAME"
                  type="text"
                  editable={false}
                />
                <CustomInput
                  label="Short Name"
                  name="MDM_SHORT_NAME"
                  type="text"
                  editable={false}
                />
              </Grid>

              <Flex gap={3} justify="flex-end" mt={6}>
                <Button
                  type="button"
                  colorScheme="purple"
                  onClick={() => router.push("/master/distributors")}
                >
                  Back
                </Button>
              </Flex>
            </form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DistributorMode;
