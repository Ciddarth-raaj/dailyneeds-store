import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import stockTransferOut from "../helper/stockTransferOut";

/**
 * Hook to fetch a single stock transfer by Dn_no.
 * GET /stock-transfer-out/:Dn_no
 * @param {number|string|null} dnNo - Transfer primary key (Dn_no)
 */
function useStockTransferById(dnNo) {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (dnNo == null || dnNo === "") {
      setLoading(false);
      setTransfer(null);
      return;
    }
    try {
      setLoading(true);
      const data = await stockTransferOut.getStockTransferByDnNo(dnNo);
      setTransfer(data ?? null);
    } catch (err) {
      toast.error(err?.message ?? "Error fetching stock transfer");
      setTransfer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [dnNo]);

  return { transfer, loading, refetch: fetch };
}

export default useStockTransferById;
