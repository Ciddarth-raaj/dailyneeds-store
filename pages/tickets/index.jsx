import React, { useMemo } from "react";
import AgGrid from "../../components/AgGrid";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { useTickets } from "../../customHooks/useTickets";
import Badge from "../../components/Badge";
import { Button, Flex } from "@chakra-ui/react";
import CustomMenu from "../../components/CustomMenu";
import { useRouter } from "next/router";

export const statusRenderer = (value) => {
  let style = {
    colorScheme: "gray",
    label: "None",
  };

  if (value === "closed") {
    style.colorScheme = "gray";
    style.label = "Closed";
  } else if (value === "in_progress") {
    style.colorScheme = "blue";
    style.label = "In Progress";
  } else if (value === "open") {
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
};

export const priorityRenderer = (value) => {
  let style = {
    colorScheme: "gray",
    label: "None",
  };

  if (value === "high") {
    style.colorScheme = "red";
    style.label = "High";
  } else if (value === "medium") {
    style.colorScheme = "orange";
    style.label = "Medium";
  } else if (value === "low") {
    style.colorScheme = "blue";
    style.label = "Low";
  } else if (value === "urgent") {
    style.colorScheme = "red";
    style.label = "Urgent❗";
  }

  return (
    <Flex size="md" alignItems="center" h="100%">
      <Badge colorScheme={style.colorScheme}>{style.label}</Badge>
    </Flex>
  );
};

export const colDefs = (router, type = "all") => [
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
    field: "department_name",
    headerName: "Department",
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
    cellRenderer: (props) => priorityRenderer(props.value),
  },
  {
    field: "status",
    headerName: "Status",
    cellRenderer: (props) => statusRenderer(props.value),
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
              onClick: () =>
                router.push(
                  `/tickets/view?id=${props.value}${
                    type === "my-tickets" ? "&type=my-tickets" : ""
                  }`
                ),
            },
            {
              label: "Edit",
              onClick: () =>
                router.push(
                  `/tickets/edit?id=${props.value}${
                    type === "my-tickets" ? "&type=my-tickets" : ""
                  }`
                ),
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
    <GlobalWrapper title="Tickets" permissionKey={["view_tickets"]}>
      <CustomContainer
        title="Tickets"
        filledHeader
        rightSection={
          <Button
            colorScheme="purple"
            variant="new-outline"
            onClick={() => router.push("/tickets/create")}
          >
            Add Ticket
          </Button>
        }
      >
        <AgGrid rowData={tickets} columnDefs={colDefs(router)} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Tickets;
