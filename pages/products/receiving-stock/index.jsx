import React, { useMemo, useCallback, useState } from "react";
import moment from "moment";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import {
  Text,
  Flex,
  FormControl,
  FormLabel,
  Select,
  Tooltip,
  Box,
  VStack,
  HStack,
  Divider,
} from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import MonthStatusCalendar from "../../../components/calendar/MonthStatusCalendar";
import useStockReceivedGofrugal from "../../../customHooks/useStockReceivedGofrugal";
import useProductOffers from "../../../customHooks/useProductOffers";
import usePermissions from "../../../customHooks/usePermissions";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import toast from "react-hot-toast";
import stockReceived from "../../../helper/stockReceived";
import currencyFormatter from "../../../util/currencyFormatter";
import { capitalize } from "../../../util/string";

function formatOfferMoney(v) {
  if (v === undefined || v === null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return currencyFormatter(n);
}

function getDisplayNameFromRow(data) {
  const name =
    data?.product?.gf_item_name ??
    data?.product?.de_name ??
    data?.product?.de_display_name;
  if (name) return capitalize(String(name));
  const code = data?.gofrugal?.MMD_ITEM_CODE;
  return code != null ? `Unknown item (${code})` : "—";
}

/** Name cell (centered); hover shows offer MRP / selling price in tooltip. */
function ReceivingProductNameCell({ data, offersByProductId, offersLoading }) {
  const displayName = getDisplayNameFromRow(data);
  const pid = data?.product?.product_id;
  const offer =
    pid != null ? offersByProductId[Number(pid)] : undefined;

  const label =
    offersLoading ? (
      <Box
        minW="140px"
        borderRadius="md"
        bg="gray.800"
        color="white"
        px={3}
        py={2}
        boxShadow="lg"
      >
        <Text fontSize="xs" color="whiteAlpha.700">
          Loading offer prices…
        </Text>
      </Box>
    ) : !offer ? (
      <Box
        minW="200px"
        borderRadius="lg"
        overflow="hidden"
        border="1px solid"
        borderColor="whiteAlpha.200"
        bg="gray.800"
        color="white"
        boxShadow="0 12px 40px -8px rgba(0,0,0,0.45)"
      >
        <Flex align="stretch">
          <Box w="4px" flexShrink={0} bg="orange.400" aria-hidden />
          <VStack align="stretch" spacing={1} px={3} py={2.5} flex={1}>
            <Text
              fontSize="10px"
              fontWeight="semibold"
              letterSpacing="0.08em"
              textTransform="uppercase"
              color="whiteAlpha.500"
            >
              Product offer
            </Text>
            <Text fontSize="sm" color="whiteAlpha.800" lineHeight="1.35">
              No offer for this product.
            </Text>
          </VStack>
        </Flex>
      </Box>
    ) : (
      <Box
        minW="200px"
        borderRadius="lg"
        overflow="hidden"
        border="1px solid"
        borderColor="whiteAlpha.200"
        bg="gray.800"
        color="white"
        boxShadow="0 12px 40px -8px rgba(0,0,0,0.45)"
      >
        <Flex align="stretch">
          <Box w="4px" flexShrink={0} bg="purple.400" aria-hidden />
          <VStack align="stretch" spacing={2} px={3} py={2.5} flex={1}>
            <Text
              fontSize="10px"
              fontWeight="semibold"
              letterSpacing="0.08em"
              textTransform="uppercase"
              color="whiteAlpha.500"
            >
              Offer pricing
            </Text>
            <VStack align="stretch" spacing={1.5}>
              <HStack justify="space-between" spacing={4} w="100%">
                <Text fontSize="xs" color="whiteAlpha.600">
                  MRP
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  fontVariantNumeric="tabular-nums"
                >
                  {formatOfferMoney(offer.mrp)}
                </Text>
              </HStack>
              <Divider borderColor="whiteAlpha.200" />
              <HStack justify="space-between" spacing={4} w="100%">
                <Text fontSize="xs" color="whiteAlpha.600">
                  Selling price
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  fontVariantNumeric="tabular-nums"
                >
                  {formatOfferMoney(offer.selling_price)}
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Flex>
      </Box>
    );

  return (
    <Tooltip
      hasArrow={false}
      placement="top-start"
      gutter={10}
      openDelay={250}
      p={0}
      bg="transparent"
      boxShadow="none"
      label={label}
      shouldWrapChildren
    >
      <Box w="100%" minW={0} overflow="hidden" py={0.5}>
        <Text noOfLines={1}>{displayName}</Text>
      </Box>
    </Tooltip>
  );
}

function sortReceivingRows(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const aFilled = a?.stock_received != null ? 1 : 0;
    const bFilled = b?.stock_received != null ? 1 : 0;
    if (aFilled !== bFilled) return aFilled - bFilled;
    const g = (x) => x?.gofrugal || {};
    const noA = Number(g(a).MMD_MRC_NO) || 0;
    const noB = Number(g(b).MMD_MRC_NO) || 0;
    if (noA !== noB) return noB - noA;
    return (
      (Number(g(a).MMD_MRC_SL_NO) || 0) - (Number(g(b).MMD_MRC_SL_NO) || 0)
    );
  });
}

