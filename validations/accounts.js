import * as Yup from "yup";

export const ACCOUNT_VALIDATION_SCHEMA = Yup.object({
  date: Yup.date().required("Fill Date"),
  cashier_id: Yup.number()
    .typeError("Select a Cashier")
    .required("Select a Cashier"),
  total_sales: Yup.number()
    .typeError("Must be a number")
    .required("Fill Total Sales"),
  card_sales: Yup.number()
    .typeError("Must be a number")
    .required("Fill Card Sales"),
  loyalty: Yup.number().typeError("Must be a number").required("Fill Loyalty"),
  sales_return: Yup.number()
    .typeError("Must be a number")
    .required("Fill Sales Return"),
  accounts: Yup.array(
    Yup.object({
      person_type: Yup.number()
        .typeError("Select a Type")
        .required("Select a Type"),
      payment_type: Yup.number()
        .typeError("Select a Type")
        .required("Select a Type"),
      person_id: Yup.number()
        .typeError("Select a Person")
        .required("Select a Person"),
      description: Yup.string()
        .typeError("Fill the description")
        .required("Fill the description"),
      amount: Yup.number()
        .typeError("Fill the amount")
        .required("Fill the amount"),
    }).required("Fill Accounts")
  ),
});