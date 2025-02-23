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
    tot_gst_cess_amt,
  } = values;

  let total_gst = 0;
  let total_cgst = 0;
  let total_sgst = 0;

  gst.forEach((item) => {
    const TAXABLE = item.TAXABLE === "" ? 0 : item.TAXABLE;

    total_gst += TAXABLE;

    const taxedValue = (TAXABLE * (item.PERC / 2)) / 100;

    total_cgst += taxedValue;
    total_sgst += taxedValue;
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

  if (isNaN(tot_gst_cess_amt)) {
    tot_gst_cess_amt = 0;
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
    parseFloat(tot_gst_cess_amt) +
    total_sgst +
    total_cgst +
    total_gst;

  return {
    total_amount: isNaN(total_amount)
      ? "-"
      : parseFloat(total_amount)?.toFixed(2),
    total_sgst: total_sgst?.toFixed(2),
    total_cgst: total_cgst?.toFixed(2),
    total_gst: total_gst?.toFixed(2),
  };
};
