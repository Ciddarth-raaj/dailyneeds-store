import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, IconButton } from "@chakra-ui/button";
import { Badge, Flex, Spinner, Select } from "@chakra-ui/react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import EmptyData from "../../../components/EmptyData";
import Table from "../../../components/table/table";
import usePermissions from "../../../customHooks/usePermissions";
import useAdvanceRequests from "../../../customHooks/useAdvanceRequests";
import currencyFormatter from "../../../util/currencyFormatter";
import moment from "moment";
import {
  STATUS_META,
  getStatusMeta,
  isEditableStatus,
} from "../../../constants/advanceRequest";

const HEADINGS = {
  purchase_order_number: "Purchase Order Number",
  supplier_name: "Supplier Name",
  amount: "Amount",
  created_at: "Raised On",
  status: "Status",
  actions: "Actions",
};

function AdvanceRequest() {
  const router = useRouter();
  const [status, setStatus] = useState("");

  const canCreateAdvanceRequest = usePermissions(["create_advance_request"]);
  const canEditAdvanceRequest = usePermissions(["edit_advance_request"]);

  // Memoised because the fetching hook takes this as its effect dependency.
  const filters = useMemo(() => ({ status, limit: 200 }), [status]);
  const { requests, loading, error, refetch } = useAdvanceRequests(filters);

  const rows = useMemo(
    () =>
      requests.map((request) => {
        const meta = getStatusMeta(request.status);
        // An approved request has been paid a specific amount; before that
        // the only figure that exists is the one asked for.
        const settled =
          request.paid_amount !== null && request.paid_amount !== undefined;

        return {
          purchase_order_number: request.purchase_order_number,
          supplier_name: request.supplier_name || "-",
          amount: settled
            ? `${currencyFormatter(request.paid_amount)} paid`
            : currencyFormatter(request.amount),
          created_at: request.created_at
            ? moment(request.created_at).format("DD/MM/YYYY")
            : "-",
          status: <Badge colorScheme={meta.colorScheme}>{meta.label}</Badge>,
          actions: (
            <Menu
              align="end"
              gap={5}
              menuButton={
                <IconButton
                  variant="ghost"
                  colorScheme="purple"
                  icon={<i className="fa fa-ellipsis-v" />}
                />
              }
              transition
            >
              <MenuItem
                onClick={() =>
                  router.push(
                    `/lr-workflow/advance-request/view/${request.advance_request_id}`
                  )
                }
              >
                View
              </MenuItem>
              {canEditAdvanceRequest && isEditableStatus(request.status) && (
                <MenuItem
                  onClick={() =>
                    router.push(
                      `/lr-workflow/advance-request/edit/${request.advance_request_id}`
                    )
                  }
                >
                  Edit
                </MenuItem>
              )}
            </Menu>
          ),
        };
      }),
    [requests, router, canEditAdvanceRequest]
  );

  return (
    <GlobalWrapper title="Advance Request">
      <CustomContainer
        title="Advance Request"
        filledHeader
        rightSection={
          <Flex gap="10px" alignItems="center">
            <Select
              size="sm"
              bg="white"
              color="black"
              borderRadius="6px"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              width="160px"
            >
              <option value="">All statuses</option>
              {Object.keys(STATUS_META).map((key) => (
                <option key={key} value={key}>
                  {STATUS_META[key].label}
                </option>
              ))}
            </Select>

            {canCreateAdvanceRequest && (
              <Link href="/lr-workflow/advance-request/create" passHref>
                <Button colorScheme="purple" size="sm">
                  Add
                </Button>
              </Link>
            )}
          </Flex>
        }
      >
        {loading && (
          <Flex justify="center" py="40px">
            <Spinner colorScheme="purple" />
          </Flex>
        )}

        {!loading && error && (
          <Flex direction="column" align="center" gap="12px" py="30px">
            <EmptyData message="Could not load advance requests" />
            <Button size="sm" onClick={refetch}>
              Retry
            </Button>
          </Flex>
        )}

        {!loading && !error && rows.length === 0 && (
          <EmptyData message="No advance requests found" />
        )}

        {!loading && !error && rows.length > 0 && (
          <Table
            variant="plain"
            heading={HEADINGS}
            rows={rows}
            size="sm"
            showPagination
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AdvanceRequest;
