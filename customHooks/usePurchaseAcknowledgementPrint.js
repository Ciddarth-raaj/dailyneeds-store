import { useCallback, useState } from "react";
import { getPurchaseAcknowledgementById } from "../helper/purchaseAcknowledgement";
import { getPurchaseReturnsByDistributor } from "../helper/purchaseReturn";
import { downloadPurchaseAcknowledgementPdf } from "../helper/purchaseAcknowledgementPdf";
import toast from "react-hot-toast";

/**
 * Hook to print (download PDF) a purchase acknowledgement.
 * Accepts either full acknowledgement data (e.g. from list or form) or an id;
 * if only id is provided, fetches the acknowledgement then generates the PDF.
 * @returns {{ print: (idOrData: string|number|Object) => Promise<void>, printing: boolean }}
 */
export function usePurchaseAcknowledgementPrint() {
  const [printing, setPrinting] = useState(false);

  const print = useCallback(async (idOrData) => {
    if (idOrData == null) {
      toast.error("No acknowledgement to print");
      return;
    }

    setPrinting(true);
    try {
      let data = null;

      if (typeof idOrData === "object" && idOrData !== null) {
        const hasEnough =
          idOrData.purchase_acknowledgement_id != null &&
          (idOrData.distributor_name != null || idOrData.distributor_id != null);
        const hasInvoices = Array.isArray(idOrData.invoices);
        if (hasEnough && hasInvoices) {
          data = idOrData;
        } else if (idOrData.purchase_acknowledgement_id != null) {
          data = await getPurchaseAcknowledgementById(
            idOrData.purchase_acknowledgement_id
          );
        }
      } else {
        const id = String(idOrData).trim();
        if (id) data = await getPurchaseAcknowledgementById(id);
      }

      if (!data) {
        toast.error("Could not load acknowledgement for print");
        return;
      }

      let linkedPurchaseReturns = [];
      const distId = data.distributor_id;
      const ackId = data.purchase_acknowledgement_id;
      if (distId != null && ackId != null) {
        try {
          const prRes = await getPurchaseReturnsByDistributor(distId, ackId);
          const prList = Array.isArray(prRes?.data) ? prRes.data : [];
          linkedPurchaseReturns = prList
            .filter(
              (pr) =>
                pr.status === "done" &&
                String(pr.purchase_acknowledgement_id) === String(ackId)
            )
            .map((pr) => {
              const items = pr?.items || [];
              const totalQty = items.reduce(
                (s, it) => s + (Number(it.MPR_ITEM_QTY) || 0),
                0
              );
              return {
                prNo: pr.mprh_pr_refno ?? "—",
                qty: totalQty,
                amt: pr.mprh_net_amount != null ? Number(pr.mprh_net_amount) : 0,
                boxes: pr.no_of_boxes != null ? Number(pr.no_of_boxes) : "—",
              };
            });
        } catch {
          // continue without PR table
        }
      }

      await downloadPurchaseAcknowledgementPdf(data, {
        linkedPurchaseReturns,
      });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err?.message || "Failed to print");
    } finally {
      setPrinting(false);
    }
  }, []);

  return { print, printing };
}
