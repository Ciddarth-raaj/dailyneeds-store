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

  // Start a sync now. Stock & Prices, GRNs, Article Store Master and Distributors run in the background; Products,
  // Purchases and Debit Notes answer when done.
  start: async (key) => {
    if (key === "stock") return unwrap(API.post("/retailpilot/stock-sync", {}), "Failed to start the sync");
    if (key === "grn") return unwrap(API.post("/retailpilot/grn-sync", {}), "Failed to start the sync");
    if (key === "article_store_master") {
      return unwrap(API.post("/retailpilot/article-store-master-sync", {}), "Failed to start the build");
    }
    if (key === "suppliers") return unwrap(API.post("/retailpilot/supplier-sync", {}), "Failed to start the distributor sync");
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
    if (key === "debit_notes") {
      // 45 days: a run by hand also catches up on everything since RetailPilot
      // started raising debit notes (12 Oct 2026). Approved and Accounts-saved
      // debit notes are never overwritten, so re-reading them is harmless.
      return unwrap(API.post("/debit-note/retailpilot-sync", { days: 45, dry_run: false }), "Debit note sync failed");
    }
    throw new Error(`Unknown sync ${key}`);
  },
};

export default retailPilotSync;
