import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Link from "next/link";
import { Button } from "@chakra-ui/button";
import Table from "../../../components/table/table";
import useMaterialRequests from "../../../customHooks/useMaterialRequests";

function MaterialsRequestPage() {
  const { requests, loading, error } = useMaterialRequests();

  const heading = {
    material_request_id: "ID",
    creator_name: "Creator Name",
    outlet_name: "Outlet Name",
    items_count: "Items Count",
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
  }));

  return (
    <GlobalWrapper title="Materials Request">
      <CustomContainer
        title="Materials Request"
        filledHeader
        rightSection={
          <Link href="/materials/request/add" passHref>
            <Button colorScheme="whiteAlpha">Add</Button>
          </Link>
        }
      >
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : (
          <Table variant="plain" heading={heading} rows={rows} />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsRequestPage;
