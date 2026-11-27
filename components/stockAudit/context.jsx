import React, { createContext, useContext, useMemo, useState } from "react";
import { VIEWERS } from "./permissions";

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
  const value = { path, params, go, dataState, setDataState, viewer, setViewerId, can, preview };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStockAudit = () => useContext(Ctx);
