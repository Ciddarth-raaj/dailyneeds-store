import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, IconButton } from "@chakra-ui/button";
import Table from "../../components/table/table";
import useEBConsumptions from "../../customHooks/useEBConsumptions";
import moment from "moment";
import Link from "next/link";
import { Menu, MenuItem } from "@szhsin/react-menu";
import AgGrid from "../../components/AgGrid";
import { Flex } from "@chakra-ui/react";
import CustomMenu from "../../components/CustomMenu";
import { useRouter } from "next/router";

function EBConsumption() {
  const router = useRouter();
  const { ebConsumptions, handleDelete } = useEBConsumptions();

  const getLastEBConsumption = ({ date, branch_id, machine_number }) => {
    if (date && branch_id && machine_number) {
      const filteredList = ebConsumptions
        .filter(
          (item) =>
            item.branch_id == branch_id &&
            item.machine_number == machine_number &&
            moment(item.date).isBefore(date, "day")
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const lastEBConsumption = filteredList[filteredList.length - 1];

      if (lastEBConsumption) {
        return {
          closing_units: lastEBConsumption.closing_units,
          opening_units: lastEBConsumption.opening_units,
        };
      }
      return { closing_units: 0, opening_units: 0 };
    }

    return { closing_units: 0, opening_units: 0 };
  };

  const modifiedEbConsumptions = ebConsumptions.map((ebConsumption) => {
    const previousItem = getLastEBConsumption({
      date: ebConsumption.date,
      branch_id: ebConsumption.branch_id,
      machine_number: ebConsumption.machine_number,
    });

    const nightConsumption =
      ebConsumption.opening_units - previousItem.closing_units;
    const dayConsumption =
      ebConsumption.closing_units - ebConsumption.opening_units;

    return {
      ...ebConsumption,
      date: moment(ebConsumption.date).format("DD/MM/YYYY"),
      night_consumption: nightConsumption,
      day_consumption: dayConsumption,
    };
  });

  const colDefs = [
    {
      field: "consumption_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "outlet_name",
      headerName: "Outlet",
      type: "capitalized",
    },
    {
      field: "machine_number",
      headerName: "Machine",
      type: "capitalized",
      rowGroup: true,
      valueGetter: (params) => {
        return params.data.machine_number
          ? `${params.data.machine_number} ${
              params.data.machine_nickname
                ? `- ${params.data.machine_nickname}`
                : ""
            }`
          : "-";
      },
    },
    {
      field: "date",
      headerName: "Date",
    },
    {
      field: "opening_units",
      headerName: "Opening Units",
      cellRenderer: (props) => `${props.value} units`,
    },
    {
      field: "closing_units",
      headerName: "Closing Units",
      cellRenderer: (props) => `${props.value} units`,
    },
    {
      field: "night_consumption",
      headerName: "Night Consumption",
      cellRenderer: (props) => `${props.value} units`,
    },
    {
      field: "day_consumption",
      headerName: "Day Consumption",
      cellRenderer: (props) => `${props.value} units`,
    },
    {
      field: "consumption_id",
      headerName: "Action",
      type: "action-column",
      cellRenderer: (props) => (
        <Flex justifyContent="center" alignItems="center" height={"100%"}>
          <CustomMenu
            items={[
              {
                label: "View",
                onClick: () =>
                  router.push(`/eb-consumption/view?id=${props.value}`),
              },
              {
                label: "Edit",
                onClick: () =>
                  router.push(`/eb-consumption/edit?id=${props.value}`),
              },
            ]}
          />
        </Flex>
      ),
    },
  ];

  return (
    <GlobalWrapper title="EB Consumption">
      <CustomContainer
        title="EB Consumption"
        filledHeader
        rightSection={
          <Link href="/eb-consumption/create" passHref>
            <Button colorScheme="purple" variant="new-outline">
              Add
            </Button>
          </Link>
        }
      >
        <AgGrid rowData={modifiedEbConsumptions} columnDefs={colDefs} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EBConsumption;
