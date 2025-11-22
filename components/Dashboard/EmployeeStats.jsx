import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Input,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useRef } from "react";
import Badge from "../Badge";
import { capitalize } from "../../util/string";
import { OverallStatsCard } from "../../pages";
import CustomContainer from "../CustomContainer";
import AgGrid from "../AgGrid";
import currencyFormatter from "../../util/currencyFormatter";
import moment from "moment";

function EmployeeStats({ data }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef();

  const {
    cashier_name,
    has_highest_total_sales,
    has_highest_no_of_bills,
    accountsList,
  } = data;

  const colDefs = [
    {
      field: "date",
      headerName: "Date",
      resizable: true,
      cellRenderer: (props) => props.value.format("DD/MM/YY"),
      valueGetter: (props) => moment(props.data.date),
    },
    {
      field: "card_sales",
      headerName: "Card",
      resizable: true,
      cellRenderer: (props) => currencyFormatter(props.value),
    },
    {
      field: "total_sales",
      headerName: "Total",
      resizable: true,
      cellRenderer: (props) => currencyFormatter(props.value),
    },
    {
      field: "no_of_bills",
      headerName: "No of Bills",
      resizable: true,
      cellRenderer: (props) => props.value ?? "-",
    },
  ];

  return (
    <>
      <Button
        ref={btnRef}
        colorScheme="purple"
        onClick={onOpen}
        variant="ghost"
        size="xs"
        w="100%"
      >
        View Stats
      </Button>
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={btnRef}
        size="lg"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <Flex alignItems="center" gap="10px">
              <Text color="purple.700" fontSize="lg">
                {capitalize(cashier_name)}
              </Text>
              {has_highest_total_sales && (
                <Badge colorScheme="green">Highest Sales</Badge>
              )}
              {has_highest_no_of_bills && (
                <Badge colorScheme="blue">Highest Bills</Badge>
              )}
            </Flex>
          </DrawerHeader>

          <DrawerBody>
            <Flex flexDirection="column" gap="22px">
              {OverallStatsCard(data, "Statistics", "purple", "xs")}

              <CustomContainer
                title="All Records"
                size="xs"
                filledHeader
                smallHeader
              >
                <AgGrid rowData={accountsList} colDefs={colDefs} />
              </CustomContainer>
            </Flex>
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default EmployeeStats;
