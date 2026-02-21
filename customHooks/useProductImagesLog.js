import { useEffect, useState, useCallback, useMemo } from "react";
import { getProductImageLogs } from "../helper/productImageLog";

/**
 * Hook to fetch product image log entries with optional filters.
 * @param {Object} options
 * @param {number} options.product_id - Filter by product ID
 * @param {number} options.created_by - Filter by employee ID
 * @param {string} options.date_from - From date (inclusive) YYYY-MM-DD
 * @param {string} options.date_to - To date (inclusive) YYYY-MM-DD
 * @param {number} options.limit - Max rows
 * @param {number} options.offset - Rows to skip
 * @param {boolean} options.enabled - Whether to fetch (default true)
 */
export function useProductImagesLog(options = {}) {
  const {
    product_id,
    created_by,
    date_from,
    date_to,
    limit = 10000,
    offset = 0,
    enabled = true,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await getProductImageLogs({
        product_id,
        created_by,
        date_from,
        date_to,
        limit,
        offset,
      });
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    product_id,
    created_by,
    date_from,
    date_to,
    limit,
    offset,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /** Group by user (created_by_employee), count unique product_ids per user */
  const byUser = useMemo(() => {
    const map = {};
    (data || []).forEach((row) => {
      const emp = row.created_by_employee;
      const name = emp?.employee_name ?? emp?.employee_code ?? "Unknown";
      const key = row.created_by ?? name;
      if (!map[key]) {
        map[key] = { name, productIds: new Set(), rows: [] };
      }
      map[key].productIds.add(row.product_id);
      map[key].rows.push(row);
    });
    return Object.entries(map).map(([id, { name, productIds, rows }]) => ({
      id,
      employeeName: name,
      uniqueProductCount: productIds.size,
      productIds: Array.from(productIds),
      rows,
    }));
  }, [data]);

  return {
    logs: data,
    byUser,
    loading,
    error,
    refetch: fetchLogs,
  };
}
