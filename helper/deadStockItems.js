import API from "../util/api";

/**
 * Dead stock items API — pivoted rows per product/outlet.
 * @see dailyneeds-store-backend/docs/dead-stock-items-api.md
 */
const deadStockItems = {
  /**
   * List dead stock items (pivoted by age bucket).
   * GET /dead-stock-items
   */
  list: () =>
    new Promise((resolve, reject) => {
      API.get("/dead-stock-items")
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data ?? []);
          } else {
            reject(
              new Error(res?.data?.msg ?? "Failed to fetch dead stock items")
            );
          }
        })
        .catch((err) => reject(err));
    }),
};

export default deadStockItems;
