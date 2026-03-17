import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import stockTransferOut from "../helper/stockTransferOut";

/**
 * Hook to fetch stock transfers by reference number Dn_Ref_no.
 * GET /stock-transfer-out/by-ref/:Dn_Ref_no
 * @param {number|string|null} dnRefNo - Reference number (Dn_Ref_no)
 */
function useStockTransferByRefId(dnRefNo) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (dnRefNo == null || dnRefNo === "") {
      setLoading(false);
      setTransfers([]);
      return;
    }
    try {
      setLoading(true);
      const data = await stockTransferOut.getStockTransferByRefId(dnRefNo);
      console.log("CIDD", data);
      setTransfers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.message ?? "Error fetching stock transfers by ref");
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [dnRefNo]);

  return { transfers, loading, refetch: fetch };
}

export default useStockTransferByRefId;
