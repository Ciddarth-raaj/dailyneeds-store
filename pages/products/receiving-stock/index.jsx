import React, { useMemo, useCallback } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import useStockReceivedGofrugal from "../../../customHooks/useStockReceivedGofrugal";
import usePermissions from "../../../customHooks/usePermissions";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import toast from "react-hot-toast";
import stockReceived from "../../../helper/stockReceived";

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

function ReceivingStockPage() {
  const canAdd = usePermissions(["add_stock_received"]);
  const canDelete = usePermissions(["delete_stock_received"]);
  const { rows, setRows, loading } = useStockReceivedGofrugal();
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const rowData = useMemo(() => sortReceivingRows(rows), [rows]);

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
        field: "product.product_id",
        headerName: "PID",
        type: "id",
      },
      {
        field: "product.image_link",
        headerName: "Image",
        type: "image",
      },
      {
        field: "product.gf_item_name",
        headerName: "Name",
        type: "capitalized",
        flex: 2,
        valueGetter: (p) => {
          const name =
            p.data?.product?.gf_item_name ??
            p.data?.product?.de_name ??
            p.data?.product?.de_display_name;
          if (name) return name;
          const code = p.data?.gofrugal?.MMD_ITEM_CODE;
          return code != null ? `Unknown item (${code})` : "—";
        },
      },
      {
        field: "recd_qty",
        headerName: "Recd qty",
        valueGetter: (p) => {
          const g = p.data?.gofrugal;
          const v = g?.MMD_RECD_QTY;
          if (v === undefined || v === null || v === "") return "—";
          return v;
        },
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
    [canAdd, canDelete, handleClear, handleUpsert]
  );

  console.log("CIDD", rowData);

  return (
    <GlobalWrapper
      title="Receiving Stock"
      permissionKey={["view_stock_received"]}
    >
      <ConfirmDeleteDialog />
      <CustomContainer title="Receiving Stock" filledHeader>
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
    </GlobalWrapper>
  );
}

export default ReceivingStockPage;
