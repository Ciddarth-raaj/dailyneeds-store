import React, { useMemo } from "react";
import { useRouter } from "next/router";
import { Formik, useFormikContext } from "formik";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { Button, Grid, Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useJobWorksheets } from "../../../customHooks/useJobWorksheets";
import usePeople from "../../../customHooks/usePeople";
import moment from "moment";

const initialFilterValues = {
  grn_no: "",
  supplier_id: "",
  date_from: "",
  date_to: "",
};

const colDefs = [
  {
    field: "id",
    headerName: "ID",
    type: "id",
    width: 90,
  },
  {
    field: "grn_no",
    headerName: "GRN No",
    flex: 1,
  },
  {
    field: "date",
    headerName: "Date",
    valueFormatter: (params) =>
      params.value ? moment(params.value).format("DD-MM-YYYY") : "-",
    flex: 1,
  },
  {
    field: "supplier_name",
    headerName: "Supplier",
    flex: 2,
  },
  {
    field: "supplier_phone",
    headerName: "Phone",
    hideByDefault: true,
    flex: 1,
  },
  {
    field: "item_count",
    headerName: "Items",
    type: "numericColumn",
    width: 100,
  },
  {
    field: "id",
    headerName: "Action",
    type: "action-column",
    width: 120,
    valueGetter: (params) => {
      const id = params.data?.id;
      return [
        {
          label: "View",
          redirectionUrl: `/purchase/job-worksheet/view?id=${id}`,
        },
        {
          label: "Edit",
          redirectionUrl: `/purchase/job-worksheet/edit?id=${id}`,
        },
      ];
    },
  },
];

function JobWorksheetFiltersAndGrid({ supplierOptions }) {
  const { values } = useFormikContext();
  const filters = useMemo(() => {
    const f = { limit: 500 };
    if (values.grn_no?.trim()) f.grn_no = values.grn_no.trim();
    if (values.supplier_id) f.supplier_id = parseInt(values.supplier_id, 10);
    if (values.date_from)
      f.date_from = moment(values.date_from).format("YYYY-MM-DD");
    if (values.date_to) f.date_to = moment(values.date_to).format("YYYY-MM-DD");
    return f;
  }, [values.grn_no, values.supplier_id, values.date_from, values.date_to]);

  const { jobWorksheets, loading } = useJobWorksheets(filters);

  return (
    <>
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(4, 1fr)",
        }}
        mb={4}
      >
        <CustomInput label="GRN No" name="grn_no" placeholder="Filter by GRN" />
        <CustomInput
          label="Supplier"
          name="supplier_id"
          method="switch"
          values={supplierOptions}
        />
        <CustomInput label="Date from" name="date_from" method="datepicker" />
        <CustomInput label="Date to" name="date_to" method="datepicker" />
      </Grid>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <AgGrid
          rowData={jobWorksheets}
          columnDefs={colDefs}
          tableKey="job-worksheet"
          gridOptions={{ getRowId: (params) => params.data?.id }}
        />
      )}
    </>
  );
}

function JobWorksheetIndex() {
  const router = useRouter();
  const { peopleList } = usePeople();

  const supplierOptions = useMemo(
    () => [
      { id: "", value: "All suppliers" },
      ...peopleList.map((p) => ({
        id: p.person_id,
        value: p.name || `#${p.person_id}`,
      })),
    ],
    [peopleList]
  );

  return (
    <GlobalWrapper title="Job Worksheet" permissionKey="view_job_worksheet">
      <CustomContainer
        title="Job Worksheet"
        filledHeader
        rightSection={
          <Button
            colorScheme="purple"
            size="sm"
            onClick={() => router.push("/purchase/job-worksheet/create")}
          >
            Create
          </Button>
        }
      >
        <Formik initialValues={initialFilterValues} onSubmit={() => {}}>
          <JobWorksheetFiltersAndGrid supplierOptions={supplierOptions} />
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default JobWorksheetIndex;
