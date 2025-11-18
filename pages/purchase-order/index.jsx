import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, IconButton } from "@chakra-ui/button";
import { Badge, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/router";
import Table from "../../components/table/table";
import { Menu, MenuItem } from "@szhsin/react-menu";
import EmptyData from "../../components/EmptyData";
import { usePurchaseOrder } from "../../customHooks/usePurchaseOrder";

const HEADINGS = {
  purchase_order_ref: "Purchase Order #",
  vendor_name: "Vendor",
  date: "Date",
  item_count: "Items",
  total_amount: "Total Amount",
  status: "Status",
  actions: "Actions",
};

function PurchaseOrder() {
  const { purchaseOrders, loading } = usePurchaseOrder();
  const router = useRouter();

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN");
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: "green", text: "Active" },
      inactive: { color: "red", text: "Inactive" },
      pending: { color: "yellow", text: "Pending" },
    };

    const config = statusConfig[status] || { color: "gray", text: status };
    return <Badge colorScheme={config.color}>{config.text}</Badge>;
  };

  const modifiedPurchaseOrders = purchaseOrders.map((order) => ({
    purchase_order_ref: (
      <Text fontWeight="bold">{order.purchase_order_id}</Text>
    ),
    vendor_name: (
      <div>
        <Text fontWeight="medium">{order.vendor_name || "N/A"}</Text>
        {order.vendor_phone && (
          <Text fontSize="sm" color="gray.600">
            {order.vendor_phone}
          </Text>
        )}
      </div>
    ),
    date: formatDate(order.date),
    delivery_date: formatDate(order.delivery_date),
    item_count: <Badge colorScheme="blue">{order.item_count} items</Badge>,
    total_amount: (
      <Text fontWeight="bold" color="green.600">
        ₹{formatCurrency(order.total_amount)}
      </Text>
    ),
    discount: <Text color="red.600">₹{formatCurrency(order.discount)}</Text>,
    tax: <Text color="orange.600">₹{formatCurrency(order.tax)}</Text>,
    adjustment: (
      <Text color={parseFloat(order.adjustment) >= 0 ? "green.600" : "red.600"}>
        ₹{formatCurrency(order.adjustment)}
      </Text>
    ),
    status: getStatusBadge(order.status),
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
        {order.pdf_url && (
          <MenuItem
            as="a"
            href={order.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View PDF
          </MenuItem>
        )}
        <MenuItem
          onClick={() =>
            router.push(`/purchase-order/view?id=${order.purchase_order_id}`)
          }
        >
          View
        </MenuItem>
        <MenuItem
          onClick={() =>
            router.push(`/purchase-order/edit?id=${order.purchase_order_id}`)
          }
        >
          Edit
        </MenuItem>
      </Menu>
    ),
  }));

  return (
    <GlobalWrapper>
      <CustomContainer
        title="Purchase Order"
        filledHeader
        rightSection={
          <Link href="/purchase-order/create" passHref>
            <Button colorScheme="purple">Add</Button>
          </Link>
        }
      >
        {loading ? (
          <Text textAlign="center" py={8}>
            Loading...
          </Text>
        ) : (
          <Table
            heading={HEADINGS}
            rows={modifiedPurchaseOrders}
            variant="plain"
          />
        )}

        {!loading && purchaseOrders.length === 0 && <EmptyData />}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseOrder;
