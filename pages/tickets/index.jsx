import React, { useMemo } from "react";
import AgGrid from "../../components/AgGrid";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { useTickets } from "../../customHooks/useTickets";
import Badge from "../../components/Badge";
import { Flex } from "@chakra-ui/react";
import CustomMenu from "../../components/CustomMenu";
import { useRouter } from "next/router";

export const colDefs = (router) => [
  {
    field: "id",
    headerName: "ID",
    type: "id",
  },
  {
    field: "title",
    headerName: "Title",
    type: "capitalized",
  },
  {
    field: "outlet_name",
    headerName: "Outlet",
    type: "capitalized",
  },
  {
    field: "assigned_to_name",
    headerName: "Assigned To",
    type: "capitalized",
  },
  {
    field: "created_by_name",
    headerName: "Created By",
    type: "capitalized",
  },
  {
    field: "priority",
    headerName: "Priority",
    cellRenderer: (props) => {
      let style = {
        colorScheme: "gray",
        label: "None",
      };

      if (props.value === "high") {
        style.colorScheme = "red";
        style.label = "High";
      } else if (props.value === "medium") {
        style.colorScheme = "orange";
        style.label = "Medium";
      } else if (props.value === "low") {
        style.colorScheme = "blue";
        style.label = "Low";
      } else if (props.value === "urgent") {
        style.colorScheme = "red";
        style.label = "Urgent❗";
      }

      return (
        <Flex size="md" alignItems="center" h="100%">
          <Badge colorScheme={style.colorScheme}>{style.label}</Badge>
        </Flex>
      );
    },
  },
  {
    field: "status",
    headerName: "Status",
    cellRenderer: (props) => {
      let style = {
        colorScheme: "gray",
        label: "None",
      };

      if (props.value === "closed") {
        style.colorScheme = "gray";
        style.label = "Closed";
      } else if (props.value === "in_progress") {
        style.colorScheme = "blue";
        style.label = "In Progress";
      } else if (props.value === "open") {
        style.colorScheme = "orange";
        style.label = "Open";
      }

      return (
        <Flex alignItems="center" h="100%">
          <Badge size="md" colorScheme={style.colorScheme}>
            {style.label}
          </Badge>
        </Flex>
      );
    },
  },
  {
    field: "id",
    headerName: "Action",
    cellRenderer: (props) => (
      <Flex justifyContent="center" alignItems="center" height={"100%"}>
        <CustomMenu
          items={[
            {
              label: "View",
              onClick: () => router.push(`/tickets/view?id=${props.value}`),
            },
            {
              label: "Edit",
              onClick: () => router.push(`/tickets/edit?id=${props.value}`),
            },
          ]}
        />
      </Flex>
    ),
  },
];

function Tickets() {
  const router = useRouter();
  const filters = useMemo(() => {
    return {
      offset: 0,
      limit: 10000,
    };
  }, []);
  const { tickets } = useTickets(filters);

  return (
    <GlobalWrapper title="Tickets">
      <CustomContainer title="Tickets" filledHeader>
        <AgGrid rowData={tickets} columnDefs={colDefs(router)} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Tickets;
