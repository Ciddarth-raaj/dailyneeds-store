import { PEOPLE_TYPES } from "./values";

export const EMPTY_ACCOUNT_OBJECT = {
  person_type: 0,
  payment_type: 0,
  person_id: 0,
  description: "",
  amount: 0,
  receipt: "",
};

export const MODIFIED_PEOPLE_TYPES = [
  {
    id: 5,
    value: "Employee",
  },
  ...PEOPLE_TYPES,
];
