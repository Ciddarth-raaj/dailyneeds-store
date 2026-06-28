import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import Badge from "../../components/Badge";
import { PaginationCacheProvider } from "../../contexts/PaginationCacheContext";
import { usePagination } from "../../customHooks/usePagination";
import hqOffers from "../../helper/hqOffers";
import { buildListProductColumnDefs } from "../../helper/hqOfferProductColumns";

const PRODUCTS_TAB_INDEX = 1;

function buildCrossFilterModel(crossFilter) {
  if (!crossFilter?.field || crossFilter.value == null || crossFilter.value === "") {
    return {};
  }
  return {
    [crossFilter.field]: {
      filterType: "text",
      type: "equals",
      filter: crossFilter.value,
    },
  };
}

function mergeColumnFilters(columnFilters, crossFilter) {
  return {
    ...(columnFilters || {}),
    ...buildCrossFilterModel(crossFilter),
  };
}

function crossFilterCacheSuffix(crossFilter) {
  if (!crossFilter?.field || !crossFilter?.value) return "all";
  return `${crossFilter.field}:${crossFilter.value}`;
}

function ActiveInactiveToggle({ isActiveFilter, onSetActive, onSetInactive }) {
  return (
    <ButtonGroup isAttached size="sm" variant="outline">
      <Button
        colorScheme={isActiveFilter ? "purple" : "gray"}
        variant={isActiveFilter ? "solid" : "outline"}
        onClick={onSetActive}
      >
        Active
      </Button>
      <Button
        colorScheme={!isActiveFilter ? "purple" : "gray"}
        variant={!isActiveFilter ? "solid" : "outline"}
        onClick={onSetInactive}
      >
        Inactive
      </Button>
    </ButtonGroup>
  );
}

