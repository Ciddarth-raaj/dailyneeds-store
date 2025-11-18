import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import EmptyData from "../../../components/EmptyData";
import Table from "../../../components/table/table";
import usePermissions from "../../../customHooks/usePermissions";
import { Badge } from "@chakra-ui/react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import currencyFormatter from "../../../util/currencyFormatter";

const HEADINGS = {
  purchase_order_number: "Purchase Order Number",
  supplier_name: "Supplier Name",
  amount: "Amount",
  status: "Status",
  actions: "Actions",
};

const actions = ({ canView = true, canEdit = true, canDelete = true }) => (
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
    {canView && <MenuItem>View</MenuItem>}
    {canEdit && <MenuItem>Edit</MenuItem>}
    {canDelete && <MenuItem>Delete</MenuItem>}
  </Menu>
);

const rows = [
  {
    purchase_order_number: "PO-10293487",
    supplier_name: "Sharma Logistics",
    amount: currencyFormatter(5320),
    status: <Badge colorScheme="gray">Submitted</Badge>,
    actions: actions({ canView: true, canEdit: true, canDelete: true }),
  },
  {
    purchase_order_number: "PO-92837465",
    supplier_name: "Vikram Transport",
    amount: currencyFormatter(7650),
    status: <Badge colorScheme="green">Verified</Badge>,
    actions: actions({ canView: true, canEdit: false, canDelete: false }),
  },
  {
    purchase_order_number: "PO-18273645",
    supplier_name: "Om Freight Ltd",
    amount: currencyFormatter(4200),
    status: <Badge colorScheme="red">on Hold</Badge>,
    actions: actions({ canView: true, canEdit: true, canDelete: true }),
  },
  {
    purchase_order_number: "PO-30294857",
    supplier_name: "DHL Supplying",
    amount: currencyFormatter(8990),
    status: <Badge colorScheme="green">Approved</Badge>,
    actions: actions({ canView: true, canEdit: false, canDelete: false }),
  },
  {
    purchase_order_number: "PO-45673829",
    supplier_name: "Express Carriers",
    amount: currencyFormatter(6210),
    status: <Badge colorScheme="red">Rejected</Badge>,
    actions: actions({ canView: true, canEdit: true, canDelete: true }),
  },
  {
    purchase_order_number: "PO-57384920",
    supplier_name: "Eastern Cargo",
    amount: currencyFormatter(7800),
    status: <Badge colorScheme="purple">Paid</Badge>,
    actions: actions({ canView: true, canEdit: false, canDelete: false }),
  },
];

function AdvanceRequest() {
  const canCreateAdvanceRequest = usePermissions(["create_advance_request"]);

  return (
    <GlobalWrapper title="Advance Request">
      <CustomContainer
        title="Advance Request"
        filledHeader
        rightSection={
          canCreateAdvanceRequest ? (
            <Link href="/lr-workflow/advance-request/create" passHref>
              <Button colorScheme="purple">Add</Button>
            </Link>
          ) : null
        }
      >
        {rows.length === 0 && <EmptyData message="No categories found" />}
        {rows.length > 0 && (
          <Table variant="plain" heading={HEADINGS} rows={rows} size="sm" />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AdvanceRequest;
