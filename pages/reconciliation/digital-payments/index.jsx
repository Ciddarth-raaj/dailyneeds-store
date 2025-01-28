import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button, IconButton } from "@chakra-ui/button";
import Link from "next/link";
import Table from "../../../components/table/table";
import useDigitalPayments from "../../../customHooks/useDigitalPayments";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { Flex } from "@chakra-ui/react";
import EmptyData from "../../../components/EmptyData";

const HEADINGS = {
  s_no: "Serial No.",
  outlet_name: "Outlet",
  action: "Action",
};

function DigitalPayments() {
  const { data, handleExportData } = useDigitalPayments();

  const rows = data.map((item) => ({
    ...item,
    action: (
      <Menu
        align="end"
        gap={5}
        menuButton={
          <IconButton
            variant="ghost"
            colorScheme="purple"
            icon={<i className={`fa fa-ellipsis-v`} />}
          />
        }
        transition
      >
        <Link
          href={`/reconciliation/digital-payments/view?id=${item.digital_payment_id}`}
          passHref
        >
          <MenuItem>View</MenuItem>
        </Link>
        <Link
          href={`/reconciliation/digital-payments/edit?id=${item.digital_payment_id}`}
          passHref
        >
          <MenuItem>Edit</MenuItem>
        </Link>
        {/* <MenuItem>Delete</MenuItem> */}
      </Menu>
    ),
  }));

  return (
    <GlobalWrapper>
      <CustomContainer
        title="Digital Payments"
        filledHeader
        rightSection={
          <Flex gap="12px">
            <Button
              colorScheme="whiteAlpha"
              onClick={handleExportData}
              disabled={rows.length === 0}
            >
              Export
            </Button>

            <Link href={`/reconciliation/digital-payments/create`} passHref>
              <Button colorScheme="whiteAlpha">Add</Button>
            </Link>
          </Flex>
        }
      >
        {rows.length === 0 ? (
          <EmptyData />
        ) : (
          <Table heading={HEADINGS} rows={rows} variant="plain" />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DigitalPayments;
