import * as Yup from "yup";

export const EBOOK_VALIDATION_SCHEMA = Yup.object({
  pos_list: Yup.array(
    Yup.object({
      paytm_tid: Yup.string().nullable().required("Fill TID"),
      hdur: Yup.number()
        .nullable()
        .typeError("Fill UPI value")
        .required("Fill UPI value"),
      hfpp: Yup.number()
        .nullable()
        .typeError("Fill Card value")
        .required("Fill Card value"),
      sedc: Yup.number()
        .nullable()
        .typeError("Fill Sodexo value")
        .required("Fill Sodexo value"),
      ppbl: Yup.number()
        .nullable()
        .typeError("Fill Paytm value")
        .required("Fill Paytm value"),
    }).required("Need atleast one row")
  ),
});
