export const LOCAL_PURCHASE_40_PERC = 40;
const LEGACY_LOCAL_PURCHASE_28_PERC = 28;
const CESS_PERC = 12;

export const shouldShowIGST = (values) => {
  if (
    !values?.supplier_gstn ||
    values?.supplier_gstn == "" ||
    values?.supplier_gstn == 0 ||
    values?.supplier_gstn?.startsWith("34")
  ) {
    return false;
  }

  return true;
};

const findTaxEntry = (arr, perc, taxable = null) =>
  (arr || []).find((entry) => {
    if (Number(entry.PERC) !== perc) {
      return false;
    }
    if (taxable == null || taxable === "") {
      return true;
    }
    return Number(entry.TAXABLE) === Number(taxable);
  });

/** Build modal GST rows from stored purchase tax arrays (legacy 28%+cess → 40%). */
export const buildPurchaseGstRows = (item) => {
  const taxList = shouldShowIGST(item) ? item.igst : item.sgst;
  const displayPerc = (perc) =>
    shouldShowIGST(item) ? parseFloat(perc) : parseFloat(perc) * 2;

  let gst = (taxList || []).map((taxItem) => ({
    VALUE: taxItem.VALUE,
    PERC: displayPerc(taxItem.PERC),
    TAXABLE: taxItem.TAXABLE,
  }));

  if (!shouldShowIGST(item)) {
    const legacyRows = gst.filter(
      (row) => Number(row.PERC) === LEGACY_LOCAL_PURCHASE_28_PERC && row.TAXABLE
    );

    legacyRows.forEach((legacyRow) => {
      const taxable = legacyRow.TAXABLE;
      const cessEntry =
        findTaxEntry(item.cess, CESS_PERC, taxable) ||
        (item.cess || []).find(
          (entry) =>
            Number(entry.PERC) === CESS_PERC && parseFloat(entry.VALUE) > 0
        );

      if (!cessEntry) {
        return;
      }

      const idx40 = gst.findIndex((row) => Number(row.PERC) === LOCAL_PURCHASE_40_PERC);
      const mergedRow = {
        VALUE: null,
        PERC: LOCAL_PURCHASE_40_PERC,
        TAXABLE: taxable,
      };

      if (idx40 >= 0) {
        gst[idx40] = mergedRow;
      } else {
        gst.push(mergedRow);
      }

      gst = gst.filter(
        (row) =>
          !(
            Number(row.PERC) === LEGACY_LOCAL_PURCHASE_28_PERC &&
            Number(row.TAXABLE) === Number(taxable)
          )
      );
    });
  }

  return gst.sort((a, b) => a.PERC - b.PERC);
};

export const calculateTotalAmount = (values) => {
  let {
    cash_discount,
    scheme_difference,
    cost_difference,
    due,
    freight_charges,
    supplier_credit_note,
    round_off,
    mmd_goods_tcs_amt,
    gst,
    mmh_manual_disc,
  } = values;

  let total_gst = 0;
  let total_cgst = 0;
  let total_sgst = 0;
  let total_igst = 0;

  gst.forEach((item) => {
    const TAXABLE =
      item.TAXABLE === "" || item.TAXABLE === null
        ? 0
        : parseFloat(item.TAXABLE);

    total_gst += TAXABLE;

    const taxedValue = (TAXABLE * (item.PERC / 2)) / 100;
    const taxedValueIGST = (TAXABLE * item.PERC) / 100;

    total_cgst += parseFloat(taxedValue.toFixed(2));
    total_sgst += parseFloat(taxedValue.toFixed(2));
    total_igst += parseFloat(taxedValueIGST.toFixed(2));
  });

  if (isNaN(cash_discount)) {
    cash_discount = 0;
  } else {
    cash_discount = -1 * cash_discount;
  }

  if (isNaN(scheme_difference)) {
    scheme_difference = 0;
  } else {
    scheme_difference = -1 * scheme_difference;
  }

  if (isNaN(cost_difference)) {
    cost_difference = 0;
  } else {
    cost_difference = -1 * cost_difference;
  }

  if (isNaN(freight_charges)) {
    freight_charges = 0;
  } else {
    freight_charges = freight_charges;
  }

  if (isNaN(supplier_credit_note)) {
    supplier_credit_note = 0;
  } else {
    supplier_credit_note = -1 * supplier_credit_note;
  }

  if (isNaN(mmh_manual_disc)) {
    mmh_manual_disc = 0;
  } else {
    mmh_manual_disc = -1 * mmh_manual_disc;
  }

  if (isNaN(round_off)) {
    round_off = 0;
  }

  if (isNaN(mmd_goods_tcs_amt)) {
    mmd_goods_tcs_amt = 0;
  }

  if (isNaN(due)) {
    due = 0;
  } else {
    due = -1 * due;
  }

  let total_tax = 0;

  if (shouldShowIGST(values)) {
    total_tax = parseFloat(total_igst.toFixed(2));
  } else {
    total_tax =
      parseFloat(total_sgst.toFixed(2)) + parseFloat(total_cgst.toFixed(2));
  }

  const total_amount =
    parseFloat(cash_discount) +
    parseFloat(scheme_difference) +
    parseFloat(cost_difference) +
    parseFloat(due) +
    parseFloat(freight_charges) +
    parseFloat(supplier_credit_note) +
    parseFloat(round_off) +
    parseFloat(mmd_goods_tcs_amt) +
    parseFloat(mmh_manual_disc) +
    total_tax +
    total_gst;

  return {
    total_amount: isNaN(total_amount)
      ? "-"
      : parseFloat(total_amount)?.toFixed(2),
    total_sgst: total_sgst?.toFixed(2),
    total_cgst: total_cgst?.toFixed(2),
    total_gst: total_gst?.toFixed(2),
    total_igst: total_igst?.toFixed(2),
  };
};
