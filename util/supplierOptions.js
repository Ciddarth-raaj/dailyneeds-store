/**
 * Supplier choices for a picker, from GET /product-distributors.
 *
 * Suppliers come from RetailPilot. A pre-RetailPilot supplier is kept only
 * because history refers to it (is_old): it is never offered for a new
 * choice - except as the value a record already has, so that record still
 * shows its supplier.
 *
 * Plain CommonJS with no dependencies, so `node --test` loads it as is.
 */
function supplierOptions(distributors, keepCode = null) {
  const keep = keepCode == null || keepCode === "" ? null : String(keepCode);
  return (distributors || [])
    .filter((d) => d && d.HQ_DIST_CODE != null)
    .filter((d) => !d.is_old || String(d.HQ_DIST_CODE) === keep)
    .map((d) => ({ id: d.HQ_DIST_CODE, value: d.MDM_DIST_NAME || String(d.HQ_DIST_CODE) }));
}

/** The Distributors page lists RetailPilot's suppliers only. */
function currentSuppliers(distributors) {
  return (distributors || []).filter((d) => d && !d.is_old);
}

module.exports = { supplierOptions, currentSuppliers };
