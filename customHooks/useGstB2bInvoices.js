import { useCallback, useEffect, useMemo, useState } from "react";
import { getGstB2bInvoicesForRange } from "../helper/gstB2bInvoices";
import { normalizePeriodRange } from "../util/gstr2aPurchaseRegister";

/**
 * Stored GSTR-2A B2B invoices across an inclusive range of return periods.
 * @param {string} fromPeriod - `YYYY-MM` first return month
 * @param {string} [toPeriod] - `YYYY-MM` last return month; defaults to `fromPeriod`
 */
export function useGstB2bInvoices(fromPeriod, toPeriod) {
  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { from, to } = useMemo(() => {
    const range = normalizePeriodRange(fromPeriod, toPeriod);
    if (!range) return { from: null, to: null };
    return {
      from: range.from.format("YYYY-MM"),
      to: range.to.format("YYYY-MM"),
    };
  }, [fromPeriod, toPeriod]);

  const fetchInvoices = useCallback(
    async (noRefresh = false) => {
      if (!from || !to) {
        setInvoices([]);
        setMeta(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        if (!noRefresh) {
          setLoading(true);
          setInvoices([]);
          setMeta(null);
        }
        setError(null);

        const { data, meta: m } = await getGstB2bInvoicesForRange(from, to);
        setInvoices(data);
        setMeta(m);
      } catch (err) {
        setInvoices([]);
        setMeta(null);
        setError(err?.message || "Failed to load GSTR-2A B2B invoices");
      } finally {
        setLoading(false);
      }
    },
    [from, to]
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    meta,
    loading,
    error,
    fromPeriod: from,
    toPeriod: to,
    refetch: fetchInvoices,
  };
}
