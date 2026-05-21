import { useCallback, useMemo } from "react";
import { usePurchaseGst } from "./usePurchaseGst";
import { usePurchaseGstMatch } from "./usePurchaseGstMatch";
import {
  aggregatePurchasesByVendor,
  normalizeTallyPurchases,
  purchaseMatchPeriodFilters,
  purchasePeriodFilters,
} from "../util/gstr2aPurchaseRegister";

/**
 * Purchase register (PR) data for GSTR-2A v Purchase Register.
 * Uses Tally GST purchases (`usePurchaseGst`) and purchase-gst matches.
 *
 * @param {string} period - `YYYY-MM` return month
 */
export function useGstr2aPurchaseRegisterPr(period) {
  const purchaseFilters = useMemo(
    () => purchasePeriodFilters(period),
    [period]
  );
  const matchFilters = useMemo(
    () => purchaseMatchPeriodFilters(period),
    [period]
  );

  const {
    purchaseGst,
    loading: purchaseGstLoading,
    error: purchaseGstError,
    refetch: refetchPurchaseGst,
  } = usePurchaseGst(purchaseFilters ?? {});

  const {
    matches,
    loading: matchLoading,
    error: matchError,
    refetch: refetchMatches,
  } = usePurchaseGstMatch(matchFilters);

  const purchases = useMemo(
    () => normalizeTallyPurchases(purchaseGst ?? []),
    [purchaseGst]
  );

  const vendorPrByGstin = useMemo(
    () => aggregatePurchasesByVendor(purchases),
    [purchases]
  );

  const loading =
    purchaseFilters == null || matchFilters == null
      ? false
      : purchaseGstLoading || matchLoading;

  const error = useMemo(() => {
    if (purchaseGstError) {
      return purchaseGstError?.message ?? String(purchaseGstError);
    }
    if (matchError) {
      return matchError?.message ?? String(matchError);
    }
    return null;
  }, [purchaseGstError, matchError]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchPurchaseGst(true), refetchMatches(true)]);
  }, [refetchPurchaseGst, refetchMatches]);

  return {
    purchases,
    matches,
    vendorPrByGstin,
    loading,
    error,
    refetch,
  };
}
