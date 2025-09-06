import { useEffect, useState } from "react";
import invoiceHelper from "../helper/invoice";

export function useInvoice(filters = {}) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoices = async (noRefresh = false) => {
    try {
      if (!noRefresh) {
        setLoading(true);
        setInvoices([]);
      }

      const data = await invoiceHelper.getAllInvoices({offset: 0, limit: 10000000, ...filters});
      if (data.code === 200) {
        setInvoices(data.data || []);
      } else {
        setError("Failed to fetch invoices");
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async (invoiceData) => {
    try {
      const response = await invoiceHelper.createInvoice(invoiceData);
      if (response.code === 200) {
        await fetchInvoices(true);
      }
      return response;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const updateInvoice = async (invoiceId, invoiceData) => {
    try {
      const response = await invoiceHelper.updateInvoice(invoiceId, invoiceData);
      if (response.code === 200) {
        await fetchInvoices(true);
      }
      return response;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const deleteInvoice = async (invoiceId) => {
    try {
      const response = await invoiceHelper.deleteInvoice(invoiceId);
      if (response.code === 200) {
        await fetchInvoices(true);
      }
      return response;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return {
    invoices,
    setInvoices,
    loading,
    error,
    refetch: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
}
