import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Flex, Grid, Spinner, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import LrFollowupCard from "../../components/lrFollowup/LrFollowupCard";
import currencyFormatter from "../../util/currencyFormatter";
import { getCreditPurchase, unwrap } from "../../helper/lrFollowup";
import { formatDate, formatDateTime, transporterLabel } from "../../util/lrFollowup";

/**
 * One credit purchase, read-only, with its LR Follow-up card. The follow-up
 * was opened when the purchase was saved; there is no button here to create
 * another. Dispatch details are kept current on the follow-up.
 */
function CreditPurchaseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [purchase, setPurchase] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    getCreditPurchase(id)
      .then((body) => setPurchase(unwrap(body)))
      .catch((err) => setError(err.message));
  }, [id]);

  const title = purchase ? `Credit Purchase CP-${purchase.credit_purchase_id}` : "Credit Purchase";

  return (
    <GlobalWrapper title={title} permissionKey={["view_credit_purchase"]}>
      <CustomContainer title={title} filledHeader>
        {!purchase && !error && (
          <Flex justify="center" py="40px">
            <Spinner />
          </Flex>
        )}
        {error && (
          <Text color="gray.600" py="30px" textAlign="center">
            {error}
          </Text>
        )}
        {purchase && (
          <Flex direction="column" gap="18px">
            <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap="14px">
              <Info label="Supplier" value={purchase.supplier_name || purchase.distributor_code} />
              <Info label="Bill / Invoice Reference" value={purchase.bill_reference} />
              <Info label="Amount" value={currencyFormatter(purchase.amount)} />
              <Info label="Bill / Invoice Date" value={formatDate(purchase.bill_date)} />
              <Info label="Receiving Outlet / Location" value={purchase.outlet_name || "-"} />
              <Info label="Transporter (at entry)" value={transporterLabel(purchase)} />
              <Info label="LR No. (at entry)" value={purchase.lr_no || "-"} />
              <Info label="Dispatch Date (at entry)" value={formatDate(purchase.dispatch_date)} />
              <Info label="Expected Delivery (at entry)" value={formatDate(purchase.expected_delivery_date)} />
              <Info label="Remarks" value={purchase.remarks || "-"} />
              <Info label="Created By" value={purchase.created_by_name || "-"} />
              <Info label="Created At" value={formatDateTime(purchase.created_at)} />
            </Grid>
            <LrFollowupCard sourceType="CREDIT_PURCHASE" sourceId={purchase.credit_purchase_id} />
          </Flex>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

function Info({ label, value }) {
  return (
    <Flex direction="column" gap="2px">
      <Text fontSize="xs" color="gray.500">
        {label}
      </Text>
      <Text fontSize="sm" as="div" wordBreak="break-word">
        {value}
      </Text>
    </Flex>
  );
}

export default CreditPurchaseDetail;
