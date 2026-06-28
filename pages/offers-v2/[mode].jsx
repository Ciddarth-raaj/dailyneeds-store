import React, { useMemo } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
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
import { useHqOfferByHqId } from "../../customHooks/useHqOfferByKey";

function queryParam(value) {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] : value;
}

function SummaryField({ label, value }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={0.5}>
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        {value ?? "-"}
      </Text>
    </Box>
  );
}

export default function OffersV2ModePage() {
  const router = useRouter();
  const { mode, moh_offer_hq_id: offerHqIdQuery, retail_outlet_id: outletIdQuery } =
    router.query;

  const mohOfferHqId = queryParam(offerHqIdQuery);
  const retailOutletId = queryParam(outletIdQuery);
  const viewMode = mode === "view";
  const isReady = router.isReady;

  const { offer, branches, loading } = useHqOfferByHqId(mohOfferHqId, {
    enabled: isReady && viewMode && mohOfferHqId != null,
  });

  const defaultBranchIndex = useMemo(() => {
    if (!retailOutletId || !branches.length) return 0;
    const idx = branches.findIndex(
      (b) => String(b.retail_outlet_id) === String(retailOutletId)
    );
    return idx >= 0 ? idx : 0;
  }, [branches, retailOutletId]);

  const productColumnDefs = useMemo(
    () => [
      {
        field: "product_id",
        headerName: "Product ID",
        type: "id",
      },
      {
        field: "de_name",
        headerName: "Product name",
        flex: 1.5,
        type: "capitalized",
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
      },
      {
        field: "moi_offer_value",
        headerName: "Offer value",
        flex: 0.8,
        type: "number",
        valueFormatter: (params) => {
          if (params.value == null || params.value === "") return "-";
          const n = Number(params.value);
          return Number.isNaN(n) ? "-" : n.toFixed(2);
        },
      },
    ],
    []
  );

  if (!isReady || loading) {
    return (
      <GlobalWrapper title="Offers V2" permissionKey="view_hq_offers">
        <CustomContainer title="Loading..." filledHeader>
          <Text py={4}>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!viewMode) {
    return (
      <GlobalWrapper title="Offers V2" permissionKey="view_hq_offers">
        <CustomContainer title="Invalid route" filledHeader>
          <Button onClick={() => router.push("/offers-v2")}>Back to list</Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!offer) {
    return (
      <GlobalWrapper title="Offers V2" permissionKey="view_hq_offers">
        <CustomContainer title="Not found" filledHeader>
          <Text py={4}>Offer not found.</Text>
          <Button colorScheme="purple" onClick={() => router.push("/offers-v2")}>
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const isActive = offer?.status === "active";

  return (
    <GlobalWrapper title="Offer details" permissionKey="view_hq_offers">
      <CustomContainer
        title="Offer details"
        filledHeader
        rightSection={
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/offers-v2")}
          >
            Back
          </Button>
        }
      >
        <Grid
          templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
          gap={4}
          mb={6}
        >
          <GridItem>
            <SummaryField label="ID" value={offer.moh_offer_hq_id} />
          </GridItem>
          <GridItem>
            <SummaryField label="Offer name" value={offer.moh_offer_name} />
          </GridItem>
          <GridItem>
            <SummaryField label="Products" value={offer.product_count} />
          </GridItem>
          <GridItem>
            <SummaryField
              label="Start date"
              value={
                offer.moh_offer_st_date
                  ? moment(offer.moh_offer_st_date, "YYYY-MM-DD", true).format(
                      "DD/MM/YYYY"
                    )
                  : null
              }
            />
          </GridItem>
          <GridItem>
            <SummaryField
              label="End date"
              value={
                offer.moh_offer_end_date
                  ? moment(offer.moh_offer_end_date, "YYYY-MM-DD", true).format(
                      "DD/MM/YYYY"
                    )
                  : null
              }
            />
          </GridItem>
          <GridItem>
            <SummaryField label="Branches" value={offer.branch_count} />
          </GridItem>
          <GridItem>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={0.5}>
                Status
              </Text>
              <Badge colorScheme={isActive ? "green" : "red"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </Box>
          </GridItem>
        </Grid>

        <CustomContainer title="Products by branch" smallHeader filledHeader>
          <Tabs
            colorScheme="purple"
            size="sm"
            isLazy
            lazyBehavior="keepMounted"
            defaultIndex={defaultBranchIndex}
          >
            <TabList flexWrap="wrap">
              {branches.map((branch) => (
                <Tab key={branch.retail_outlet_id} fontSize="sm">
                  <Flex align="center" gap={1.5}>
                    <Text fontSize="sm">{branch.branch_name}</Text>
                    <Badge colorScheme="purple" size="xs">
                      {branch.product_count}
                    </Badge>
                  </Flex>
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              {branches.map((branch) => (
                <TabPanel key={branch.retail_outlet_id} px={0} pt={4}>
                  <AgGrid
                    tableKey={`hq-offers-v2-products-${branch.retail_outlet_id}`}
                    rowData={branch.products}
                    columnDefs={productColumnDefs}
                    getRowId={(params) =>
                      `${branch.retail_outlet_id}-${params.data.product_id}`
                    }
                  />
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </CustomContainer>
      </CustomContainer>
    </GlobalWrapper>
  );
}
