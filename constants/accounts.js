import { PEOPLE_TYPES } from "./values";

export const EMPTY_ACCOUNT_OBJECT = {
  person_type: null,
  payment_type: null,
  person_id: null,
  description: "",
  amount: null,
};

export const MODIFIED_PEOPLE_TYPES = [
  {
    id: 4,
    value: "Employee",
  },
  ...PEOPLE_TYPES,
];
