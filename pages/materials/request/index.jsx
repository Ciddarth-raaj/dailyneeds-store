import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import { Menu, MenuItem } from "@szhsin/react-menu";
import Table from "../../../components/table/table";
import useMaterialRequests from "../../../customHooks/useMaterialRequests";
import EmptyData from "../../../components/EmptyData";
import { Badge, Flex, Select } from "@chakra-ui/react";
import moment from "moment";

const HEADINGS = {
  material_request_id: "ID",
  creator_name: "Creator Name",
  outlet_name: "Outlet Name",
  created_at: "Raised On",
  items_count: "Items Count",
  approved: "Approval Status",
  actions: "Actions",
};

const STATUS_FILTERS = {
  pending: "Pending",
  approved: "Approved",
  "": "All",
};

function MaterialsRequestPage() {
  const { loading, error, requests } = useMaterialRequests();
  // Pending is what needs acting on, so that is what the page opens with.
  const [status, setStatus] = useState("pending");

  const visibleRequests = useMemo(() => {
    const filtered = (requests || []).filter((req) => {
      if (status === "pending") return !req.is_approved;
      if (status === "approved") return !!req.is_approved;
      return true;
    });

    // Newest request first, so the freshest ask is at the top of the list.
    return filtered.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [requests, status]);

  const rows = useMemo(
    () =>
      visibleRequests.map((req) => ({
        material_request_id: req.material_request_id,
        creator_name: req.creator_data?.employee_name || "-",
        outlet_name: req.outlet?.outlet_name || "-",
        created_at: req.created_at
          ? moment(req.created_at).format("DD/MM/YYYY hh:mm A")
          : "-",
        updated_at: req.updated_at
          ? moment(req.updated_at).format("DD/MM/YYYY hh:mm A")
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
      })),
    [visibleRequests]
  );

  return (
    <GlobalWrapper title="Materials Request">
      <CustomContainer
        title="Materials Request"
        filledHeader
        rightSection={
          <Flex gap="10px" alignItems="center">
            <Select
              size="sm"
              bg="white"
              color="black"
              borderRadius="6px"
              width="140px"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {Object.keys(STATUS_FILTERS).map((key) => (
                <option key={key} value={key}>
                  {STATUS_FILTERS[key]}
                </option>
              ))}
            </Select>

            <Link href="/materials/request/add" passHref>
              <Button colorScheme="purple" size="sm">
                Add
              </Button>
            </Link>
          </Flex>
        }
      >
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : rows.length > 0 ? (
          <Table variant="plain" heading={HEADINGS} rows={rows} />
        ) : (
          <EmptyData
            message={
              status === "pending"
                ? "No pending material requests"
                : "No material requests found"
            }
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsRequestPage;
