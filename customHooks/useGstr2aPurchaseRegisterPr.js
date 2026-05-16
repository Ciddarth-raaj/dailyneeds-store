import { useMemo } from "react";
import moment from "moment";
import { usePurchase } from "./usePurchase";
import { aggregatePurchasesByVendor } from "../util/gstr2aPurchaseRegister";

/**
 * Purchase register (PR) data for GSTR-2A v Purchase Register.
 * Wraps `usePurchase` today; additional PR APIs can be merged here later.
 *
 * @param {string} period - `YYYY-MM` return month
 */
export function useGstr2aPurchaseRegisterPr(period) {
  const purchaseFilters = useMemo(() => {
    const m = moment(period, "YYYY-MM", true);
    if (!m.isValid()) return null;

    const startOfDay = m.clone().startOf("month").toDate();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = m.clone().endOf("month").toDate();
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [period]);

  const {
    purchase,
    loading: purchaseLoading,
    error: purchaseError,
    refetch: refetchPurchases,
  } = usePurchase(purchaseFilters ?? {});

  /** Future: merge rows from additional purchase-register APIs here. */
  const allPurchases = useMemo(() => purchase ?? [], [purchase]);

  const vendorPrByGstin = useMemo(
    () => aggregatePurchasesByVendor(allPurchases),
    [allPurchases]
  );

  return {
    purchases: allPurchases,
    vendorPrByGstin,
    loading: purchaseFilters == null ? false : purchaseLoading,
    error: purchaseError,
    refetch: refetchPurchases,
  };
}
