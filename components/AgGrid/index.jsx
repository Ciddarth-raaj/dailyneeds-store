import { themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import React from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Flex,
  IconButton,
  useDisclosure,
  VStack,
  Text,
  Checkbox,
  Box,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Button,
  Image,
  Tooltip,
  Link,
  Select,
} from "@chakra-ui/react";
import { icons } from "./icons";
import { capitalize } from "../../util/string";
import currencyFormatter from "../../util/currencyFormatter";
import Badge from "../Badge";
import CustomMenu from "../CustomMenu";
import BadgeFilter, { badgeFilterHandler } from "./BadgeFilter";
import DropdownFilter, { dropdownFilterHandler } from "./DropdownFilter";
import Drawer from "../Drawer";
import toast from "react-hot-toast";
import moment from "moment";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";
import {
  applyColumnVisibility,
  assignColumnIds,
  buildEffectiveColDefMap,
  buildExportAoA,
  buildExportAoAFromRows,
  collectLeafColumnMeta,
} from "./columnDefsUtils";

const COLUMN_STORAGE_PREFIX = "aggrid-columns-";
const PAGE_SIZE_OPTIONS = [20, 50, 100];

function formatPaginationCount(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function parseGridDate(value) {
  if (value == null || value === "") return null;
  const dateOnly = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function PaginationNavButton({ label, iconClass, disabled, onClick }) {
  return (
    <Box
      as="button"
      type="button"
      aria-label={label}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      w="28px"
      h="28px"
      border="none"
      bg="transparent"
      cursor={disabled ? "default" : "pointer"}
      opacity={disabled ? 0.35 : 0.7}
      color="gray.600"
      _hover={disabled ? undefined : { opacity: 1 }}
      onClick={disabled ? undefined : onClick}
    >
      <i className={iconClass} style={{ fontSize: "12px" }} />
    </Box>
  );
}

function TablePaginationBar({
  isServer,
  page,
  pageSize,
  totalRows,
  onPageChange,
  gridRef,
  borderColor = "gray.200",
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const totalPages = Math.max(1, Math.ceil((totalRows || 0) / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = totalRows === 0 ? 0 : safePage * pageSize + 1;
  const end = Math.min((safePage + 1) * pageSize, totalRows);

  const goToPage = (nextPage) => {
    const clamped = Math.min(Math.max(nextPage, 0), totalPages - 1);
    if (clamped === safePage) return;
    if (isServer) {
      onPageChange?.({ page: clamped, pageSize, offset: clamped * pageSize });
      return;
    }
    gridRef.current?.api?.paginationGoToPage?.(clamped);
  };

  const changePageSize = (nextPageSize) => {
    if (nextPageSize === pageSize) return;
    if (isServer) {
      onPageChange?.({ page: 0, pageSize: nextPageSize, offset: 0 });
      return;
    }
    const api = gridRef.current?.api;
    if (!api) return;
    api.setGridOption?.("paginationPageSize", nextPageSize);
    api.paginationGoToPage?.(0);
  };

  return (
    <Flex
      align="center"
      justify="flex-end"
      h="48px"
      px={4}
      gap={4}
      flexWrap="wrap"
      fontSize="13px"
      color="gray.600"
      bg="white"
      borderTopWidth="0.5px"
      borderColor={borderColor}
    >
      <Flex align="center" gap={2}>
        <Text whiteSpace="nowrap">Page Size:</Text>
        <Select
          size="sm"
          w="64px"
          h="28px"
          minH="28px"
          fontSize="13px"
          borderColor="gray.300"
          borderRadius="sm"
          value={pageSize}
          onChange={(e) => {
            const nextPageSize = Number(e.target.value) || pageSize;
            changePageSize(nextPageSize);
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
      </Flex>
      <Text whiteSpace="nowrap">
        {totalRows === 0
          ? "0 to 0 of 0"
          : `${formatPaginationCount(start)} to ${formatPaginationCount(end)} of ${formatPaginationCount(totalRows)}`}
      </Text>
      <Flex align="center" gap={0}>
        <PaginationNavButton
          label="First page"
          iconClass="fa-solid fa-angles-left"
          disabled={safePage <= 0}
          onClick={() => goToPage(0)}
        />
        <PaginationNavButton
          label="Previous page"
          iconClass="fa-solid fa-angle-left"
          disabled={safePage <= 0}
          onClick={() => goToPage(safePage - 1)}
        />
        <Text whiteSpace="nowrap" px={2}>
          Page {safePage + 1} of {totalPages}
        </Text>
        <PaginationNavButton
          label="Next page"
          iconClass="fa-solid fa-angle-right"
          disabled={safePage >= totalPages - 1}
          onClick={() => goToPage(safePage + 1)}
        />
        <PaginationNavButton
          label="Last page"
          iconClass="fa-solid fa-angles-right"
          disabled={safePage >= totalPages - 1}
          onClick={() => goToPage(totalPages - 1)}
        />
      </Flex>
    </Flex>
  );
}

function buildAgGridTheme(colorScheme) {
  const c = colorScheme || "purple";
  return themeQuartz.withParams({
    accentColor: `var(--chakra-colors-${c}-500)`,
    headerBackgroundColor: `var(--chakra-colors-${c}-50)`,
    headerTextColor: `var(--chakra-colors-${c}-700)`,
    fontFamily: "inherit",
    borderColor: `var(--chakra-colors-${c}-100)`,
    borderWidth: "0.5px",
    textColor: "var(--chakra-colors-gray-600)",
    fontSize: "13px",
  });
}

function loadColumnVisibility(tableKey, colDefs) {
  if (!tableKey || typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${COLUMN_STORAGE_PREFIX}${tableKey}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (_e) {
    // ignore parse errors
  }
  return null;
}

function saveColumnVisibility(tableKey, visibility) {
  if (!tableKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${COLUMN_STORAGE_PREFIX}${tableKey}`,
      JSON.stringify(visibility)
    );
  } catch (_e) {
    // ignore
  }
}

const AgGrid = React.forwardRef(function AgGrid(
  {
    rowData,
    colDefs,
    columnDefs,
    gridOptions: gridOptionsProp,
    defaultRows = 20,
    className,
    tableKey,
    selectMode = false,
    isRowSelectable,
    onSelectionChanged,
    getRowId,
    tableColorScheme,
    paginationMode = "client",
    totalRows,
    onPageChange,
    paginationPage = 0,
    loading = false,
    sortMode = "client",
    sort: sortState,
    onSortChange,
    onExportAll,
    exportLoading = false,
    filterMode = "client",
    onFilterChange,
    ...props
  },
  ref
) {
  const isServerPagination = paginationMode === "server";
  const isServerSort = isServerPagination && sortMode === "server";
  const isServerFilter = isServerPagination && filterMode === "server";
  const { colorScheme: contextColorScheme } = useModuleTableTheme();
  const effectiveColorScheme =
    tableColorScheme ?? contextColorScheme ?? "purple";
  const agGridTheme = React.useMemo(
    () => buildAgGridTheme(effectiveColorScheme),
    [effectiveColorScheme]
  );

  const gridRef = React.useRef(null);
  const onSelectionChangedRef = React.useRef(onSelectionChanged);
  onSelectionChangedRef.current = onSelectionChanged;
  const combinedRef = React.useCallback(
    (el) => {
      gridRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref]
  );

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [hasDrawerMounted, setHasDrawerMounted] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setHasDrawerMounted(true);
  }, [isOpen]);

  React.useEffect(() => {
    if (!selectMode && gridRef.current?.api) {
      gridRef.current.api.deselectAll();
    }
  }, [selectMode]);

  /** Let autoHeight columns (e.g. image) measure after data / layout. */
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        gridRef.current?.api?.resetRowHeights?.();
      } catch (_e) {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [rowData]);

  const rawColDefs = React.useMemo(
    () => columnDefs ?? colDefs ?? [],
    [columnDefs, colDefs]
  );

  const colDefsWithIds = React.useMemo(
    () => assignColumnIds(rawColDefs),
    [rawColDefs]
  );

  const leafColumnMeta = React.useMemo(
    () => collectLeafColumnMeta(colDefsWithIds),
    [colDefsWithIds]
  );

  const columnTypesForVisibility = React.useMemo(() => {
    const base = {
      id: {},
      capitalized: {},
      "action-column": {},
      "badge-column": {},
    };
    return { ...base, ...(gridOptionsProp?.columnTypes || {}) };
  }, [gridOptionsProp?.columnTypes]);

  const initialColumnVisibility = React.useMemo(() => {
    const stored = loadColumnVisibility(tableKey, rawColDefs);
    const visibility = {};
    leafColumnMeta.forEach(({ colDef, colId }) => {
      if (stored && typeof stored[colId] === "boolean") {
        visibility[colId] = stored[colId];
      } else {
        const typeDef = colDef.type
          ? columnTypesForVisibility[colDef.type]
          : null;
        const effectiveHideByDefault =
          colDef.hideByDefault ?? typeDef?.hideByDefault;
        visibility[colId] = effectiveHideByDefault !== true;
      }
    });
    return visibility;
  }, [tableKey, rawColDefs, leafColumnMeta, columnTypesForVisibility]);

  const [columnVisibility, setColumnVisibility] = React.useState(
    initialColumnVisibility
  );

  React.useEffect(() => {
    setColumnVisibility(initialColumnVisibility);
  }, [tableKey, initialColumnVisibility]);

  const resolvedColumnDefs = React.useMemo(
    () => applyColumnVisibility(colDefsWithIds, columnVisibility),
    [colDefsWithIds, columnVisibility]
  );

  const columnDefsForGrid = React.useMemo(() => {
    if (!isServerSort || !sortState?.field) {
      return resolvedColumnDefs.map((colDef) => ({ ...colDef, sort: null }));
    }
    return resolvedColumnDefs.map((colDef) => {
      const key = colDef.field || colDef.colId;
      if (key === sortState.field) {
        return { ...colDef, sort: sortState.dir };
      }
      return { ...colDef, sort: null };
    });
  }, [resolvedColumnDefs, isServerSort, sortState]);

  const handleSortChanged = React.useCallback(() => {
    if (!isServerSort || !onSortChange) return;
    const api = gridRef.current?.api;
    if (!api) return;
    const model = api.getColumnState?.() || [];
    const sorted = model.find((col) => col.sort);
    if (!sorted) {
      onSortChange(null);
      return;
    }
    const matchedCol = colDefsWithIds.find(
      (col) => (col.colId || col.field) === sorted.colId
    );
    onSortChange({
      field: matchedCol?.field || sorted.colId,
      dir: sorted.sort === "asc" ? "asc" : "desc",
    });
  }, [colDefsWithIds, isServerSort, onSortChange]);

  const filterDebounceRef = React.useRef(null);
  const onFilterChangeRef = React.useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  const handleFilterChanged = React.useCallback(() => {
    if (!isServerFilter || !onFilterChangeRef.current) return;
    const api = gridRef.current?.api;
    if (!api) return;
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      onFilterChangeRef.current(api.getFilterModel?.() || {});
    }, 400);
  }, [isServerFilter]);

  React.useEffect(
    () => () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    },
    []
  );

  const [clientPagination, setClientPagination] = React.useState({
    page: 0,
    pageSize: defaultRows,
    total: 0,
  });

  const syncClientPagination = React.useCallback(() => {
    if (isServerPagination) return;
    const api = gridRef.current?.api;
    if (!api) return;
    setClientPagination({
      page: api.paginationGetCurrentPage?.() ?? 0,
      pageSize: api.paginationGetPageSize?.() ?? defaultRows,
      total: api.paginationGetRowCount?.() ?? 0,
    });
  }, [defaultRows, isServerPagination]);

  const handleClientPaginationChanged = React.useCallback(() => {
    syncClientPagination();
  }, [syncClientPagination]);

  React.useEffect(() => {
    syncClientPagination();
  }, [rowData, defaultRows, syncClientPagination]);

  const handleColumnVisibilityChange = React.useCallback(
    (colId, visible) => {
      const next = { ...columnVisibility, [colId]: visible };
      setColumnVisibility(next);
      if (gridRef.current?.api) {
        gridRef.current.api.setColumnsVisible([colId], visible);
      }
      if (tableKey) saveColumnVisibility(tableKey, next);
    },
    [columnVisibility, tableKey]
  );

  const mergedGridOptions = React.useMemo(() => {
    const cs = effectiveColorScheme;
    const defaultColDef = {
      resizable: true,
      sortable: true,
      filter: true,
      flex: 1,
      sortingOrder: ["asc", "desc", null],
      cellRenderer: (props) => {
        if (!props || props.value === undefined) return "-";
        if (props.value === null || props.value === "") return "-";
        if (typeof props.value === "object") return "-";
        return String(props.value);
      },
    };
    const baseOptions = {
      suppressColumnVirtualisation: false,
      suppressRowVirtualisation: false,
      animateRows: true,
      pagination: !isServerPagination,
      paginationPageSize: defaultRows,
      paginationPageSizeSelector: PAGE_SIZE_OPTIONS,
      suppressPaginationPanel: true,
      ...(isServerFilter
        ? {
            isExternalFilterPresent: () => true,
            doesExternalFilterPass: () => true,
          }
        : {}),
      icons,
      enableFilterHandlers: true,
      filterHandlers: {
        badgeFilterHandler: badgeFilterHandler,
        dropdownFilterHandler: dropdownFilterHandler,
      },
      columnTypes: {
        id: {
          maxWidth: 100,
          resizable: false,
        },
        capitalized: {
          cellRenderer: (props) => {
            if (!props || props.value === undefined || props.value === null)
              return "-";
            if (
              typeof props.value !== "string" &&
              typeof props.value !== "number"
            )
              return "-";
            return capitalize(String(props.value));
          },
        },
        date: {
          filter: "agDateColumnFilter",
          valueGetter: (params) => {
            const field = params.colDef?.field;
            if (!field || !params.data) return null;
            return parseGridDate(params.data[field]);
          },
          cellRenderer: (params) => {
            if (!params.value) return "-";
            const strict = moment(params.value, "YYYY-MM-DD", true);
            return (strict.isValid() ? strict : moment(params.value)).format(
              "DD/MM/YYYY"
            );
          },
        },
        datetime: {
          minWidth: 180,
          cellRenderer: (params) =>
            params.value
              ? moment(params.value).format("DD/MM/YYYY • hh:mm A")
              : "-",
        },
        currency: {
          cellRenderer: (params) => {
            if (params.value === undefined || params.value === null) return "-";
            const num = Number(params.value);
            if (Number.isNaN(num)) return "-";
            return currencyFormatter(num);
          },
        },
        image: {
          autoHeight: true,
          minWidth: 80,
          cellStyle: {
            lineHeight: 1,
            paddingTop: 4,
            paddingBottom: 4,
          },
          cellRenderer: (params) => {
            if (!params.value) return null;
            const bumpRowHeight = () => {
              try {
                params.api?.resetRowHeights?.();
              } catch (_e) {
                /* ignore */
              }
            };
            return (
              <Box
                w="100%"
                minW={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                lineHeight={1}
              >
                <Image
                  src={params.value}
                  alt=""
                  onLoad={bumpRowHeight}
                  onError={bumpRowHeight}
                  sx={{
                    minWidth: 0,
                    maxWidth: "100%",
                    maxHeight: "120px",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    verticalAlign: "middle",
                  }}
                  borderRadius="md"
                />
              </Box>
            );
          },
        },
        "action-column": {
          hideExport: true,
          filter: false,
          resizable: false,
          flex: 0,
          maxWidth: 100,
          minWidth: 100,
          width: 100,
          cellRenderer: (props) => {
            if (!props) return null;
            const items = Array.isArray(props.value) ? props.value : [];
            return (
              <Flex justifyContent="center" alignItems="center" height={"100%"}>
                <CustomMenu items={items} />
              </Flex>
            );
          },
        },
        "action-icons": {
          hideExport: true,
          filter: false,
          resizable: false,
          flex: 0,
          width: 130,
          maxWidth: 130,
          minWidth: 130,
          cellRenderer: (props) => {
            if (!props) return null;
            const items = Array.isArray(props.value) ? props.value : [];

            const ICON_TYPES = {
              view: "fa-solid fa-eye",
              edit: "fa-solid fa-pen",
              delete: "fa-solid fa-trash",
            };

            return (
              <Flex
                justifyContent="center"
                alignItems="center"
                height={"100%"}
                gap={1}
              >
                {items.map((item) => {
                  const icon = ICON_TYPES[item.iconType] || item.icon;

                  const btn = (
                    <Tooltip label={item.label} key={item.label}>
                      <IconButton
                        variant="ghost"
                        colorScheme={item.colorScheme || cs}
                        aria-label={item.label}
                        size="xs"
                        icon={<i className={icon} />}
                        disabled={item.disabled ?? false}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.onClick) {
                            e.preventDefault();
                            item.onClick(e);
                          }
                        }}
                      />
                    </Tooltip>
                  );
                  if (item.redirectionUrl && !item.disabled) {
                    return (
                      <Link
                        href={item.redirectionUrl}
                        passHref
                        key={item.label}
                        target={item.target}
                      >
                        {btn}
                      </Link>
                    );
                  }
                  return (
                    <Box key={item.label} as="span">
                      {btn}
                    </Box>
                  );
                })}
              </Flex>
            );
          },
        },
        "badge-column": {
          exportRenderer: ({ value }) => value?.label ?? "",
          comparator: (valueA, valueB) => {
            const a = valueA?.label ?? "";
            const b = valueB?.label ?? "";
            return String(a).localeCompare(String(b));
          },
          cellRenderer: (props) => {
            if (!props || !props.value) return null;
            return (
              <Flex alignItems="center" h="100%">
                <Badge colorScheme={props.value?.colorScheme}>
                  {props.value?.label}
                </Badge>
              </Flex>
            );
          },
          filter: {
            component: BadgeFilter,
            handler: "badgeFilterHandler",
          },
        },
      },
    };
    return {
      ...baseOptions,
      ...(gridOptionsProp || {}),
      columnTypes: {
        ...baseOptions.columnTypes,
        ...(gridOptionsProp?.columnTypes || {}),
      },
      defaultColDef: {
        ...defaultColDef,
        ...(gridOptionsProp?.defaultColDef || {}),
      },
    };
  }, [defaultRows, gridOptionsProp, effectiveColorScheme, isServerFilter, isServerPagination]);

  const getEffectiveColDef = React.useCallback(
    (colDef) => {
      const typeName = colDef.type;
      const typeDef = typeName
        ? mergedGridOptions.columnTypes?.[typeName]
        : null;
      return typeDef ? { ...typeDef, ...colDef } : colDef;
    },
    [mergedGridOptions]
  );

  const getEffectiveColDefByColId = React.useCallback(() => {
    return buildEffectiveColDefMap(colDefsWithIds, getEffectiveColDef);
  }, [colDefsWithIds, getEffectiveColDef]);

  const exportHeaderByColId = React.useMemo(
    () =>
      Object.fromEntries(
        collectLeafColumnMeta(colDefsWithIds, "", " - ").map(
          ({ colId, headerName }) => [colId, headerName]
        )
      ),
    [colDefsWithIds]
  );

  const downloadExportFile = React.useCallback((blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const buildExportData = React.useCallback(async () => {
    if (isServerPagination && onExportAll) {
      const rows = await onExportAll();
      return buildExportAoAFromRows(rows, {
        colDefs: colDefsWithIds,
        columnVisibility,
        effectiveColDefByColId: getEffectiveColDefByColId(),
        exportHeaderByColId,
      });
    }
    const api = gridRef.current?.api;
    if (!api) return [];
    return buildExportAoA(api, {
      columnVisibility,
      effectiveColDefByColId: getEffectiveColDefByColId(),
      exportHeaderByColId,
    });
  }, [
    colDefsWithIds,
    columnVisibility,
    exportHeaderByColId,
    getEffectiveColDefByColId,
    isServerPagination,
    onExportAll,
  ]);

  const runExport = React.useCallback(
    async (buildFile) => {
      if (exportLoading) return;
      try {
        const aoa = await buildExportData();
        if (!aoa.length) {
          toast.error("No columns available to export.");
          return;
        }
        buildFile(aoa);
      } catch (err) {
        toast.error(err?.message || "Export failed.");
      }
    },
    [buildExportData, exportLoading]
  );

  const handleExportCsv = React.useCallback(() => {
    runExport((aoa) => {
      const csv = Papa.unparse(aoa);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadExportFile(
        blob,
        `export-${new Date().toISOString().slice(0, 10)}.csv`
      );
    });
  }, [downloadExportFile, runExport]);

  const handleExportXlsx = React.useCallback(() => {
    runExport((aoa) => {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }, [runExport]);

  const columnItems = React.useMemo(
    () =>
      leafColumnMeta.map(({ colId, headerName }) => ({
        colId,
        headerName,
      })),
    [leafColumnMeta]
  );

  const cs = effectiveColorScheme;
  const tableBorderColor = `${cs}.100`;
  const showPaginationBar =
    isServerPagination && onPageChange
      ? true
      : mergedGridOptions.pagination !== false;

  return (
    <Box position="relative" w="100%" opacity={loading ? 0.6 : 1}>
      <Button
        position="absolute"
        zIndex={2}
        right="-54px"
        top="70px"
        transform="rotate(90deg)"
        borderBottomRadius={0}
        size="xs"
        leftIcon={<i className="fa-solid fa-gear" />}
        colorScheme={cs}
        onClick={onOpen}
      >
        Settings
      </Button>

      <Box
        w="100%"
        borderWidth="0.5px"
        borderColor={tableBorderColor}
        borderRadius="md"
        overflow="hidden"
        bg="white"
      >
        <AgGridReact
          ref={combinedRef}
          rowData={rowData}
          columnDefs={columnDefsForGrid}
          getRowId={getRowId}
          onSortChanged={isServerSort ? handleSortChanged : undefined}
          onFilterChanged={isServerFilter ? handleFilterChanged : undefined}
          onPaginationChanged={
            !isServerPagination ? handleClientPaginationChanged : undefined
          }
          onGridReady={() => {
            syncClientPagination();
          }}
          rowSelection={
            selectMode
              ? {
                  mode: "multiRow",
                  selectAll: "filtered",
                  ...(typeof isRowSelectable === "function"
                    ? { isRowSelectable }
                    : {}),
                }
              : undefined
          }
          onSelectionChanged={
            selectMode && onSelectionChangedRef.current
              ? (e) => {
                  if (e.api)
                    onSelectionChangedRef.current(e.api.getSelectedRows());
                }
              : undefined
          }
          gridOptions={mergedGridOptions}
          domLayout="autoHeight"
          theme={agGridTheme}
          className={className}
          {...props}
          sideBar
        />
        {showPaginationBar ? (
          <TablePaginationBar
            isServer={isServerPagination}
            page={
              isServerPagination ? paginationPage : clientPagination.page
            }
            pageSize={
              isServerPagination ? defaultRows : clientPagination.pageSize
            }
            totalRows={
              isServerPagination ? totalRows ?? 0 : clientPagination.total
            }
            onPageChange={isServerPagination ? onPageChange : undefined}
            gridRef={gridRef}
            borderColor={tableBorderColor}
          />
        ) : null}
      </Box>
      {hasDrawerMounted && (
        <Drawer
          isOpen={isOpen}
          onClose={onClose}
          placement="right"
          size="sm"
          colorScheme={cs}
          title="Table settings"
          footer={
            <Flex justifyContent="flex-end" w="100%">
              <Button colorScheme={cs} onClick={onClose}>
                Done
              </Button>
            </Flex>
          }
        >
          <Box px={4} pb={4}>
            <Accordion allowMultiple defaultIndex={[0, 1]}>
              <AccordionItem
                border="none"
                borderBottomWidth="1px"
                borderColor={`${cs}.100`}
                _last={{ borderBottom: "none" }}
              >
                <AccordionButton
                  px={0}
                  py={4}
                  _hover={{ bg: `${cs}.50` }}
                  _expanded={{ pb: 3 }}
                >
                  <Text fontWeight="600" fontSize="sm" color={`${cs}.700`}>
                    Export
                  </Text>
                  <AccordionIcon ml="auto" color={`${cs}.600`} />
                </AccordionButton>
                <AccordionPanel px={0} pt={0} pb={4}>
                  {exportLoading ? (
                    <Text fontSize="sm" color={`${cs}.600`} mb={2}>
                      Preparing export…
                    </Text>
                  ) : null}
                  <VStack align="stretch" spacing={2}>
                    {[
                      { key: "csv", label: "CSV", onClick: handleExportCsv },
                      { key: "xlsx", label: "XLSX", onClick: handleExportXlsx },
                    ].map(({ key, label, onClick }) => (
                      <Box
                        key={key}
                        as="button"
                        w="100%"
                        py={2.5}
                        px={3}
                        textAlign="left"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={`${cs}.100`}
                        bg={`${cs}.50`}
                        _hover={{
                          bg: `${cs}.100`,
                          borderColor: `${cs}.200`,
                        }}
                        disabled={exportLoading}
                        opacity={exportLoading ? 0.6 : 1}
                        onClick={() => {
                          onClick();
                          onClose();
                        }}
                      >
                        <Text fontSize="sm" fontWeight="500" color={`${cs}.700`}>
                          {label}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>

              <AccordionItem
                border="none"
                borderBottomWidth="1px"
                borderColor={`${cs}.100`}
                _last={{ borderBottom: "none" }}
              >
                <AccordionButton
                  px={0}
                  py={4}
                  _hover={{ bg: `${cs}.50` }}
                  _expanded={{ pb: 3 }}
                >
                  <Text fontWeight="600" fontSize="sm" color={`${cs}.700`}>
                    Columns
                  </Text>
                  <AccordionIcon ml="auto" color={`${cs}.600`} />
                </AccordionButton>
                <AccordionPanel px={0} pt={0} pb={4}>
                  <Text
                    fontSize="xs"
                    color={`${cs}.600`}
                    mb={3}
                    lineHeight="tall"
                  >
                    Toggle visibility with the checkbox.
                  </Text>
                  <Box
                    maxH="280px"
                    overflowY="auto"
                    pr={1}
                    sx={{
                      "&::-webkit-scrollbar": { width: "6px" },
                      "&::-webkit-scrollbar-track": {
                        bg: `${cs}.50`,
                        borderRadius: "3px",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        bg: `${cs}.200`,
                        borderRadius: "3px",
                      },
                    }}
                  >
                    <VStack align="stretch" spacing={0}>
                      {columnItems.map((item) => (
                        <Flex
                          key={item.colId}
                          align="center"
                          py={2.5}
                          px={2}
                          borderRadius="md"
                          _hover={{ bg: `${cs}.50` }}
                          borderBottomWidth="1px"
                          borderColor={`${cs}.50`}
                          _last={{ borderBottom: "none" }}
                        >
                          <Checkbox
                            size="sm"
                            flex={1}
                            colorScheme={cs}
                            isChecked={columnVisibility[item.colId] !== false}
                            onChange={(e) =>
                              handleColumnVisibilityChange(
                                item.colId,
                                e.target.checked
                              )
                            }
                          >
                            <Text fontSize="sm" color={`${cs}.700`}>
                              {item.headerName}
                            </Text>
                          </Checkbox>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
        </Drawer>
      )}
    </Box>
  );
});

export default AgGrid;
