import React, { useCallback, useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import usePeople from "../../customHooks/usePeople";
import { Button } from "@chakra-ui/button";
import Link from "next/link";
import { getPersonType } from "../../constants/values";
import toast from "react-hot-toast";

function Master() {
  const { peopleList, refetch, updatePerson } = usePeople();

  const handleMakeInactive = useCallback(
    (person) => {
      toast.promise(updatePerson(person), {
        loading: "Updating person",
        success: (res) => {
          if (res.code == 200) {
            refetch();
            return "Person updated successfully";
          } else {
            throw res;
          }
        },
        error: "Failed to update person",
      });
    },
    [updatePerson, refetch]
  );

  const colDefs = useMemo(
    () => [
      { field: "person_id", headerName: "ID", type: "id" },
      { field: "name", headerName: "Name", flex: 1 },
      { field: "primary_phone", headerName: "Primary Contact" },
      {
        field: "type",
        headerName: "Type",
        valueGetter: (params) => getPersonType(params.data?.person_type),
      },
      {
        field: "status",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.status == 1
            ? { label: "Active", colorScheme: "green" }
            : { label: "Inactive", colorScheme: "red" },
      },
      {
        field: "actions",
        type: "action-icons",
        headerName: "Actions",
        valueGetter: (params) => {
          const row = params.data;
          const id = row?.person_id;
          return [
            {
              label: "View",
              iconType: "view",
              redirectionUrl: `/master/view?id=${id}`,
            },
            {
              label: "Edit",
              iconType: "edit",
              redirectionUrl: `/master/edit?id=${id}`,
            },
            {
              label: row?.status == 1 ? "Make Inactive" : "Make Active",
              icon:
                row?.status == 1
                  ? "fa-solid fa-toggle-off"
                  : "fa-solid fa-toggle-on",
              colorScheme: row?.status == 1 ? "red" : "green",
              onClick: () => handleMakeInactive(row),
            },
          ];
        },
      },
    ],
    [handleMakeInactive]
  );

  return (
    <GlobalWrapper title="Master List">
      <CustomContainer
        title="Master List"
        filledHeader
        rightSection={
          <Link href="/master/create" passHref>
            <Button size="sm" colorScheme="purple">
              Add
            </Button>
          </Link>
        }
      >
        <AgGrid
          rowData={peopleList}
          columnDefs={colDefs}
          tableKey="master-list"
          gridOptions={{
            getRowId: (params) => String(params.data?.person_id ?? ""),
          }}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Master;
