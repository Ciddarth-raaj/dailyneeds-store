import API from "../util/api";
import product from "./product";
import { runRetailPilotPurchaseSync } from "./purchase";

const unwrap = async (request, fallback) => {
  const res = await request;
  const body = res?.data ?? {};
  if (body.code === 200) return body;
  throw new Error(body.msg || body.message || fallback);
};

const retailPilotSync = {
  // Each RetailPilot sync: last run, last success, schedule, running now.
  status: () =>
    unwrap(API.get("/retailpilot/status"), "Failed to fetch RetailPilot sync status").then((b) => b.data ?? []),

  // Start a sync now. Stock & Prices, GRNs and Article Store Master run in the background; Products
  // and Purchases answer when done.
  start: async (key) => {
    if (key === "stock") return unwrap(API.post("/retailpilot/stock-sync", {}), "Failed to start the sync");
    if (key === "grn") return unwrap(API.post("/retailpilot/grn-sync", {}), "Failed to start the sync");
    if (key === "article_store_master") {
      return unwrap(API.post("/retailpilot/article-store-master-sync", {}), "Failed to start the build");
    }
    if (key === "products") {
      return product.sync().catch((err) => {
        throw new Error(typeof err === "string" ? err : err?.message || "Product sync failed");
      });
    }
    if (key === "purchases") {
      const body = await runRetailPilotPurchaseSync({ dryRun: false });
      if (body?.code !== 200) throw new Error(body?.msg || body?.message || "Purchase sync failed");
      return body;
    }
    throw new Error(`Unknown sync ${key}`);
  },
};

export default retailPilotSync;
