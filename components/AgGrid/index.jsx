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

const COLUMN_STORAGE_PREFIX = "aggrid-columns-";

const agGridTheme = themeQuartz.withParams({
  accentColor: "var(--chakra-colors-purple-500)",
  headerBackgroundColor: "var(--chakra-colors-purple-50)",
  headerTextColor: "var(--chakra-colors-purple-700)",
  fontFamily: "inherit",
  borderColor: "var(--chakra-colors-purple-100)",
  borderWidth: "0.5px",
  textColor: "var(--chakra-colors-gray-600)",
  fontSize: "13px",
});

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
    ...props
  },
  ref
) {
  const gridRef = React.useRef(null);
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

  const rawColDefs = React.useMemo(
    () => columnDefs ?? colDefs ?? [],
    [columnDefs, colDefs]
  );

  const columnIdMap = React.useMemo(() => {
    const seen = {};
    return rawColDefs.map((colDef, index) => {
      const base = colDef.colId ?? colDef.field ?? `col_${index}`;
      const count = (seen[base] = (seen[base] || 0) + 1);
      return count === 1 ? base : `${base}_${count - 1}`;
    });
  }, [rawColDefs]);

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
    rawColDefs.forEach((colDef, index) => {
      const colId = columnIdMap[index];
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
  }, [tableKey, rawColDefs, columnIdMap, columnTypesForVisibility]);

  const [columnVisibility, setColumnVisibility] = React.useState(
    initialColumnVisibility
  );

  React.useEffect(() => {
    setColumnVisibility(initialColumnVisibility);
  }, [tableKey, initialColumnVisibility]);

  const resolvedColumnDefs = React.useMemo(() => {
    return rawColDefs.map((colDef, index) => {
      const colId = columnIdMap[index];
      const visible = columnVisibility[colId] !== false;
      return { ...colDef, colId, hide: !visible };
    });
  }, [rawColDefs, columnVisibility, columnIdMap]);

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
          cellRenderer: (params) => {
            if (!params.value) return null;
            return (
              <Box p="4px">
                <Image
                  src={params.value}
                  alt=""
                  boxSize="20"
                  objectFit="cover"
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
        "badge-column": {
          exportRenderer: ({ value }) => value?.label ?? "",
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
  }, [defaultRows, gridOptionsProp]);

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

  const getExportParams = React.useCallback(() => {
    const effectiveColDefs = rawColDefs.map((colDef) =>
      getEffectiveColDef(colDef)
    );
    const exportableColIds = rawColDefs
      .map((colDef, index) => ({
        effectiveColDef: effectiveColDefs[index],
        colId: columnIdMap[index],
      }))
      .filter(
        ({ effectiveColDef, colId }) =>
          effectiveColDef.hideExport !== true &&
          colId &&
          columnVisibility[colId] !== false
      )
      .map(({ colId }) => colId);
    const effectiveColDefByColId = Object.fromEntries(
      rawColDefs.map((colDef, index) => [
        columnIdMap[index],
        effectiveColDefs[index],
      ])
    );
    return {
      columnKeys: exportableColIds.length > 0 ? exportableColIds : undefined,
      processCellCallback: (params) => {
        const colId = params.column?.getColId?.();
        const effectiveColDef = colId ? effectiveColDefByColId[colId] : null;
        const exportRenderer = effectiveColDef?.exportRenderer;
        const value = exportRenderer
          ? exportRenderer({
              value: params.value,
              data: params.node?.data,
              node: params.node,
              column: params.column,
            })
          : params.value;
        return value != null ? String(value) : "";
      },
    };
  }, [rawColDefs, columnIdMap, columnVisibility, getEffectiveColDef]);

  const handleExportCsv = React.useCallback(() => {
    if (!gridRef.current?.api) return;
    const exportParams = getExportParams();
    gridRef.current.api.exportDataAsCsv({
      fileName: `export-${new Date().toISOString().slice(0, 10)}.csv`,
      ...exportParams,
    });
  }, [getExportParams]);

  const handleExportXlsx = React.useCallback(() => {
    if (!gridRef.current?.api) return;
    const exportParams = getExportParams();
    const csv = gridRef.current.api.getDataAsCsv(exportParams);
    if (!csv) return;
    const parsed = Papa.parse(csv);
    const ws = XLSX.utils.aoa_to_sheet(parsed.data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [getExportParams]);

  const columnItems = React.useMemo(() => {
    return rawColDefs.map((colDef, index) => ({
      colId: columnIdMap[index],
      headerName: colDef.headerName ?? colDef.field ?? columnIdMap[index],
    }));
  }, [rawColDefs, columnIdMap]);

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
        colorScheme="purple"
        onClick={onOpen}
      >
        Settings
      </Button>

      <AgGridReact
        ref={combinedRef}
        rowData={rowData}
        columnDefs={resolvedColumnDefs}
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
          title="Table settings"
          footer={
            <Flex justifyContent="flex-end" w="100%">
              <Button colorScheme="purple" onClick={onClose}>
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
                borderColor="purple.100"
                _last={{ borderBottom: "none" }}
              >
                <AccordionButton
                  px={0}
                  py={4}
                  _hover={{ bg: "purple.50" }}
                  _expanded={{ pb: 3 }}
                >
                  <Text fontWeight="600" fontSize="sm" color="purple.700">
                    Export
                  </Text>
                  <AccordionIcon ml="auto" color="purple.600" />
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
                        borderColor="purple.100"
                        bg="purple.50"
                        _hover={{
                          bg: "purple.100",
                          borderColor: "purple.200",
                        }}
                        onClick={() => {
                          onClick();
                          if (key !== "pdf") onClose();
                        }}
                      >
                        <Text fontSize="sm" fontWeight="500" color="purple.700">
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
                borderColor="purple.100"
                _last={{ borderBottom: "none" }}
              >
                <AccordionButton
                  px={0}
                  py={4}
                  _hover={{ bg: "purple.50" }}
                  _expanded={{ pb: 3 }}
                >
                  <Text fontWeight="600" fontSize="sm" color="purple.700">
                    Columns
                  </Text>
                  <AccordionIcon ml="auto" color="purple.600" />
                </AccordionButton>
                <AccordionPanel px={0} pt={0} pb={4}>
                  <Text
                    fontSize="xs"
                    color="purple.600"
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
                        bg: "purple.50",
                        borderRadius: "3px",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        bg: "purple.200",
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
                          _hover={{ bg: "purple.50" }}
                          borderBottomWidth="1px"
                          borderColor="purple.50"
                          _last={{ borderBottom: "none" }}
                        >
                          <Checkbox
                            size="sm"
                            flex={1}
                            colorScheme="purple"
                            isChecked={columnVisibility[item.colId] !== false}
                            onChange={(e) =>
                              handleColumnVisibilityChange(
                                item.colId,
                                e.target.checked
                              )
                            }
                          >
                            <Text fontSize="sm" color="purple.700">
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
