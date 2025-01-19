import { useState, useCallback, useEffect } from "react";
import { getDigitalPayments } from "../helper/digital-payments";

function useDigitalPayments() {
  const [data, setData] = useState([]);
  const [mappedData, setMappedData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDigitalPayments();

      if (response.code === 200) {
        setData(response.data || []);

        // Create mapped data with bank_mid as key
        const mapped = (response.data || []).reduce((acc, item) => {
          if (item.bank_mid) {
            acc[item.bank_mid] = item;
          }
          return acc;
        }, {});

        setMappedData(mapped);
      } else {
        throw new Error(response.message || "Failed to fetch digital payments");
      }
    } catch (err) {
      console.error("Error fetching digital payments:", err);
      setError(err.message);
      setData([]);
      setMappedData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData([]);
    setMappedData({});
    setLoading(false);
    setError(null);
  }, []);

  const handleExportData = useCallback(() => {
    if (!data.length) return;

    // Define headers
    const headers = [
      "S/NO",
      "Merchant_Name",
      "Paytm MID",
      "Paytm TID",
      "Bank MID",
      "Bank TID",
      "key",
      "Status",
      "Pluxe Outlet Id",
      "Paytm Aggregator ID",
    ];

    // Map data to CSV format
    const csvData = data.map((row) => [
      row.s_no || "",
      row.outlet_name || "",
      row.payment_mid || "",
      row.payment_tid || "",
      row.bank_mid || "",
      row.bank_tid || "",
      row.api_key || "",
      row.status || "",
      row.pluxe_outlet_id || "",
      row.paytm_aggregator_id || "",
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `digital_payments_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data]);

  return {
    data,
    mappedData,
    loading,
    error,
    refetch: fetchData,
    reset,
    handleExportData,
  };
}

export default useDigitalPayments;
