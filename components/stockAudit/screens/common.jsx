import { SCREENS, allowed } from "../registry";
import React from "react";
import { Box, Button, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import { SampleBanner, SelectField, BRAND, fmtDateTime } from "../ui";
import { isLive } from "../data/adapter";

/** Seasons, stores, today, last sync (see context.jsx). */
export const useMeta = () => useStockAudit().meta;

export function Screen({ title, subtitle, actions, children, back, sampleNote }) {
  const { go } = useStockAudit();
  return (
    <Box>
      <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" mb={3} gap={2} direction={{ base: "column", md: "row" }}>
        <Box minW={0}>
          {back ? (
            <Button size="xs" variant="link" color={BRAND.purple} mb={1} onClick={() => go(back.path, back.params)}>← {back.label}</Button>
          ) : null}
          <Heading size="md" color="gray.800">{title}</Heading>
          {subtitle ? <Text fontSize="sm" color="gray.500" mt={0.5}>{subtitle}</Text> : null}
        </Box>
        {actions ? <Flex gap={2} wrap="wrap">{actions}</Flex> : null}
      </Flex>
      {isLive() ? null : <SampleBanner note={sampleNote} />}
      {children}
    </Box>
  );
}

export function Loader({ s, children }) {
  if (s.loading && !s.data) return <Flex p={10} justify="center"><Spinner color={BRAND.purple} /></Flex>;
  if (s.error) return <Box p={4} bg="red.50" color="red.700" borderRadius="md" fontSize="sm">Could not load: {String(s.error.message || s.error)}</Box>;
  if (s.data == null) return <Box p={6} textAlign="center" color="gray.500">Not found</Box>;
  return children(s.data);
}

/** Store choices limited to what the viewer may see (the backend enforces the same scope). */
export function StoreSelect({ value, onChange, allowAll = true, label = "Branch" }) {
  const { viewer, meta } = useStockAudit();
  // live: the backend already returns only the stores this caller may see
  const stores = meta.stores.filter((s) => !viewer.outlets || viewer.outlets.includes(s.outlet_id));
  const all = isLive() ? stores.length > 1 : !viewer.outlets;
  const options = [...(allowAll && all ? [{ value: "", label: isLive() ? "All my stores" : "All five stores" }] : []), ...stores.map((s) => ({ value: String(s.outlet_id), label: s.name }))];
  return <SelectField label={label} value={value} onChange={onChange} options={options} />;
}

/** The season the module works on (the same choice as the header picker). */
export function SeasonSelect() {
  const { seasons, season, chooseSeason } = useStockAudit();
  return (
    <SelectField label="Season" value={season || ""} onChange={chooseSeason}
      options={seasons.length ? seasons.map((x) => ({ value: x.period_code, label: `${x.name}${x.current ? " (current)" : ""}` })) : [{ value: "", label: "No season yet" }]} />
  );
}
/** @deprecated name: the user-facing record is the season. */
export const CycleSelect = SeasonSelect;

/** Today back to the programme start (25 Nov 2026). */
export function DateSelect({ value, onChange }) {
  const { meta } = useStockAudit();
  const days = [];
  for (let t = Date.parse(`${meta.today}T00:00:00Z`); t >= Date.parse("2026-11-25T00:00:00Z") && days.length < 60; t -= 86400000) days.push(new Date(t).toISOString().slice(0, 10));
  const label = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return <SelectField label="Date" value={value} onChange={onChange} options={days.map((d) => ({ value: d, label: d === meta.today ? `Today, ${label(d)}` : label(d) }))} />;
}

export const Freshness = () => {
  const { meta } = useStockAudit();
  return <Text fontSize="xs" color="gray.500">Last successful sync: {meta.last_sync ? fmtDateTime(meta.last_sync) : "none yet"}{isLive() ? "" : " (sample)"}</Text>;
};

/** The outlets a viewer is scoped to (null = all). */
/** Store filter's starting value: the store a tile was tapped for (if in scope), else the caller's own store, else all. */
export function useInitialOutlet() {
  const { viewer, params } = useStockAudit();
  const scope = viewer.outlets;
  const p = params && params.outlet ? Number(params.outlet) : null;
  if (p && (!scope || scope.includes(p))) return String(p);
  return scope ? String(scope[0]) : "";
}

/** onClick for a dashboard tile: opens the detail screen, or nothing when the viewer may not open it. */
export function useNav() {
  const { go, can } = useStockAudit();
  return (path, params) => {
    const sc = SCREENS.find((x) => x.path === path);
    return sc && allowed(sc, can) ? () => go(path, params) : undefined;
  };
}

export function useScope() {
  const { viewer } = useStockAudit();
  return viewer.outlets;
}

export function NoAccess({ what }) {
  return <Box p={6} bg="gray.50" borderRadius="md" textAlign="center" color="gray.600" fontSize="sm">You do not have permission to view {what}. The backend refuses the request in the same way.</Box>;
}
