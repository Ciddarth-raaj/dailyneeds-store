import { useCallback, useMemo } from "react";
import { usePurchase } from "./usePurchase";
import { usePurchaseGst } from "./usePurchaseGst";
import { usePurchaseGstMatch } from "./usePurchaseGstMatch";
import {
  aggregatePurchasesByVendor,
  mergePurchaseRegisterSources,
  purchaseMatchPeriodFilters,
  purchasePeriodFilters,
} from "../util/gstr2aPurchaseRegister";

/**
 * Purchase register (PR) data for GSTR-2A v Purchase Register.
 * Merges `usePurchase`, `usePurchaseGst`, and purchase-gst matches.
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
    purchase,
    loading: purchaseLoading,
    error: purchaseError,
    refetch: refetchPurchases,
  } = usePurchase(purchaseFilters ?? {});

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
    () => mergePurchaseRegisterSources(purchase ?? [], purchaseGst ?? []),
    [purchase, purchaseGst]
  );

  purchases?.forEach((item) => {
    if (item.mmh_mrc_refno == "36") {
      console.log("CIDD item", item.supplier_name);
      console.log("CIDD item", item);
    }
  });

  const vendorPrByGstin = useMemo(
    () => aggregatePurchasesByVendor(purchases),
    [purchases]
  );

  const loading =
    purchaseFilters == null || matchFilters == null
      ? false
      : purchaseLoading || purchaseGstLoading || matchLoading;

  const error = useMemo(() => {
    if (purchaseError) {
      return purchaseError?.message ?? String(purchaseError);
    }
    if (purchaseGstError) {
      return purchaseGstError?.message ?? String(purchaseGstError);
    }
    if (matchError) {
      return matchError?.message ?? String(matchError);
    }
    return null;
  }, [purchaseError, purchaseGstError, matchError]);

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchPurchases(true),
      refetchPurchaseGst(true),
      refetchMatches(true),
    ]);
  }, [refetchPurchases, refetchPurchaseGst, refetchMatches]);

  return {
    purchases,
    matches,
    vendorPrByGstin,
    loading,
    error,
    refetch,
  };
}
