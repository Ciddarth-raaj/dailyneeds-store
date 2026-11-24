import { useEffect, useState } from "react";
import BusinessDashboardHelper from "../../helper/businessDashboard";

/**
 * GET /business-dashboard/purchase-returns for the dashboard's period.
 * Refetches when the period changes or Refresh is pressed (refreshTick).
 */
export default function usePurchaseReturns(range, refreshTick) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    BusinessDashboardHelper.getPurchaseReturns({ from_date: range.from, to_date: range.to, ...(refreshTick ? { refresh: 1 } : {}) })
      .then((res) => {
        if (!live) return;
        if (res && res.code === 200) setState({ loading: false, error: null, data: res.data });
        else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load purchase returns", data: null });
      })
      .catch((err) => live && setState({ loading: false, error: err.message || "Could not load purchase returns", data: null }));
    return () => {
      live = false;
    };
  }, [range.from, range.to, refreshTick]);
  return state;
}
