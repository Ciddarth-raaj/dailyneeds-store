export const OFFER_TYPE_BADGES = {
  1: { label: "Percentage", colorScheme: "blue" },
  4: { label: "Value", colorScheme: "green" },
  2: { label: "2", colorScheme: "orange" },
  3: { label: "3", colorScheme: "teal" },
};

export const OFFER_TYPE_PREDEFINED_BADGES = Object.values(OFFER_TYPE_BADGES);

export function getOfferTypeBadge(moiOfferType, moiOfferTypeLabel) {
  const n = Number(moiOfferType);
  if (OFFER_TYPE_BADGES[n]) return OFFER_TYPE_BADGES[n];
  if (moiOfferTypeLabel) {
    return { label: moiOfferTypeLabel, colorScheme: "gray" };
  }
  return null;
}

export function formatOfferValue(params) {
  if (params.value == null || params.value === "") return "-";
  const n = Number(params.value);
  return Number.isNaN(n) ? "-" : n.toFixed(2);
}

function offerTypeColumn({ sortable = false, sort = null } = {}) {
  return {
    field: "moi_offer_type",
    colId: "moi_offer_type",
    headerName: "Offer type",
    type: "badge-column",
    flex: 0.9,
    sortable,
    sort: sortable && sort?.field === "moi_offer_type" ? sort.dir : null,
    valueGetter: (params) =>
      getOfferTypeBadge(
        params.data?.moi_offer_type,
        params.data?.moi_offer_type_label
      ),
    filterParams: { predefinedBadges: OFFER_TYPE_PREDEFINED_BADGES },
  };
}

function distributorColumn({ sortable = false, sort = null } = {}) {
  return {
    field: "distributor_name",
    headerName: "Distributor",
    flex: 1.2,
    type: "capitalized",
    sortable,
    filter: sortable ? "agTextColumnFilter" : false,
    sort: sortable && sort?.field === "distributor_name" ? sort.dir : null,
  };
}

function buyerColumn({ sortable = false, sort = null } = {}) {
  return {
    field: "buyer_name",
    headerName: "Buyer",
    flex: 1,
    type: "capitalized",
    sortable,
    filter: sortable ? "agTextColumnFilter" : false,
    sort: sortable && sort?.field === "buyer_name" ? sort.dir : null,
  };
}

function productCoreColumns({ sortable = false, sort = null } = {}) {
  return [
    {
      field: "product_id",
      headerName: "PID",
      type: "id",
      sortable,
      filter: sortable ? "agTextColumnFilter" : false,
      sort: sortable && sort?.field === "product_id" ? sort.dir : null,
    },
    {
      field: "de_name",
      headerName: "Product name",
      flex: 1.5,
      type: "capitalized",
      sortable,
      filter: sortable ? "agTextColumnFilter" : false,
      sort: sortable && sort?.field === "de_name" ? sort.dir : null,
    },
    {
      field: "image_url",
      headerName: "Image",
      type: "image",
      hideByDefault: true,
    },
    distributorColumn({ sortable, sort }),
    buyerColumn({ sortable, sort }),
    {
      field: "moi_offer_on",
      headerName: "Offer on",
      flex: 1,
      sortable,
      filter: sortable ? "agTextColumnFilter" : false,
      sort: sortable && sort?.field === "moi_offer_on" ? sort.dir : null,
    },
    offerTypeColumn({ sortable, sort }),
    {
      field: "moi_offer_value",
      headerName: "Offer value",
      flex: 0.8,
      type: "number",
      sortable,
      filter: sortable ? "agNumberColumnFilter" : false,
      sort: sortable && sort?.field === "moi_offer_value" ? sort.dir : null,
      valueFormatter: formatOfferValue,
    },
  ];
}

export function buildListProductColumnDefs({ sort, router, leadColumn = null }) {
  const offerColumns = [
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
  ];

  const core = productCoreColumns({ sortable: true, sort });
  if (leadColumn === "distributor") {
    const distributor = core.find((c) => c.field === "distributor_name");
    const rest = core.filter((c) => c.field !== "distributor_name");
    return [...offerColumns, distributor, ...rest];
  }
  if (leadColumn === "buyer") {
    const buyer = core.find((c) => c.field === "buyer_name");
    const rest = core.filter((c) => c.field !== "buyer_name");
    return [...offerColumns, buyer, ...rest];
  }
  return [...offerColumns, ...core];
}

export function buildDetailProductColumnDefs() {
  return productCoreColumns({ sortable: false });
}
