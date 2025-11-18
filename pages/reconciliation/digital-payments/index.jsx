import React, { useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button, IconButton } from "@chakra-ui/button";
import Link from "next/link";
import Table from "../../../components/table/table";
import useDigitalPayments from "../../../customHooks/useDigitalPayments";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { Flex, Input } from "@chakra-ui/react";
import EmptyData from "../../../components/EmptyData";

const HEADINGS = {
  s_no: "Serial No.",
  outlet_name: "Outlet",
  bank_mid: "Bank MID",
  bank_tid: "Bank TID",
  payment_mid: "Paytm MID",
  payment_tid: "Paytm TID",
  action: "Action",
};

function DigitalPayments() {
  const [search, setSearch] = useState("");
  const { data, handleExportData } = useDigitalPayments();

  // Filter data based on search input
  const filteredData = data.filter((item) => {
    if (!search.trim()) return true;

    const searchTerm = search.toLowerCase();
    return (
      item.s_no?.toLowerCase().includes(searchTerm) ||
      item.outlet_name?.toLowerCase().includes(searchTerm) ||
      item.bank_mid?.toLowerCase().includes(searchTerm) ||
      item.bank_tid?.toLowerCase().includes(searchTerm) ||
      item.payment_mid?.toLowerCase().includes(searchTerm) ||
      item.payment_tid?.toLowerCase().includes(searchTerm)
    );
  });

  const rows = filteredData.map((item) => ({
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
              colorScheme="purple"
              onClick={handleExportData}
              disabled={rows.length === 0}
            >
              Export
            </Button>

            <Link href={`/reconciliation/digital-payments/create`} passHref>
              <Button colorScheme="purple">Add</Button>
            </Link>
          </Flex>
        }
      >
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          mb="22px"
        />

        {rows.length === 0 ? (
          <EmptyData />
        ) : (
          <Table size="sm" heading={HEADINGS} rows={rows} variant="plain" />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DigitalPayments;
