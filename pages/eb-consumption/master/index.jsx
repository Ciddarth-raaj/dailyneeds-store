import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import useEBMaster from "../../../customHooks/useEBMaster";
import moment from "moment";
import Link from "next/link";
import AgGrid from "../../../components/AgGrid";
import { Flex } from "@chakra-ui/react";
import CustomMenu from "../../../components/CustomMenu";
import { useRouter } from "next/router";
import usePermissions from "../../../customHooks/usePermissions";

function EbMachineMaster() {
  const router = useRouter();
  const { ebMasterList, loading } = useEBMaster();
  const canAdd = usePermissions(["add_eb_machine_master"]);

  const colDefs = [
    {
      field: "eb_machine_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "machine_number",
      headerName: "Machine Number",
    },
    {
      field: "nickname",
      headerName: "Nickname",
      type: "capitalized",
    },
    {
      field: "store_name",
      headerName: "Outlet",
      type: "capitalized",
    },
    {
      field: "is_active",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (params) => {
        const isActive = params.data.is_active == 1;
        return {
          colorScheme: isActive ? "green" : "red",
          label: isActive ? "Active" : "Inactive",
        };
      },
    },
    {
      field: "eb_machine_id",
      headerName: "Action",
      type: "action-column",
      cellRenderer: (props) => {
        const items = [
          {
            label: "View",
            onClick: () =>
              router.push(`/eb-consumption/master/view?id=${props.value}`),
          },
        ];

        if (canAdd) {
          items.push({
            label: "Edit",
            onClick: () =>
              router.push(`/eb-consumption/master/edit?id=${props.value}`),
          });
        }

        return (
          <Flex justifyContent="center" alignItems="center" height={"100%"}>
            <CustomMenu items={items} />
          </Flex>
        );
      },
    },
  ];

  return (
    <GlobalWrapper
      title="EB Machine Master"
      permissionKey="view_eb_machine_master"
    >
      <CustomContainer
        title="EB Machine Master"
        filledHeader
        rightSection={
          canAdd ? (
            <Link href="/eb-consumption/master/create" passHref>
              <Button colorScheme="purple" size="sm">
                Add
              </Button>
            </Link>
          ) : null
        }
      >
        <AgGrid rowData={ebMasterList} columnDefs={colDefs} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EbMachineMaster;