function OffersTabContent() {
  const router = useRouter();

  const fetchPage = useCallback(async ({ limit, offset, sort, filters }) => {
    return hqOffers.listHdr({
      limit,
      offset,
      sort_by: sort?.field,
      sort_dir: sort?.dir,
      status: filters?.status,
      filter: filters?.columnFilters,
    });
  }, []);

  const fetchAllForExport = useCallback(async ({ sort, filters }) => {
    return hqOffers.listHdrAll({
      sort_by: sort?.field,
      sort_dir: sort?.dir,
      status: filters?.status,
      filter: filters?.columnFilters,
    });
  }, []);

  const {
    rows,
    total,
    loading,
    exportLoading,
    page,
    pageSize,
    sort,
    filters,
    setPage,
    setPageSize,
    setSort,
    setFilters,
    setColumnFilters,
    fetchAll,
  } = usePagination({
    cacheKey: "hq-offers-v2",
    fetchPage,
    fetchAll: fetchAllForExport,
    defaultPageSize: 20,
    defaultSort: { field: "moh_offer_hq_id", dir: "desc" },
    defaultFilters: { status: "active", columnFilters: {} },
  });

  const isActiveFilter = filters?.status !== "inactive";

  const columnDefs = useMemo(
    () => [
      {
        field: "moh_offer_hq_id",
        colId: "moh_offer_hq_id",
        headerName: "ID",
        type: "id",
        sortable: true,
        sort: sort?.field === "moh_offer_hq_id" ? sort.dir : null,
        filter: "agTextColumnFilter",
        cellStyle: { cursor: "pointer", textDecoration: "underline" },
        onCellClicked: (params) => {
          const row = params.data;
          if (!row) return;
          router.push(`/offers-v2/view?moh_offer_hq_id=${row.moh_offer_hq_id}`);
        },
      },
      {
        field: "moh_offer_name",
        headerName: "Offer name",
        flex: 1.5,
        sortable: true,
        filter: "agTextColumnFilter",
        sort: sort?.field === "moh_offer_name" ? sort.dir : null,
      },
      {
        field: "product_count",
        headerName: "Products",
        type: "number",
        flex: 0.7,
        sortable: true,
        filter: "agNumberColumnFilter",
        sort: sort?.field === "product_count" ? sort.dir : null,
      },
      {
        field: "moh_offer_st_date",
        headerName: "Start date",
        type: "date",
        sortable: true,
        sort: sort?.field === "moh_offer_st_date" ? sort.dir : null,
      },
      {
        field: "moh_offer_end_date",
        headerName: "End date",
        type: "date",
        sortable: true,
        sort: sort?.field === "moh_offer_end_date" ? sort.dir : null,
      },
      {
        field: "branch_count",
        headerName: "Branches",
        type: "number",
        flex: 0.7,
        sortable: true,
        filter: "agNumberColumnFilter",
        sort: sort?.field === "branch_count" ? sort.dir : null,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.8,
        filter: false,
        sortable: false,
        cellRenderer: (params) => {
          const isActive = params.data?.status === "active";
          return (
            <Flex alignItems="center" h="100%">
              <Badge colorScheme={isActive ? "green" : "red"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </Flex>
          );
        },
      },
    ],
    [router, sort]
  );

  return (
    <>
      <Flex justify="flex-end" mb={3}>
        <ActiveInactiveToggle
          isActiveFilter={isActiveFilter}
          onSetActive={() => setFilters({ status: "active" })}
          onSetInactive={() => setFilters({ status: "inactive" })}
        />
      </Flex>

      <AgGrid
        tableKey="hq-offers-v2-list"
        rowData={rows}
        columnDefs={columnDefs}
        defaultRows={pageSize}
        paginationMode="server"
        sortMode="server"
        filterMode="server"
        sort={sort}
        onSortChange={setSort}
        onFilterChange={setColumnFilters}
        totalRows={total}
        paginationPage={page}
        loading={loading}
        exportLoading={exportLoading}
        onExportAll={fetchAll}
        onPageChange={({ page: nextPage, pageSize: nextPageSize }) => {
          if (nextPageSize !== pageSize) setPageSize(nextPageSize);
          if (nextPage !== page) setPage(nextPage);
        }}
        getRowId={(params) => String(params.data.moh_offer_hq_id)}
      />
    </>
  );
}

function ProductsTabContent({ crossFilter, onClearCrossFilter }) {
  const router = useRouter();
  const cacheKey = `hq-offers-v2-products-list-${crossFilterCacheSuffix(crossFilter)}`;

  const fetchPage = useCallback(
    async ({ limit, offset, sort, filters }) => {
      return hqOffers.listProducts({
        limit,
        offset,
        sort_by: sort?.field,
        sort_dir: sort?.dir,
        status: filters?.status,
        filter: mergeColumnFilters(filters?.columnFilters, crossFilter),
      });
    },
    [crossFilter]
  );

  const fetchAllForExport = useCallback(
    async ({ sort, filters }) => {
      return hqOffers.listProductsAll({
        sort_by: sort?.field,
        sort_dir: sort?.dir,
        status: filters?.status,
        filter: mergeColumnFilters(filters?.columnFilters, crossFilter),
      });
    },
    [crossFilter]
  );

  const {
    rows,
    total,
    loading,
    exportLoading,
    page,
    pageSize,
    sort,
    filters,
    setPage,
    setPageSize,
    setSort,
    setFilters,
    setColumnFilters,
    fetchAll,
  } = usePagination({
    cacheKey,
    fetchPage,
    fetchAll: fetchAllForExport,
    defaultPageSize: 20,
    defaultSort: { field: "moh_offer_hq_id", dir: "desc" },
    defaultFilters: { status: "active", columnFilters: {} },
  });

  const isActiveFilter = filters?.status !== "inactive";
  const crossFilterLabel =
    crossFilter?.field === "buyer_name" ? "Buyer" : "Distributor";

  const columnDefs = useMemo(
    () => buildListProductColumnDefs({ sort, router }),
    [router, sort]
  );

  return (
    <>
      <Flex justify="space-between" align="center" mb={3} gap={3} flexWrap="wrap">
        {crossFilter?.value ? (
          <Flex align="center" gap={2} flexWrap="wrap">
            <Text fontSize="sm" color="gray.600">
              Filtered by {crossFilterLabel}:
            </Text>
            <Badge colorScheme="purple">{crossFilter.value}</Badge>
            <Button size="sm" variant="outline" onClick={onClearCrossFilter}>
              Clear
            </Button>
          </Flex>
        ) : (
          <Box />
        )}
        <ActiveInactiveToggle
          isActiveFilter={isActiveFilter}
          onSetActive={() => setFilters({ status: "active" })}
          onSetInactive={() => setFilters({ status: "inactive" })}
        />
      </Flex>

      <AgGrid
        tableKey={`hq-offers-v2-products-list-${crossFilterCacheSuffix(crossFilter)}`}
        rowData={rows}
        columnDefs={columnDefs}
        defaultRows={pageSize}
        paginationMode="server"
        sortMode="server"
        filterMode="server"
        sort={sort}
        onSortChange={setSort}
        onFilterChange={setColumnFilters}
        totalRows={total}
        paginationPage={page}
        loading={loading}
        exportLoading={exportLoading}
        onExportAll={fetchAll}
        onPageChange={({ page: nextPage, pageSize: nextPageSize }) => {
          if (nextPageSize !== pageSize) setPageSize(nextPageSize);
          if (nextPage !== page) setPage(nextPage);
        }}
        getRowId={(params) =>
          `${params.data.moh_offer_hq_id}-${params.data.product_id}`
        }
      />
    </>
  );
}

function GroupedTabContent({ groupBy, onSelectName }) {
  const nameField = groupBy === "buyer" ? "buyer_name" : "distributor_name";
  const nameHeader = groupBy === "buyer" ? "Buyer" : "Distributor";
  const cacheKey =
    groupBy === "buyer"
      ? "hq-offers-v2-product-groups-buyer"
      : "hq-offers-v2-product-groups-distributor";

  const fetchPage = useCallback(
    async ({ limit, offset, sort, filters }) => {
      return hqOffers.listProductGroups({
        limit,
        offset,
        sort_by: sort?.field,
        sort_dir: sort?.dir,
        status: filters?.status,
        filter: filters?.columnFilters,
        group_by: groupBy,
      });
    },
    [groupBy]
  );

  const fetchAllForExport = useCallback(
    async ({ sort, filters }) => {
      return hqOffers.listProductGroupsAll({
        sort_by: sort?.field,
        sort_dir: sort?.dir,
        status: filters?.status,
        filter: filters?.columnFilters,
        group_by: groupBy,
      });
    },
    [groupBy]
  );

  const {
    rows,
    total,
    loading,
    exportLoading,
    page,
    pageSize,
    sort,
    filters,
    setPage,
    setPageSize,
    setSort,
    setFilters,
    setColumnFilters,
    fetchAll,
  } = usePagination({
    cacheKey,
    fetchPage,
    fetchAll: fetchAllForExport,
    defaultPageSize: 20,
    defaultSort: { field: nameField, dir: "asc" },
    defaultFilters: { status: "active", columnFilters: {} },
  });

  const isActiveFilter = filters?.status !== "inactive";

  const columnDefs = useMemo(
    () => [
      {
        field: nameField,
        colId: nameField,
        headerName: nameHeader,
        flex: 1.5,
        type: "capitalized",
        sortable: true,
        filter: "agTextColumnFilter",
        sort: sort?.field === nameField ? sort.dir : null,
        cellStyle: { cursor: "pointer", textDecoration: "underline" },
        onCellClicked: (params) => {
          const value = params.data?.[nameField];
          if (!value) return;
          onSelectName({ field: nameField, value });
        },
      },
      {
        field: "product_count",
        headerName: "Products",
        type: "number",
        flex: 0.8,
        sortable: true,
        filter: "agNumberColumnFilter",
        sort: sort?.field === "product_count" ? sort.dir : null,
      },
    ],
    [nameField, nameHeader, onSelectName, sort]
  );

  return (
    <>
      <Flex justify="flex-end" mb={3}>
        <ActiveInactiveToggle
          isActiveFilter={isActiveFilter}
          onSetActive={() => setFilters({ status: "active" })}
          onSetInactive={() => setFilters({ status: "inactive" })}
        />
      </Flex>

      <AgGrid
        tableKey={cacheKey}
        rowData={rows}
        columnDefs={columnDefs}
        defaultRows={pageSize}
        paginationMode="server"
        sortMode="server"
        filterMode="server"
        sort={sort}
        onSortChange={setSort}
        onFilterChange={setColumnFilters}
        totalRows={total}
        paginationPage={page}
        loading={loading}
        exportLoading={exportLoading}
        onExportAll={fetchAll}
        onPageChange={({ page: nextPage, pageSize: nextPageSize }) => {
          if (nextPageSize !== pageSize) setPageSize(nextPageSize);
          if (nextPage !== page) setPage(nextPage);
        }}
        getRowId={(params) => String(params.data?.[nameField] ?? params.rowIndex)}
      />
    </>
  );
}

export default function OffersV2Page() {
  const [tabIndex, setTabIndex] = useState(0);
  const [productCrossFilter, setProductCrossFilter] = useState(null);

  const handleGroupSelect = useCallback(({ field, value }) => {
    setProductCrossFilter({ field, value });
    setTabIndex(PRODUCTS_TAB_INDEX);
  }, []);

  const handleClearProductCrossFilter = useCallback(() => {
    setProductCrossFilter(null);
  }, []);

  return (
    <GlobalWrapper title="Offers V2" permissionKey="view_hq_offers">
      <CustomContainer title="Offers V2" filledHeader>
        <PaginationCacheProvider>
          <Tabs
            colorScheme="purple"
            isLazy
            lazyBehavior="keepMounted"
            index={tabIndex}
            onChange={setTabIndex}
          >
            <TabList flexWrap="wrap">
              <Tab>Offers</Tab>
              <Tab>Products</Tab>
              <Tab>By distributor</Tab>
              <Tab>By buyer</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <OffersTabContent />
              </TabPanel>
              <TabPanel px={0}>
                <ProductsTabContent
                  crossFilter={productCrossFilter}
                  onClearCrossFilter={handleClearProductCrossFilter}
                />
              </TabPanel>
              <TabPanel px={0}>
                <GroupedTabContent
                  groupBy="distributor"
                  onSelectName={handleGroupSelect}
                />
              </TabPanel>
              <TabPanel px={0}>
                <GroupedTabContent
                  groupBy="buyer"
                  onSelectName={handleGroupSelect}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </PaginationCacheProvider>
      </CustomContainer>
    </GlobalWrapper>
  );
}
