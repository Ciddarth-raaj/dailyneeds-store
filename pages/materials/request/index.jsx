import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import { Menu, MenuItem } from "@szhsin/react-menu";
import Table from "../../../components/table/table";
import useMaterialRequests from "../../../customHooks/useMaterialRequests";
import EmptyData from "../../../components/EmptyData";
import { Badge } from "@chakra-ui/react";

function MaterialsRequestPage() {
  const { loading, error, requests } = useMaterialRequests();

  const heading = {
    material_request_id: "ID",
    creator_name: "Creator Name",
    outlet_name: "Outlet Name",
    items_count: "Items Count",
    approved: "Approval Status",
    actions: "Actions",
  };

  // Prepare rows for the table
  const rows = (requests || []).map((req) => ({
    material_request_id: req.material_request_id,
    creator_name: req.creator_data?.employee_name || "-",
    outlet_name: req.outlet?.outlet_name || "-",
    created_at: req.created_at
      ? new Date(req.created_at).toLocaleString()
      : "-",
    updated_at: req.updated_at
      ? new Date(req.updated_at).toLocaleString()
      : "-",
    items_count: req.items.length,
    approved: req.is_approved ? (
      <Badge colorScheme="green">Approved</Badge>
    ) : (
      <Badge>Pending</Badge>
    ),
    actions: (
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
          href={`/materials/request/view?id=${req.material_request_id}`}
          passHref
        >
          <MenuItem>View</MenuItem>
        </Link>
      </Menu>
    ),
  }));

  return (
    <GlobalWrapper title="Materials Request">
      <CustomContainer
        title="Materials Request"
        filledHeader
        rightSection={
          <Link href="/materials/request/add" passHref>
            <Button colorScheme="purple" size="sm">
              Add
            </Button>
          </Link>
        }
      >
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : rows.length > 0 ? (
          <Table variant="plain" heading={heading} rows={rows} />
        ) : (
          <EmptyData />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsRequestPage;
