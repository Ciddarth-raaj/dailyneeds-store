import { themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import React from "react";
import { icons } from "./icons";
import { capitalize } from "../../util/string";
import { Flex } from "@chakra-ui/react";
import Badge from "../Badge";
import CustomMenu from "../CustomMenu";
import BadgeFilter, { badgeFilterHandler } from "./BadgeFilter";

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

const AgGrid = React.forwardRef(function AgGrid(
  {
    rowData,
    colDefs,
    columnDefs,
    gridOptions,
    defaultRows = 20,
    className,
    ...props
  },
  ref
) {
  const mergedGridOptions = React.useMemo(() => {
    const defaultColDef = {
      resizable: true,
      sortable: true,
      filter: true,
      flex: 1,
      // minWidth: 100,
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
      },
      columnTypes: {
        id: {
          maxWidth: 100,
          resizable: false,
          filter: false,
        },
        capitalized: {
          cellRenderer: (props) => {
            return props.value !== null && props.value !== ""
              ? capitalize(props.value)
              : "-";
          },
        },
        "action-column": {
          filter: false,
          resizable: false,
          flex: 0,
          maxWidth: 100,
          minWidth: 100,
          width: 100,
          cellRenderer: (props) => (
            <Flex justifyContent="center" alignItems="center" height={"100%"}>
              <CustomMenu items={props.value} />
            </Flex>
          ),
        },
        "badge-column": {
          cellRenderer: (props) => {
            return (
              <Flex alignItems="center" h="100%">
                <Badge size="md" colorScheme={props.value?.colorScheme}>
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
      ...(gridOptions || {}),
      defaultColDef: {
        ...defaultColDef,
        ...(gridOptions?.defaultColDef || {}),
      },
    };
  }, [defaultRows, gridOptions]);

  const resolvedColumnDefs = React.useMemo(() => {
    // Support both prop names for convenience
    return columnDefs ?? colDefs ?? [];
  }, [columnDefs, colDefs]);

  return (
    <AgGridReact
      ref={ref}
      rowData={rowData}
      columnDefs={resolvedColumnDefs}
      gridOptions={mergedGridOptions}
      domLayout="autoHeight"
      theme={agGridTheme}
      className={className}
      {...props}
      sideBar
    />
  );
});

export default AgGrid;
