import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button, IconButton } from "@chakra-ui/button";
import Link from "next/link";
import Table from "../../../components/table/table";
import useDigitalPayments from "../../../customHooks/useDigitalPayments";
import { Menu, MenuItem } from "@szhsin/react-menu";

const HEADINGS = {
  s_no: "Serial No.",
  outlet_name: "Outlet",
  action: "Action",
};

function DigitalPayments() {
  const { data } = useDigitalPayments();

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
        <MenuItem>View</MenuItem>
        <MenuItem>Edit</MenuItem>
        <MenuItem>Delete</MenuItem>
      </Menu>
    ),
  }));

  return (
    <GlobalWrapper>
      <CustomContainer
        title="Digital Payments"
        filledHeader
        rightSection={
          <Link href={`/reconciliation/digital-payments/create`} passHref>
            <Button colorScheme="whiteAlpha">Add</Button>
          </Link>
        }
      >
        <Table heading={HEADINGS} rows={rows} variant="plain" />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DigitalPayments;