/** YYYY-MM-DD -> { total, filled } */
function buildStatsByMrcDate(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    const raw = row?.gofrugal?.MMH_MRC_DT;
    if (raw == null || raw === "") return;
    const d = moment(raw).format("YYYY-MM-DD");
    if (!map[d]) map[d] = { total: 0, filled: 0 };
    map[d].total += 1;
    if (row.stock_received != null) map[d].filled += 1;
  });
  return map;
}

function ReceivingStockPage() {
  const [daysBuffer, setDaysBuffer] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() =>
    moment().format("YYYY-MM-DD")
  );
  const [viewingMonth, setViewingMonth] = useState(() =>
    moment().clone().startOf("month")
  );

  const canAdd = usePermissions(["add_stock_received"]);
  const canDelete = usePermissions(["delete_stock_received"]);
  const { rows, setRows, loading } = useStockReceivedGofrugal({
    daysBuffer,
  });
  const { offers, loading: offersLoading } = useProductOffers();
  const offersByProductId = useMemo(() => {
    const map = {};
    for (const o of offers || []) {
      const id = o?.product_id;
      if (id != null) map[Number(id)] = o;
    }
    return map;
  }, [offers]);

  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const statsByDay = useMemo(() => buildStatsByMrcDate(rows), [rows]);

  const getDayVisual = useCallback(
    (date) => {
      const key = date.format("YYYY-MM-DD");
      const s = statsByDay[key];
      const total = s?.total ?? 0;
      if (total === 0) {
        return {
          bg: "red.50",
          border: "red.200",
          text: "red.600",
          primary: "0",
          secondary: "No memos",
        };
      }
      const filled = s?.filled ?? 0;
      if (filled < total) {
        return {
          bg: "yellow.50",
          border: "yellow.300",
          text: "yellow.800",
          primary: `${filled}/${total}`,
          secondary: "Still saving",
        };
      }
      return {
        bg: "green.50",
        border: "green.200",
        text: "green.600",
        primary: `${total}/${total}`,
        secondary: "All saved",
      };
    },
    [statsByDay]
  );

  const rowData = useMemo(() => {
    const filtered = (rows || []).filter((row) => {
      const raw = row?.gofrugal?.MMH_MRC_DT;
      if (raw == null || raw === "") return false;
      return moment(raw).format("YYYY-MM-DD") === selectedDate;
    });
    return sortReceivingRows(filtered);
  }, [rows, selectedDate]);

  const buildUpsertPayload = useCallback((line, isOffer) => {
    const g = line?.gofrugal || {};
    const product = line?.product;
    const recd =
      product && line?.stock_received?.recd_qty != null
        ? Number(line.stock_received.recd_qty)
        : Number(g.MMD_RECD_QTY);
    return {
      mmd_mrc_no: Number(g.MMD_MRC_NO),
      mmd_mrc_sl_no: Number(g.MMD_MRC_SL_NO),
      product_id: Number(product?.product_id ?? g.MMD_ITEM_CODE),
      recd_qty: Number.isFinite(recd) ? recd : 0,
      ...(isOffer === true ? { is_offer: true } : { is_offer: false }),
    };
  }, []);

  const handleUpsert = useCallback(
    async (line, isOffer) => {
      const product = line?.product;
      if (!product?.product_id) {
        toast.error("No catalog product for this line; cannot save.");
        return;
      }
      try {
        const payload = buildUpsertPayload(line, isOffer);
        const data = await stockReceived.upsert(payload);
        const mrcNo = payload.mmd_mrc_no;
        const slNo = payload.mmd_mrc_sl_no;
        setRows((prev) =>
          prev.map((row) => {
            const g = row?.gofrugal || {};
            if (
              Number(g.MMD_MRC_NO) !== Number(mrcNo) ||
              Number(g.MMD_MRC_SL_NO) !== Number(slNo)
            ) {
              return row;
            }
            const nextSr =
              data && typeof data === "object"
                ? { ...data, product: data.product ?? row.product }
                : row.stock_received;
            return { ...row, stock_received: nextSr };
          })
        );
        toast.success(
          isOffer === true ? "Marked as offer" : "Cleared offer flag"
        );
      } catch (err) {
        toast.error(err?.message ?? "Save failed");
      }
    },
    [buildUpsertPayload, setRows]
  );

  const handleClear = useCallback(
    (line) => {
      const id = line?.stock_received?.stock_received_id;
      if (id == null) return;
      confirmDelete({
        title: "Clear received stock",
        message:
          "Remove this stock-received record? You can tag offer/non-offer again afterwards.",
        onConfirm: async () => {
          await stockReceived.remove(id);
          setRows((prev) =>
            prev.map((row) =>
              row.stock_received?.stock_received_id === id
                ? { ...row, stock_received: null }
                : row
            )
          );
          toast.success("Cleared");
        },
      });
    },
    [confirmDelete, setRows]
  );

  const bufferOptions = [0, 1, 3, 7, 14, 30, 60, 90];

  const calendarHeaderRight = (
    <FormControl maxW="200px">
      <FormLabel fontSize="xs" mb={1} whiteSpace="nowrap">
        Offer date buffer (days)
      </FormLabel>
      <Select
        size="sm"
        value={daysBuffer}
        onChange={(e) => setDaysBuffer(Number(e.target.value))}
      >
        {bufferOptions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
    </FormControl>
  );

  const colDefs = useMemo(
    () => [
      {
        field: "gofrugal.MMD_MRC_NO",
        headerName: "MRC No",
        type: "id",
        hideByDefault: true,
      },
      {
        field: "gofrugal.MMD_MRC_SL_NO",
        headerName: "SL No",
        type: "id",
        hideByDefault: true,
      },
      {
        field: "gofrugal.MMH_MRC_REFNO",
        headerName: "Ref No",
        type: "capitalized",
        minWidth: 100,
      },
      {
        field: "product.product_id",
        headerName: "PID",
        type: "id",
      },
      {
        field: "product.image_link",
        headerName: "Image",
        type: "image",
        hideByDefault: true,
        valueGetter: (p) => p.data?.product?.image_link,
      },
      {
        field: "product.gf_item_name",
        headerName: "Name",
        flex: 2,
        minWidth: 160,
        filter: false,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        },
        valueGetter: (p) => getDisplayNameFromRow(p.data),
        cellRenderer: (params) => (
          <ReceivingProductNameCell
            data={params.data}
            offersByProductId={offersByProductId}
            offersLoading={offersLoading}
          />
        ),
      },
      {
        field: "gofrugal.MMD_RECD_QTY",
        headerName: "Recd qty",
        filter: false,
        valueGetter: (p) => {
          const g = p.data?.gofrugal;
          const v = g?.MMD_RECD_QTY;
          if (v === undefined || v === null || v === "") return "—";
          return v;
        },
      },
      {
        field: "gofrugal.MMD_PUR_PRICE",
        headerName: "Pur price",
        filter: false,
        type: "currency",
        valueGetter: (p) => p.data?.gofrugal?.MMD_PUR_PRICE,
      },
      {
        field: "gofrugal.MMD_MRP",
        headerName: "MRP",
        filter: false,
        type: "currency",
        valueGetter: (p) => p.data?.gofrugal?.MMD_MRP,
      },
      {
        field: "gofrugal.MMD_SALE_RATE",
        headerName: "Sale rate",
        filter: false,
        type: "currency",
        valueGetter: (p) => p.data?.gofrugal?.MMD_SALE_RATE,
      },
      {
        field: "stock_received.is_offer",
        headerName: "Offer",
        type: "badge-column",
        valueGetter: (p) => {
          const sr = p.data?.stock_received;
          if (sr == null) {
            return null;
          }

          if (sr.is_offer == true) {
            return { label: "Offer", colorScheme: "blue" };
          }
          return { label: "Non Offer", colorScheme: "gray" };
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        type: "action-icons",
        valueGetter: (params) => {
          const line = params.data;
          const sr = line?.stock_received;
          const hasSr = sr != null;
          const hasProduct = line?.product?.product_id != null;
          const actions = [];

          if (canDelete) {
            actions.push({
              label: "Clear",
              icon: "fa-solid fa-eraser",
              colorScheme: "orange",
              disabled: !hasSr || !canDelete,
              onClick: () => handleClear(line),
            });
          }

          if (canAdd) {
            actions.push({
              label: "Offer",
              icon: "fa-solid fa-tag",
              colorScheme: "green",
              disabled: !canAdd || !hasProduct,
              onClick: () => handleUpsert(line, true),
            });

            actions.push({
              label: "Non offer",
              icon: "fa-solid fa-ban",
              colorScheme: "gray",
              disabled: !canAdd || !hasProduct,
              onClick: () => handleUpsert(line, false),
            });
          }

          return actions;
        },
      },
    ],
    [canAdd, canDelete, handleClear, handleUpsert, offersByProductId, offersLoading]
  );

  return (
    <GlobalWrapper
      title="Receiving Stock"
      permissionKey={["view_stock_received"]}
    >
      <ConfirmDeleteDialog />
      <Flex flexDirection="column" gap={6}>
        <MonthStatusCalendar
          title="Receiving by MRC date"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewingMonth={viewingMonth}
          onViewingMonthChange={setViewingMonth}
          loading={loading}
          getDayVisual={getDayVisual}
          headerRight={calendarHeaderRight}
        />

        <CustomContainer
          title={`Receiving Stock — ${moment(selectedDate).format(
            "DD/MM/YYYY"
          )}`}
          filledHeader
        >
          {loading ? (
            <Text>Loading…</Text>
          ) : (
            <AgGrid
              rowData={rowData}
              columnDefs={colDefs}
              tableKey="products-receiving-stock"
              gridOptions={{
                getRowId: (params) => {
                  const g = params.data?.gofrugal || {};
                  return `${g.MMD_MRC_NO}-${g.MMD_MRC_SL_NO}`;
                },
              }}
            />
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default ReceivingStockPage;
