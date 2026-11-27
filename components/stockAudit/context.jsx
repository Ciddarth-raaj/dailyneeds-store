import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { VIEWERS } from "./permissions";
import { adapter, isLive, D } from "./data/adapter";

/** Cycles, stores, today and last sync: from the backend in DNDS Connect, sample in the preview. */
const SAMPLE_META = { source: "SAMPLE", today: D.TODAY, last_sync: D.LAST_SYNC, cycles: D.CYCLES, stores: D.STORES, warehouse: D.WAREHOUSE };

/**
 * Stock Audit module context: where to navigate, who is looking, and which
 * data state the preview shows. `go(path, params)` is supplied by the host:
 * next/router inside DNDS Connect, a hash router in the standalone preview.
 */
const Ctx = createContext(null);

export function StockAuditProvider({ children, path, params = {}, go, permissionKeys = null, outletScope = null, preview = true }) {
  const [dataState, setDataState] = useState("allotment");
  const [viewerId, setViewerId] = useState("admin");
  const viewer = useMemo(() => {
    // Inside DNDS Connect the signed-in user's keys decide; personas only in the preview.
    if (!preview && permissionKeys) return { id: "user", label: "You", keys: permissionKeys, outlets: outletScope };
    return VIEWERS.find((v) => v.id === viewerId) || VIEWERS[0];
  }, [preview, permissionKeys, outletScope, viewerId]);
  const can = (key) => viewer.keys.includes(key);
  const [meta, setMeta] = useState(isLive() ? null : SAMPLE_META);
  const [metaError, setMetaError] = useState(null);
  useEffect(() => {
    if (!isLive()) return undefined;
    let live = true;
    adapter.meta().then((m) => live && setMeta(m)).catch((e) => live && setMetaError(e));
    return () => {
      live = false;
    };
  }, []);
  const value = { path, params, go, dataState, setDataState, viewer, setViewerId, can, preview, meta: meta || { ...SAMPLE_META, source: "LOADING", cycles: [], stores: [], last_sync: null }, metaError, metaReady: Boolean(meta) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStockAudit = () => useContext(Ctx);
