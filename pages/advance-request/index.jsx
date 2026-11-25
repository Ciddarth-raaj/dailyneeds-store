import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, IconButton } from "@chakra-ui/button";
import {
  Badge,
  Box,
  Flex,
  Spinner,
  Select,
  Text,
  useBreakpointValue,
  useToast,
} from "@chakra-ui/react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import EmptyData from "../../components/EmptyData";
import Table from "../../components/table/table";
import usePermissions from "../../customHooks/usePermissions";
import useAdvanceRequests from "../../customHooks/useAdvanceRequests";
import { sendPendingToTelegram } from "../../helper/advanceRequest";
import currencyFormatter from "../../util/currencyFormatter";
import moment from "moment";
import {
  BALANCE_ACTION_LABEL,
  STATUS_META,
  getStatusMeta,
  isEditableStatus,
} from "../../constants/advanceRequest";

// Mirrors the advance payment request note the team already sends, so the
// listing reads the same way as the message.
const HEADINGS = {
  supplier_name: "Supplier Name",
  invoice_number: "Invoice No.",
  amount: "Amount",
  balance_action: "Balance",
  created_at: "Date Requested",
  created_by_name: "Requested By",
  attachment: "Attachment",
  status: "Status",
  actions: "Actions",
};

function CardField({ label, value }) {
  return (
    <Box minW={0}>
      <Text fontSize="11px" color="gray.500">
        {label}
      </Text>
      <Text fontSize="13px" color="gray.800" noOfLines={2}>
        {value}
      </Text>
    </Box>
  );
}

function AdvanceRequestCard({ row, onOpen }) {
  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="8px"
      bg="white"
      p="12px"
      cursor="pointer"
      onClick={onOpen}
    >
      <Flex justify="space-between" align="flex-start" gap="8px">
        <Box minW={0} flex={1}>
          <Text fontWeight="600" fontSize="14px" noOfLines={2}>
            {row.supplier_name}
          </Text>
          <Text fontSize="12px" color="gray.600">
            {row.invoice_number}
          </Text>
        </Box>
        {/* Keep menu taps from also opening the request. */}
        <Box onClick={(event) => event.stopPropagation()} flexShrink={0}>
          {row.actions}
        </Box>
      </Flex>

      <Flex justify="space-between" align="center" mt="8px" gap="8px">
        <Text fontWeight="700" fontSize="16px" color="purple.600">
          {row.amount}
        </Text>
        {row.status}
      </Flex>

      <Box
        display="grid"
        gridTemplateColumns="1fr 1fr"
        gap="8px"
        mt="10px"
        pt="10px"
        borderTop="1px solid"
        borderColor="gray.100"
      >
        <CardField label="Date Requested" value={row.created_at} />
        <CardField label="Requested By" value={row.created_by_name} />
        <CardField label="Balance" value={row.balance_action} />
        <CardField label="Attachment" value={row.attachment} />
      </Box>
    </Box>
  );
}

function AdvanceRequest() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  // Nine columns cannot fit a phone screen, so phones get a card per request.
  const isMobile = useBreakpointValue({ base: true, md: false });

  const canCreateAdvanceRequest = usePermissions(["create_advance_request"]);
  const canEditAdvanceRequest = usePermissions(["edit_advance_request"]);
  const canApproveAdvanceRequest = usePermissions(["approve_advance_request"]);
  const toast = useToast();
  const [sendingToTelegram, setSendingToTelegram] = useState(false);

  // Requests that reached the admin before the Telegram card existed (or
  // whose card has scrolled away) get one posted on demand.
  const handleSendPending = async () => {
    setSendingToTelegram(true);
    try {
      const data = await sendPendingToTelegram();
      if (data && data.code) throw new Error(data.msg);
      toast({
        status: "success",
        title:
          data.requests === 0
            ? "Nothing is waiting for approval"
            : `Sent ${data.sent} of ${data.requests} to Telegram`,
      });
    } catch (err) {
      toast({
        status: "error",
        title:
          (err && err.response && err.response.data && err.response.data.msg) ||
          (err && err.message) ||
          "Could not send to Telegram",
      });
    } finally {
      setSendingToTelegram(false);
    }
  };

  // Memoised because the fetching hook takes this as its effect dependency.
  const filters = useMemo(() => ({ status, limit: 200 }), [status]);
  const { requests, loading, error, refetch } = useAdvanceRequests(filters);

  const renderActions = (request) => (
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
          router.push(`/advance-request/view/${request.advance_request_id}`)
        }
      >
        View
      </MenuItem>
      {canEditAdvanceRequest && isEditableStatus(request.status) && (
        <MenuItem
          onClick={() =>
            router.push(`/advance-request/edit/${request.advance_request_id}`)
          }
        >
          Edit
        </MenuItem>
      )}
    </Menu>
  );

  const rows = useMemo(
    () =>
      requests.map((request) => {
        const meta = getStatusMeta(request.status);

        return {
          request,
          supplier_name: request.supplier_name || "-",
          invoice_number: request.invoice_number || "-",
          amount: currencyFormatter(request.amount),
          balance_action: request.balance_action
            ? BALANCE_ACTION_LABEL[request.balance_action] ||
              request.balance_action
            : "-",
          created_at: request.created_at
            ? moment(request.created_at).format("DD-MM-YYYY")
            : "-",
          created_by_name: request.created_by_name || "-",
          attachment: Number(request.document_count) > 0 ? "Yes" : "No",
          status: <Badge colorScheme={meta.colorScheme}>{meta.label}</Badge>,
          actions: renderActions(request),
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
              width={{ base: "130px", md: "160px" }}
            >
              <option value="">All statuses</option>
              {Object.keys(STATUS_META).map((key) => (
                <option key={key} value={key}>
                  {STATUS_META[key].label}
                </option>
              ))}
            </Select>

            {canCreateAdvanceRequest && (
              <Link href="/advance-request/create" passHref>
                <Button colorScheme="purple" size="sm">
                  Add
                </Button>
              </Link>
            )}
          </Flex>
        }
      >
        {canApproveAdvanceRequest && (
          <Flex justify="flex-end" mb="12px">
            <Button
              size="sm"
              variant="outline"
              colorScheme="purple"
              leftIcon={<i className="fa fa-paper-plane" />}
              isLoading={sendingToTelegram}
              onClick={handleSendPending}
            >
              Send pending to Telegram
            </Button>
          </Flex>
        )}

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

        {!loading && !error && rows.length > 0 && isMobile && (
          <Flex direction="column" gap="10px">
            {rows.map((row) => (
              <AdvanceRequestCard
                key={row.request.advance_request_id}
                row={row}
                onOpen={() =>
                  router.push(
                    `/advance-request/view/${row.request.advance_request_id}`
                  )
                }
              />
            ))}
          </Flex>
        )}

        {!loading && !error && rows.length > 0 && !isMobile && (
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
