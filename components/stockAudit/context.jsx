import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { VIEWERS, ADMIN } from "./permissions";
import { adapter, isLive, D } from "./data/adapter";
import { pickSeason } from "./data/season";

/** Cycles, stores, today and last sync: from the backend in DNDS Connect, sample in the preview. */
const SAMPLE_SEASONS = D.CYCLES.map((c) => ({ period_code: c.period_code, season_id: 1, name: c.name, start_date: c.start_date, end_date: c.end_date, deadline: c.deadline, status: c.status, current: true, stores: c.stores }));
const SAMPLE_META = { source: "SAMPLE", today: D.TODAY, last_sync: D.LAST_SYNC, cycles: D.CYCLES, seasons: SAMPLE_SEASONS, current_period: SAMPLE_SEASONS[0] ? SAMPLE_SEASONS[0].period_code : null, stores: D.STORES, warehouse: D.WAREHOUSE };

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
  const [meta, setMeta] = useState(isLive() ? null : SAMPLE_META);
  const [metaError, setMetaError] = useState(null);
  const [metaTick, setMetaTick] = useState(0);
  // seasons are created and changed by administrators only (the backend decides; preview: Admin persona)
  const isAdmin = isLive() ? Boolean(meta && meta.can_manage_seasons) : viewer.id === "admin";
  const can = (key) => (key === ADMIN ? isAdmin : viewer.keys.includes(key));
  useEffect(() => {
    if (!isLive()) return undefined;
    let live = true;
    adapter.meta().then((m) => live && setMeta(m)).catch((e) => live && setMetaError(e));
    return () => {
      live = false;
    };
  }, [metaTick]);
  // The season every screen works on: the one chosen earlier in this tab if it still exists,
  // else the current one (running today, else the latest started). Earlier seasons stay selectable.
  const [season, setSeasonState] = useState(() => (adapter.getPeriod ? adapter.getPeriod() : null));
  const seasons = (meta && meta.seasons) || [];
  const chooseSeason = (code) => {
    if (adapter.setPeriod) adapter.setPeriod(code);
    setSeasonState(code || null);
  };
  useEffect(() => {
    if (!meta) return;
    const code = pickSeason(meta, season);
    if (code !== season) chooseSeason(code);
  }, [meta]);
  const seasonInfo = seasons.find((x) => x.period_code === season) || null;
  const seasonReady = !isLive() || (Boolean(meta) && (Boolean(seasonInfo) || !seasons.length));
  const value = {
    path, params, go, dataState, setDataState, viewer, setViewerId, can, isAdmin, preview,
    meta: meta || { ...SAMPLE_META, source: "LOADING", cycles: [], seasons: [], stores: [], last_sync: null },
    metaError, metaReady: Boolean(meta), reloadMeta: () => setMetaTick((t) => t + 1),
    season, seasons, seasonInfo, chooseSeason, seasonReady,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStockAudit = () => useContext(Ctx);
