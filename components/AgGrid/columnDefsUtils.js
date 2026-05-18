import currencyFormatter from "../../util/currencyFormatter";

/**
 * Helpers for AgGrid column groups (nested `children` column defs).
 */

export function assignColumnIds(colDefs, seen = {}) {
  return (colDefs || []).map((colDef, index) => {
    if (colDef.children?.length) {
      return {
        ...colDef,
        children: assignColumnIds(colDef.children, seen),
      };
    }
    const base = colDef.colId ?? colDef.field ?? `col_${index}`;
    const count = (seen[base] = (seen[base] || 0) + 1);
    const colId = count === 1 ? base : `${base}_${count - 1}`;
    return { ...colDef, colId };
  });
}

export function applyColumnVisibility(colDefs, visibility) {
  return (colDefs || []).map((colDef) => {
    if (colDef.children?.length) {
      return {
        ...colDef,
        children: applyColumnVisibility(colDef.children, visibility),
      };
    }
    const colId = colDef.colId;
    const visible =
      typeof visibility[colId] === "boolean"
        ? visibility[colId]
        : colDef.hideByDefault !== true;
    return { ...colDef, hide: !visible };
  });
}

/** Leaf columns with stable colId and a label for the settings panel. */
export function collectLeafColumnMeta(colDefs, parentLabel = "") {
  const leaves = [];
  const seen = {};

  const walk = (defs, groupPath) => {
    (defs || []).forEach((colDef, index) => {
      if (colDef.children?.length) {
        const nextPath = groupPath
          ? `${groupPath} › ${colDef.headerName || ""}`
          : colDef.headerName || "";
        walk(colDef.children, nextPath);
        return;
      }

      let colId = colDef.colId;
      if (!colId) {
        const base = colDef.field ?? `col_${leaves.length}`;
        const count = (seen[base] = (seen[base] || 0) + 1);
        colId = count === 1 ? base : `${base}_${count - 1}`;
      }

      const leafLabel = colDef.headerName || colDef.field || colId;
      const headerName = groupPath ? `${groupPath} › ${leafLabel}` : leafLabel;

      leaves.push({ colDef, colId, headerName });
    });
  };

  walk(colDefs, parentLabel);
  return leaves;
}

export function walkColDefs(colDefs, visitor) {
  (colDefs || []).forEach((colDef, index) => {
    if (colDef.children?.length) {
      visitor(colDef, { isGroup: true, index });
      walkColDefs(colDef.children, visitor);
    } else {
      visitor(colDef, { isGroup: false, index });
    }
  });
}

export function buildEffectiveColDefMap(colDefs, getEffectiveColDef, map = {}) {
  walkColDefs(colDefs, (colDef) => {
    if (colDef.colId) {
      map[colDef.colId] = getEffectiveColDef(colDef);
    }
  });
  return map;
}

function isLeafColumnDef(def) {
  return !def?.children?.length;
}

function getExportCellValue(api, col, node, def) {
  if (typeof api.getCellValue === "function") {
    return api.getCellValue({ rowNode: node, colKey: col });
  }
  if (typeof api.getValue === "function") {
    return api.getValue(col, node);
  }
  if (def?.valueGetter && typeof def.valueGetter === "function") {
    return def.valueGetter({
      data: node.data,
      node,
      colDef: def,
      column: col,
      api,
      getValue: (field) => node.data?.[field],
      context: api?.getGridOption?.("context"),
    });
  }
  if (def?.field) return node.data?.[def.field];
  return null;
}

export function getExportableGridColumns(
  api,
  columnVisibility,
  effectiveColDefByColId = {}
) {
  if (!api) return [];

  return (api.getColumns() || []).filter((col) => {
    const colId = col.getColId();
    const def = effectiveColDefByColId[colId] || col.getColDef();
    if (!isLeafColumnDef(def)) return false;
    if (def.hideExport === true) return false;
    if (columnVisibility[colId] === false) return false;

    return Boolean(def.field || def.valueGetter || def.colId);
  });
}

export function getColumnExportHeader(column, api, exportHeaderByColId = {}) {
  const colId = column.getColId();
  if (exportHeaderByColId[colId]) return exportHeaderByColId[colId];
  if (api?.getDisplayNameForColumn) {
    return api.getDisplayNameForColumn(column, true) || "";
  }
  const def = column.getColDef();
  return def.headerName || colId || "";
}

/** Build aoa: [headerRow, ...dataRows] for CSV / XLSX. */
export function buildExportAoA(
  api,
  { columnVisibility, effectiveColDefByColId, exportHeaderByColId = {} }
) {
  const columns = getExportableGridColumns(
    api,
    columnVisibility,
    effectiveColDefByColId
  );
  if (!columns.length) return [];

  const headerRow = columns.map((col) =>
    getColumnExportHeader(col, api, exportHeaderByColId)
  );
  const dataRows = [];

  api.forEachNodeAfterFilter((node) => {
    if (node.group || !node.data) return;

    const row = columns.map((col) => {
      const colId = col.getColId();
      const def = effectiveColDefByColId[colId] || col.getColDef();
      let value = getExportCellValue(api, col, node, def);

      if (def.valueFormatter && typeof def.valueFormatter === "function") {
        value = def.valueFormatter({
          value,
          data: node.data,
          node,
          colDef: def,
          column: col,
          api,
        });
      }

      if (def.exportRenderer) {
        value = def.exportRenderer({
          value,
          data: node.data,
          node,
          column: col,
        });
      } else if (value != null && typeof value === "object") {
        value = value.label ?? "";
      } else if (
        def.type === "currency" &&
        value != null &&
        value !== "" &&
        !Number.isNaN(Number(value))
      ) {
        value = currencyFormatter(value);
      }

      if (value == null || value === "") return "";
      return String(value);
    });

    dataRows.push(row);
  });

  return [headerRow, ...dataRows];
}
