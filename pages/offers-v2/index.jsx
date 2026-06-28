import React, { useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import {
  Button,
  ButtonGroup,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import Badge from "../../components/Badge";
import { PaginationCacheProvider } from "../../contexts/PaginationCacheContext";
import { usePagination } from "../../customHooks/usePagination";
import hqOffers from "../../helper/hqOffers";

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
        <ButtonGroup isAttached size="sm" variant="outline">
          <Button
            colorScheme={isActiveFilter ? "purple" : "gray"}
            variant={isActiveFilter ? "solid" : "outline"}
            onClick={() => setFilters({ status: "active" })}
          >
            Active
          </Button>
          <Button
            colorScheme={!isActiveFilter ? "purple" : "gray"}
            variant={!isActiveFilter ? "solid" : "outline"}
            onClick={() => setFilters({ status: "inactive" })}
          >
            Inactive
          </Button>
        </ButtonGroup>
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

function ProductsTabContent() {
  const router = useRouter();

  const fetchPage = useCallback(async ({ limit, offset, sort, filters }) => {
    return hqOffers.listProducts({
      limit,
      offset,
      sort_by: sort?.field,
      sort_dir: sort?.dir,
      status: filters?.status,
      filter: filters?.columnFilters,
    });
  }, []);

  const fetchAllForExport = useCallback(async ({ sort, filters }) => {
    return hqOffers.listProductsAll({
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
    cacheKey: "hq-offers-v2-products-list",
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
        headerName: "Offer ID",
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
        field: "product_id",
        headerName: "Product ID",
        type: "id",
        sortable: true,
        filter: "agTextColumnFilter",
        sort: sort?.field === "product_id" ? sort.dir : null,
      },
      {
        field: "de_name",
        headerName: "Product name",
        flex: 1.5,
        type: "capitalized",
        sortable: true,
        filter: "agTextColumnFilter",
        sort: sort?.field === "de_name" ? sort.dir : null,
      },
      {
        field: "image_url",
        headerName: "Image",
        type: "image",
        hideByDefault: true,
      },
      {
        field: "moi_offer_on",
        headerName: "Offer on",
        flex: 1,
        sortable: true,
        filter: "agTextColumnFilter",
        sort: sort?.field === "moi_offer_on" ? sort.dir : null,
      },
      {
        field: "moi_offer_value",
        headerName: "Offer value",
        flex: 0.8,
        type: "number",
        sortable: true,
        filter: "agNumberColumnFilter",
        sort: sort?.field === "moi_offer_value" ? sort.dir : null,
        valueFormatter: (params) => {
          if (params.value == null || params.value === "") return "-";
          const n = Number(params.value);
          return Number.isNaN(n) ? "-" : n.toFixed(2);
        },
      },
    ],
    [router, sort]
  );

  return (
    <>
      <Flex justify="flex-end" mb={3}>
        <ButtonGroup isAttached size="sm" variant="outline">
          <Button
            colorScheme={isActiveFilter ? "purple" : "gray"}
            variant={isActiveFilter ? "solid" : "outline"}
            onClick={() => setFilters({ status: "active" })}
          >
            Active
          </Button>
          <Button
            colorScheme={!isActiveFilter ? "purple" : "gray"}
            variant={!isActiveFilter ? "solid" : "outline"}
            onClick={() => setFilters({ status: "inactive" })}
          >
            Inactive
          </Button>
        </ButtonGroup>
      </Flex>

      <AgGrid
        tableKey="hq-offers-v2-products-list"
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
          `${params.data.moh_offer_hq_id}-${params.data.retail_outlet_id}-${params.data.product_id}`
        }
      />
    </>
  );
}

export default function OffersV2Page() {
  return (
    <GlobalWrapper title="Offers V2" permissionKey="view_hq_offers">
      <CustomContainer title="Offers V2" filledHeader>
        <PaginationCacheProvider>
          <Tabs colorScheme="purple" isLazy lazyBehavior="keepMounted">
            <TabList>
              <Tab>Offers</Tab>
              <Tab>Products</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <OffersTabContent />
              </TabPanel>
              <TabPanel px={0}>
                <ProductsTabContent />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </PaginationCacheProvider>
      </CustomContainer>
    </GlobalWrapper>
  );
}
