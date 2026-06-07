import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import {
  Button,
  Flex,
  Grid,
  Box,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { useDistributorByCid } from "../../../customHooks/useDistributors";
import useEmployees from "../../../customHooks/useEmployees";
import usePermissions from "../../../customHooks/usePermissions";

const viewPermissionKeys = [
  "view_product_distributors",
  "view_product_distributor",
];

const validationSchema = Yup.object({
  CID: Yup.string().trim(),
  MDM_DIST_CODE: Yup.string().trim(),
  HQ_DIST_CODE: Yup.string().trim(),
  MDM_DIST_NAME: Yup.string().trim(),
  MDM_SHORT_NAME: Yup.string().trim(),
  buyer_id: Yup.mixed().nullable(),
});

const initialValues = {
  CID: "",
  MDM_DIST_CODE: "",
  HQ_DIST_CODE: "",
  MDM_DIST_NAME: "",
  MDM_SHORT_NAME: "",
  buyer_id: "",
};

function DistributorMode() {
  const router = useRouter();
  const { mode, cid: cidQuery, code: legacyCodeQuery } = router.query;
  const cid =
    typeof cidQuery === "string"
      ? cidQuery
      : cidQuery?.[0] ??
        (typeof legacyCodeQuery === "string"
          ? legacyCodeQuery
          : legacyCodeQuery?.[0]);

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const canAssignBuyer = usePermissions(["add_product_distributor"]);

  const { employees, loading: loadingEmployees } = useEmployees({});

  const { distributor, loading, saveBuyerMapping } = useDistributorByCid(cid, {
    enabled: (editMode || viewMode) && !!cid,
  });

  const [formInitialValues, setFormInitialValues] = useState(initialValues);

  const buyerOptions = useMemo(() => {
    const opts = [
      { id: "", value: "— Unassigned —" },
      ...(employees || []).map((e) => ({
        id: e.employee_id,
        value: `${e.employee_name ?? ""} (ID: ${e.employee_id})`,
      })),
    ];
    return opts;
  }, [employees]);

  useEffect(() => {
    if (distributor) {
      const bid = distributor.buyer_id;
      setFormInitialValues({
        CID: distributor.CID ?? "",
        MDM_DIST_CODE: distributor.MDM_DIST_CODE ?? "",
        HQ_DIST_CODE: distributor.HQ_DIST_CODE ?? "",
        MDM_DIST_NAME: distributor.MDM_DIST_NAME ?? "",
        MDM_SHORT_NAME: distributor.MDM_SHORT_NAME ?? "",
        buyer_id:
          bid != null && bid !== "" && !Number.isNaN(Number(bid))
            ? Number(bid)
            : "",
      });
    }
  }, [distributor]);

  const handleSubmit = async (values) => {
    if (!editMode || !cid) return;
    const toastId = toast.loading("Saving buyer assignment…");
    try {
      const raw = values.buyer_id;
      const buyer_id =
        raw === "" || raw === null || raw === undefined ? null : Number(raw);
      await saveBuyerMapping(buyer_id);
      toast.success("Buyer assignment saved", { id: toastId });
      router.push("/master/distributors");
    } catch (err) {
      toast.error(err?.message ?? "Failed to save", { id: toastId });
    }
  };

  if (createMode) {
    return (
      <GlobalWrapper
        title="Product Distributors"
        permissionKey={viewPermissionKeys}
      >
        <CustomContainer title="Create Distributor" filledHeader>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Flex direction="column" gap={1}>
              <AlertTitle>Create is not allowed</AlertTitle>
              <AlertDescription>
                Distributor master data is imported via HQ sync. Use the list
                to view distributors and assign a buyer on the edit page.
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

  if (editMode && !canAssignBuyer) {
    return (
      <GlobalWrapper
        title="Edit Distributor"
        permissionKey={viewPermissionKeys}
      >
        <CustomContainer title="Edit Distributor" filledHeader>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Flex direction="column" gap={1}>
              <AlertTitle>No permission</AlertTitle>
              <AlertDescription>
                You need permission to assign a buyer to a product distributor.
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

  if ((editMode || viewMode) && loading && !distributor) {
    return (
      <GlobalWrapper title="Product Distributors" permissionKey={viewPermissionKeys}>
        <CustomContainer title="Loading..." filledHeader>
          <Text py={4}>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((editMode || viewMode) && !loading && !distributor && cid) {
    return (
      <GlobalWrapper title="Product Distributors" permissionKey={viewPermissionKeys}>
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

  const title = viewMode
    ? "View Distributor"
    : editMode
    ? "Edit buyer assignment"
    : "Distributor";

  const wrapperPermission = editMode
    ? ["add_product_distributor"]
    : viewPermissionKeys;

  return (
    <GlobalWrapper title={title} permissionKey={wrapperPermission}>
      <CustomContainer title={title} filledHeader>
        <Formik
          enableReinitialize
          initialValues={formInitialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit: formikSubmit }) => (
            <form onSubmit={formikSubmit}>
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                mb={6}
              >
                <CustomInput
                  label="CID"
                  name="CID"
                  type="text"
                  editable={false}
                />
                <CustomInput
                  label="Medishop Code"
                  name="MDM_DIST_CODE"
                  type="text"
                  editable={false}
                />
                <CustomInput
                  label="HQ Code"
                  name="HQ_DIST_CODE"
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
                {viewMode ? (
                  <Box gridColumn={{ base: "1", md: "1 / -1" }}>
                    <Text
                      fontSize="sm"
                      fontWeight={600}
                      color="gray.600"
                      letterSpacing="0.01em"
                      mb={1.5}
                    >
                      Buyer
                    </Text>
                    <Text fontSize="md">
                      {distributor?.buyer_name
                        ? `${distributor.buyer_name}${
                            distributor.buyer_id != null
                              ? ` (ID: ${distributor.buyer_id})`
                              : ""
                          }`
                        : "— Unassigned —"}
                    </Text>
                  </Box>
                ) : (
                  <CustomInput
                    label="Buyer"
                    name="buyer_id"
                    method="searchable-dropdown"
                    values={buyerOptions}
                    placeholder="Search employee or unassign"
                    editable={!loadingEmployees}
                  />
                )}
              </Grid>

              <Flex gap={3} justify="flex-end" mt={6} flexWrap="wrap">
                <Button
                  type="button"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => router.push("/master/distributors")}
                >
                  {editMode ? "Cancel" : "Back"}
                </Button>
                {viewMode && canAssignBuyer ? (
                  <Button
                    type="button"
                    colorScheme="purple"
                    onClick={() =>
                      router.push(
                        `/master/distributors/edit?cid=${encodeURIComponent(
                          cid
                        )}`
                      )
                    }
                  >
                    Edit buyer
                  </Button>
                ) : null}
                {editMode ? (
                  <Button type="submit" colorScheme="purple">
                    Save
                  </Button>
                ) : null}
              </Flex>
            </form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DistributorMode;
