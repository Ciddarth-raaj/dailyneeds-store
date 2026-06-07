import API from "../util/api";

/**
 * Product Distributors API — master data from product_distributor_master + buyer mapping via cid.
 * Base path: /product-distributors
 * CID is the primary key for buyer assignment; MDM_DIST_CODE is the medishop code (purchase flows).
 */

export const getProductDistributors = () => {
  return API.get("/product-distributors").then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch distributors");
  });
};

export const getProductDistributorByCid = (cid) => {
  return API.get(
    `/product-distributors/${encodeURIComponent(cid)}`
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data.data;
    if (data?.code === 404) return null;
    throw new Error(data?.msg || "Failed to fetch distributor");
  });
};

/** @deprecated Use getProductDistributorByCid */
export const getProductDistributorByCode = getProductDistributorByCid;

/** Upsert buyer mapping: { CID, buyer_id?: number|null } */
export const upsertProductDistributorMapping = (body) => {
  return API.post("/product-distributors", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to save buyer assignment");
  });
};

/**
 * Bulk upsert buyer mappings. 1–2000 items; duplicate CIDs: last wins.
 * Body: { items: [{ CID, buyer_id: number|null }, ...] }
 */
export const bulkUpsertProductDistributorMappings = (items) => {
  return API.post("/product-distributors/bulk", { items }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to bulk import distributor buyers");
  });
};

/**
 * Bulk update holding days on product_distributor_master by cid.
 * Body: { items: [{ cid, holding_days }, ...] }
 */
export const bulkImportProductDistributorHoldingDays = (items) => {
  return API.post("/product-distributors/bulk/holding-days", { items }).then(
    (res) => {
      const data = res?.data ?? res;
      if (data?.code === 200) return data;
      throw new Error(data?.msg || "Failed to import holding days");
    }
  );
};

/** @deprecated Use upsertProductDistributorMapping */
export const createProductDistributor = upsertProductDistributorMapping;

export const deleteProductDistributor = (cid) => {
  return API.delete(
    `/product-distributors/${encodeURIComponent(cid)}`
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to delete distributor");
  });
};
