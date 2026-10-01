import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Badge, Box, Button, Flex, Input, Spinner, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import EmptyData from "../../components/EmptyData";
import Table from "../../components/table/table";
import usePermissions from "../../customHooks/usePermissions";
import currencyFormatter from "../../util/currencyFormatter";
import { getCreditPurchases, unwrap } from "../../helper/lrFollowup";
import { PERMISSIONS, formatDate, outcomeMeta, transporterLabel } from "../../util/lrFollowup";

const HEADINGS = {
  ref: "Credit Purchase",
  supplier: "Supplier",
  bill_reference: "Bill / Invoice Reference",
  amount: "Amount",
  bill_date: "Bill / Invoice Date",
  outlet: "Receiving Outlet",
  transporter: "Transporter",
  followup: "LR Follow-up",
  status: "Follow-up Status",
  expected: "Expected Delivery",
  action: "Action",
};

/** Credit purchases, each with the LR Follow-up it opened. */
function CreditPurchases() {
  const router = useRouter();
  const canCreate = usePermissions([PERMISSIONS.CREATE_CREDIT_PURCHASE]);
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(unwrap(await getCreditPurchases({ search, limit: 200 })));
    } catch (err) {
      setError(err.message);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const rows = useMemo(
    () =>
      ((data && data.items) || []).map((cp) => {
        const meta = cp.followup_status
          ? outcomeMeta({ status: cp.followup_status, closure_reason: cp.followup_closure_reason })
          : null;
        return {
          ref: (
            <Link href={`/credit-purchase/${cp.credit_purchase_id}`}>
              <a style={{ color: "#6b46c1", fontWeight: 600 }}>CP-{cp.credit_purchase_id}</a>
            </Link>
          ),
          supplier: cp.supplier_name || cp.distributor_code,
          bill_reference: cp.bill_reference,
          amount: currencyFormatter(cp.amount),
          bill_date: formatDate(cp.bill_date),
          outlet: cp.outlet_name || "-",
          transporter: transporterLabel(cp),
          followup: cp.lr_followup_id ? (
            <Link href={`/lr-followup/${cp.lr_followup_id}`}>
              <a style={{ color: "#6b46c1" }}>LRF-{cp.lr_followup_id}</a>
            </Link>
          ) : (
            <Text as="span" color="red.600" fontSize="sm">
              Missing
            </Text>
          ),
          status: meta ? (
            <Badge colorScheme={meta.colorScheme} whiteSpace="normal" textAlign="center" lineHeight="1.3" py="2px">
              {meta.label}
            </Badge>
          ) : (
            "-"
          ),
          expected: formatDate(cp.followup_expected_delivery_date),
          action: cp.lr_followup_id ? (
            <Button size="xs" variant="outline" colorScheme="purple" onClick={() => router.push(`/lr-followup/${cp.lr_followup_id}`)}>
              View Follow-up
            </Button>
          ) : null,
        };
      }),
    [data, router]
  );

  return (
    <GlobalWrapper title="Credit Purchases" permissionKey={["view_credit_purchase"]}>
      <CustomContainer
        title="Credit Purchases"
        filledHeader
        rightSection={
          <Flex gap="10px">
            <Input
              size="sm"
              bg="white"
              color="black"
              width="220px"
              placeholder="Search bill ref or supplier"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {canCreate && (
              <Link href="/credit-purchase/create" passHref>
                <Button size="sm" colorScheme="purple">
                  Add
                </Button>
              </Link>
            )}
          </Flex>
        }
      >
        {!data && !error && (
          <Flex justify="center" py="40px">
            <Spinner />
          </Flex>
        )}
        {error && <EmptyData message={error} />}
        {data && rows.length === 0 && <EmptyData message="No credit purchases found" />}
        {data && rows.length > 0 && (
          <Box overflowX="auto" sx={{ "& table": { tableLayout: "auto" } }}>
            <Table variant="plain" heading={HEADINGS} rows={rows} size="sm" showPagination />
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default CreditPurchases;
