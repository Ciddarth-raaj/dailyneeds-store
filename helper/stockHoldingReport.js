import API from "../util/api";

export const REPORT_UPLOAD_BATCH_SIZE = 5000;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const getStockHoldingReports = () => {
  return API.get("/stock-holding-report/").then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.message || "Failed to fetch stock holding reports");
  });
};

export const createStockHoldingReport = (payload) => {
  return API.post("/stock-holding-report/", payload).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200 || data?.code === 201) return data;
    throw new Error(data?.message || "Failed to create stock holding report");
  });
};

export const appendStockHoldingReportItems = (
  reportId,
  items,
  { finalize = false } = {}
) => {
  return API.post(`/stock-holding-report/${reportId}/items`, {
    items,
    finalize,
  }).then(
    (res) => {
      const data = res?.data ?? res;
      if (data?.code === 200) return data;
      throw new Error(data?.message || "Failed to append stock holding items");
    }
  );
};

export const createStockHoldingReportBatched = async (
  payload,
  { onProgress } = {}
) => {
  const { report_name, date, items = [] } = payload;

  if (!items.length) {
    return createStockHoldingReport({ report_name, date });
  }

  if (items.length <= REPORT_UPLOAD_BATCH_SIZE) {
    return createStockHoldingReport({ report_name, date, items });
  }

  const headerResponse = await createStockHoldingReport({ report_name, date });
  if (headerResponse?.code !== 200 && headerResponse?.code !== 201) {
    return headerResponse;
  }

  const reportId = headerResponse?.data?.stock_holding_report_id;
  if (!reportId) {
    throw new Error("Missing stock holding report id from create response");
  }

  const batches = chunkArray(items, REPORT_UPLOAD_BATCH_SIZE);
  for (let i = 0; i < batches.length; i++) {
    const isLastBatch = i === batches.length - 1;
    const batchResponse = await appendStockHoldingReportItems(
      reportId,
      batches[i],
      { finalize: isLastBatch }
    );
    if (batchResponse?.code !== 200) {
      throw batchResponse;
    }
    onProgress?.({
      batch: i + 1,
      totalBatches: batches.length,
      itemCount: batchResponse?.data?.item_count,
    });
  }

  return {
    ...headerResponse,
    data: {
      ...headerResponse.data,
      item_count: items.length,
    },
  };
};

export const deleteStockHoldingReport = (id) => {
  return API.delete(`/stock-holding-report/${id}`).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.message || "Failed to delete stock holding report");
  });
};

export const getLatestStockHoldingReportByDate = (
  date,
  { onProgress, signal } = {}
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const allItems = [];
      let offset = 0;
      let header = null;
      let reportId = null;
      let hasMore = true;

      while (hasMore) {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }

        const params = {
          date,
          limit: REPORT_UPLOAD_BATCH_SIZE,
          offset,
        };
        if (reportId != null) {
          params.report_id = reportId;
        }

        const res = await API.get("/stock-holding-report/latest/items", {
          params,
          signal,
        });
        const data = res?.data ?? res;

        if (data?.code === 404 && offset === 0) {
          resolve(data);
          return;
        }
        if (data?.code !== 200) {
          reject(new Error(data?.message || "Failed to fetch report items"));
          return;
        }

        const page = data?.data || {};
        if (page.stock_holding_report_id != null) {
          reportId = page.stock_holding_report_id;
        }
        if (!header) {
          const {
            items: _items,
            total,
            limit,
            offset: _offset,
            has_more,
            ...rest
          } = page;
          header = { ...rest, total };
        }

        const items = Array.isArray(page.items) ? page.items : [];
        allItems.push(...items);

        onProgress?.({
          loaded: allItems.length,
          total: page.total ?? header?.total ?? null,
        });

        if (!items.length) break;

        hasMore =
          Boolean(page.has_more) && items.length >= REPORT_UPLOAD_BATCH_SIZE;
        offset += items.length;
      }

      resolve({
        code: 200,
        message: "Latest stock holding report fetched successfully",
        data: {
          ...header,
          items: allItems,
        },
      });
    } catch (err) {
      if (
        signal?.aborted ||
        err?.code === "ERR_CANCELED" ||
        err?.name === "AbortError" ||
        err?.name === "CanceledError"
      ) {
        reject(err);
        return;
      }
      reject(err);
    }
  });
};
