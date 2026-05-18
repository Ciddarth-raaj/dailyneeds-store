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
  collectLeafColumnMeta,
} from "./columnDefsUtils";

const COLUMN_STORAGE_PREFIX = "aggrid-columns-";

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
    ...props
  },
  ref
) {
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
      pagination: true,
      paginationPageSize: defaultRows,
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
          cellRenderer: (params) =>
            params.value ? moment(params.value).format("DD/MM/YYYY") : "-",
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
  }, [defaultRows, gridOptionsProp, effectiveColorScheme]);

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

  const buildExportData = React.useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return [];
    return buildExportAoA(api, {
      columnVisibility,
      effectiveColDefByColId: getEffectiveColDefByColId(),
      exportHeaderByColId,
    });
  }, [columnVisibility, getEffectiveColDefByColId, exportHeaderByColId]);

  const downloadExportFile = React.useCallback((blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportCsv = React.useCallback(() => {
    const aoa = buildExportData();
    if (!aoa.length) {
      toast.error("No columns available to export.");
      return;
    }
    const csv = Papa.unparse(aoa);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadExportFile(
      blob,
      `export-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }, [buildExportData, downloadExportFile]);

  const handleExportXlsx = React.useCallback(() => {
    const aoa = buildExportData();
    if (!aoa.length) {
      toast.error("No columns available to export.");
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [buildExportData]);

  const columnItems = React.useMemo(
    () =>
      leafColumnMeta.map(({ colId, headerName }) => ({
        colId,
        headerName,
      })),
    [leafColumnMeta]
  );

  const cs = effectiveColorScheme;

  return (
    <Box position="relative" w="100%">
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

      <AgGridReact
        ref={combinedRef}
        rowData={rowData}
        columnDefs={resolvedColumnDefs}
        getRowId={getRowId}
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
        gridOptions={{
          ...mergedGridOptions,
          ...gridOptionsProp,
        }}
        domLayout="autoHeight"
        theme={agGridTheme}
        className={className}
        {...props}
        sideBar
      />
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
                        onClick={() => {
                          onClick();
                          if (key !== "pdf") onClose();
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
