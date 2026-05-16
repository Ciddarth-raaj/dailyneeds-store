import { useMemo } from "react";
import { usePurchase } from "./usePurchase";
import { usePurchaseGst } from "./usePurchaseGst";
import {
  aggregatePurchasesByVendor,
  mergePurchaseRegisterSources,
  purchasePeriodFilters,
} from "../util/gstr2aPurchaseRegister";

/**
 * Purchase register (PR) data for GSTR-2A v Purchase Register.
 * Merges `usePurchase` and `usePurchaseGst` into one vendor aggregate.
 *
 * @param {string} period - `YYYY-MM` return month
 */
export function useGstr2aPurchaseRegisterPr(period) {
  const purchaseFilters = useMemo(() => purchasePeriodFilters(period), [period]);

  const {
    purchase,
    loading: purchaseLoading,
    error: purchaseError,
  } = usePurchase(purchaseFilters ?? {});

  const {
    purchaseGst,
    loading: purchaseGstLoading,
    error: purchaseGstError,
  } = usePurchaseGst(purchaseFilters ?? {});

  const purchases = useMemo(
    () => mergePurchaseRegisterSources(purchase ?? [], purchaseGst ?? []),
    [purchase, purchaseGst]
  );

  const vendorPrByGstin = useMemo(
    () => aggregatePurchasesByVendor(purchases),
    [purchases]
  );

  const loading =
    purchaseFilters == null ? false : purchaseLoading || purchaseGstLoading;

  const error = useMemo(() => {
    if (purchaseError) {
      return purchaseError?.message ?? String(purchaseError);
    }
    if (purchaseGstError) {
      return purchaseGstError?.message ?? String(purchaseGstError);
    }
    return null;
  }, [purchaseError, purchaseGstError]);

  return {
    purchases,
    vendorPrByGstin,
    loading,
    error,
  };
}
