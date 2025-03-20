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

export const calculateTotalAmount = (values) => {
  let { scheme_difference, tcs_value, gst, round_off } = values;

  let total_gst = 0;
  let total_cgst = 0;
  let total_sgst = 0;
  let total_igst = 0;

  gst?.forEach((item) => {
    console.log("CIDD", item.TAXABLE);
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

  if (isNaN(scheme_difference)) {
    scheme_difference = 0;
  } else {
    scheme_difference = -1 * scheme_difference;
  }

  if (isNaN(tcs_value)) {
    tcs_value = 0;
  }

  if (isNaN(round_off)) {
    round_off = 0;
  }

  let total_tax = 0;

  if (shouldShowIGST(values)) {
    total_tax = parseFloat(total_igst.toFixed(2));
  } else {
    total_tax =
      parseFloat(total_sgst.toFixed(2)) + parseFloat(total_cgst.toFixed(2));
  }

  const total_amount =
    parseFloat(scheme_difference) +
    parseFloat(tcs_value) +
    parseFloat(round_off) +
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
