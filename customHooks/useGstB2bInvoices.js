import { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { getGstB2bInvoices } from "../helper/gstB2bInvoices";

/**
 * Stored GSTR-2A B2B invoices for a return period.
 * @param {string} period - `YYYY-MM` return month
 */
export function useGstB2bInvoices(period) {
  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { year, month } = useMemo(() => {
    const m = moment(period, "YYYY-MM", true);
    if (!m.isValid()) {
      return { year: moment().year(), month: moment().month() + 1 };
    }
    return { year: m.year(), month: m.month() + 1 };
  }, [period]);

  const fetchInvoices = useCallback(
    async (noRefresh = false) => {
      try {
        if (!noRefresh) {
          setLoading(true);
          setInvoices([]);
          setMeta(null);
        }
        setError(null);

        const { data, meta: m } = await getGstB2bInvoices(year, month);
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
    [year, month]
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    meta,
    loading,
    error,
    year,
    month,
    refetch: fetchInvoices,
  };
}
