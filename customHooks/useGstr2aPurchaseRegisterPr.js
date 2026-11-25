import { useCallback, useMemo } from "react";
import { usePurchaseGst } from "./usePurchaseGst";
import { usePurchaseGstMatch } from "./usePurchaseGstMatch";
import { usePurchaseGstNo2a } from "./usePurchaseGstNo2a";
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
 * @param {string} fromPeriod - `YYYY-MM` first return month
 * @param {string} [toPeriod] - `YYYY-MM` last return month; defaults to `fromPeriod`
 */
export function useGstr2aPurchaseRegisterPr(fromPeriod, toPeriod) {
  const purchaseFilters = useMemo(
    () => purchasePeriodFilters(fromPeriod, toPeriod),
    [fromPeriod, toPeriod]
  );
  const matchFilters = useMemo(
    () => purchaseMatchPeriodFilters(fromPeriod, toPeriod),
    [fromPeriod, toPeriod]
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

  const {
    accepted: acceptedNo2a,
    loading: acceptedLoading,
    error: acceptedError,
    refetch: refetchAccepted,
  } = usePurchaseGstNo2a(purchaseFilters ?? {});

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
      : purchaseGstLoading || matchLoading || acceptedLoading;

  const error = useMemo(() => {
    if (purchaseGstError) {
      return purchaseGstError?.message ?? String(purchaseGstError);
    }
    if (matchError) {
      return matchError?.message ?? String(matchError);
    }
    if (acceptedError) {
      return acceptedError?.message ?? String(acceptedError);
    }
    return null;
  }, [purchaseGstError, matchError, acceptedError]);

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchPurchaseGst(true),
      refetchMatches(true),
      refetchAccepted(true),
    ]);
  }, [refetchPurchaseGst, refetchMatches, refetchAccepted]);

  return {
    purchases,
    matches,
    acceptedNo2a,
    vendorPrByGstin,
    loading,
    error,
    refetch,
  };
}
