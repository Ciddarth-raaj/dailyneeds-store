import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Button, Checkbox, Flex, Select, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useStockAudit } from "../context";
import { adapter, useLoad, isLive } from "../data/adapter";
import { Cell, DataList, FilterBar, Pill, PreviewButton, Section, StatCard, StatGrid, BRAND, fmtNum, fmtDateTime } from "../ui";
import { Screen, Loader, StoreSelect, CycleSelect, useScope, useInitialOutlet } from "./common";

export function AllotmentReport() {
  const { dataState, go } = useStockAudit();
  const scope = useScope();
  const initialOutlet = useInitialOutlet();
  const [outlet, setOutlet] = useState(initialOutlet);
  const [page, setPage] = useState(1);
  const s = useLoad(() => adapter.employees({ state: dataState, outlets: outlet ? [Number(outlet)] : scope, page, size: 15, sort: "allotted" }), [dataState, outlet, page]);
  return (
    <Screen
      title="Article Allotment Report"
      subtitle="Read-only. Allotment is done in RetailPilot and imported here; DNDS never creates or edits an allotment."
      actions={<Button size="sm" colorScheme="purple" onClick={() => go("import")}>Import allotment CSVs</Button>}
    >
      {!isLive() && dataState !== "allotment" ? (
        <Box p={3} mb={3} bg="gray.50" borderRadius="md" fontSize="sm">No allotment imported for this season yet: allotted, pending and completion stay <b>Unavailable</b>. Actual audits are shown.</Box>
      ) : null}
      <FilterBar>
        <StoreSelect value={outlet} onChange={(v) => { setOutlet(v); setPage(1); }} />
        <CycleSelect />
      </FilterBar>
      <Loader s={s}>
        {(d) => (
          <DataList
            rows={d.rows} page={d.page} pages={d.pages} total={d.total} onPage={setPage} keyOf={(r) => r.rp_user_id}
            onRowClick={(r) => go("articles", { user: r.rp_user_id })}
            columns={[
              { key: "name", label: "Employee", primary: true, render: (r) => r.name || r.rp_name },
              { key: "store", label: "Branch", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.store}</Text> },
              { key: "allotted", label: "Allotted", numeric: true, mobileRight: true, render: (r) => <Cell c={r.allotted_c} /> },
              { key: "audited", label: "Audited", numeric: true, render: (r) => fmtNum(r.audited) },
              { key: "pending", label: "Pending", numeric: true, render: (r) => <Cell c={r.pending_c} /> },
              { key: "completion", label: "Completion", numeric: true, render: (r) => <Cell c={r.completion_c} kind="pct" /> },
              { key: "source", label: "Allotment source", render: (r) => (isLive() ? (r.allotted == null ? <Pill color="gray">Not imported</Pill> : <Pill color="green">RetailPilot CSV</Pill>) : dataState === "allotment" ? <Pill color="orange">Sample CSV</Pill> : <Pill color="gray">None</Pill>) },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}

export function AllotmentHistory() {
  const s = useLoad(() => adapter.allotmentUploads(), []);
  return (
    <Screen title="Upload & Allotment Revision History" subtitle="Every bulk upload is kept with its original CSV files. A corrected file becomes that auditor's next revision; audit history is never deleted." back={{ label: "Allotment report", path: "allotment" }}>
      <Loader s={s}>
        {(rows) => (
          <DataList
            rows={rows} keyOf={(r) => r.upload_id}
            columns={[
              { key: "file", label: "Upload", primary: true, render: (r) => <span>{r.file}</span> },
              { key: "stores", label: "Stores", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.stores} · {fmtDateTime(r.at)}</Text> },
              { key: "status", label: "Status", mobileRight: true, render: (r) => <Pill color="orange">{r.status}</Pill> },
              { key: "files", label: "Files", numeric: true, render: (r) => fmtNum(r.files) },
              { key: "imported", label: "Imported", numeric: true, render: (r) => fmtNum(r.imported) },
              { key: "revisions", label: "Corrected (new revision)", numeric: true, render: (r) => fmtNum(r.revisions) },
              { key: "already", label: "Already imported", numeric: true, render: (r) => fmtNum(r.already) },
              { key: "rejected", label: "Rejected", numeric: true, render: (r) => fmtNum(r.rejected) },
              { key: "auditable", label: "Auditable (Y)", numeric: true, render: (r) => fmtNum(r.auditable) },
              { key: "na", label: "Not auditable (N)", numeric: true, render: (r) => fmtNum(r.not_auditable) },
              { key: "by", label: "By", render: (r) => r.by },
              { key: "orig", label: "Original files", render: () => <PreviewButton size="xs" variant="link" colorScheme="purple" label="Download original files">Download</PreviewButton> },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}
