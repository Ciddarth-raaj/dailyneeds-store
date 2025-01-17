import * as Yup from "yup";

export const Validation = Yup.object({
  employee_name: Yup.string().nullable().required("Fill Name"),
  telegram_username: Yup.string().nullable().optional("Fill Telegram Username"),
  employee_id: Yup.number().nullable().required("Fill Employee ID"),
  //   father_name: Yup.string().required("Fill Father Name"),
  // dob: Yup.string().nullable().max(new Date(), "Must be 15 characters or less").required("Fill Date of birth"),
  // permanent_address: Yup.string().nullable().required("Fill Address"),
  // residential_address: Yup.string().nullable().required("Fill Residential Address"),
  gender: Yup.string().nullable().required("Choose Gender"),
  payment_type: Yup.string().required("Select Payment"),
  bank_name: Yup.string()
    .nullable()
    .when("payment_type", {
      is: (val) => val === "1",
      then: Yup.string().nullable().required("Bank Name is required"),
    }),
  ifsc: Yup.string()
    .nullable()
    .when("payment_type", {
      is: (val) => val === "1",
      then: Yup.string().nullable().required("ifsc is required"),
    }),
  account_no: Yup.string()
    .nullable()
    .when("payment_type", {
      is: (val) => val === "1",
      then: Yup.string().nullable().required("account number is required"),
    }),
  // blood_group: Yup.string().nullable().required("Choose BloodGroup"),
  designation_id: Yup.string().nullable().required("Choose Designation"),
  // marital_status: Yup.string().nullable().required("Choose Marital Status"),
  shift_id: Yup.string().nullable().required("Choose Shift"),
  store_id: Yup.string().nullable().required("Choose Store"),
  department_id: Yup.string().nullable().required("Choose Department"),
  primary_contact_number: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 or More")
    .max(12345678900, "Must be 10 characters or less")
    .required("Fill Contact Number"),
  // alternate_contact_number:  Yup.number().nullable().typeError("Must be a number").min(123456789, "Must be 9 or More").max(12345678900, "Must be 10 characters or less").required("Fill Contact Number"),
  // email_id: Yup.string()
  // 	.nullable()
  // 	.email("Invalid email")
  // 	.required("Fill Email"),
  // bank_name: Yup.string().nullable().required("Fill Bank Name"),
  // ifsc: Yup.string().nullable().required("Fill IFSC"),
  // account_no: Yup.string().nullable().required("Fill Account Number"),
  //   qualification: Yup.string()
  //     .nullable()
  //     .required("Fill Educational Qualification"),
  // introducerName: Yup.string().required("Fill Introducer Name"),
  // introducerDetails: Yup.string()
  // 	.min(30, "Must be 30 characters or more")
  // 	.required("Fill Introducer Details"),
  // id_number: Yup.number()
  // 	.typeError("Must be a number")
  // 	.nullable()
  // 	.required("Fill Employee ID"),
  salary: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .required("Fill Salary"),
  // uniform_qty: Yup.string().required("Fill Unifrom"),
  // experience: Yup.string().required("Fill Experience"),
  // joiningDate: Yup.string().required("Fill Joining Date"),
  // resignationDate: Yup.string().required("Fill Resignation Date"),
  // idNo: Yup.number().required("Fill ID Card No"),
});

export const ResignationValidation = Yup.object({
  reason: Yup.string().required("Fill Reason"),
  reason_type: Yup.string().required("choose Reason Type"),
  resignation_date: Yup.string().required("Choose Resignation Date"),
});
export const SalaryValidation = Yup.object({
  // employee: Yup.string().required("Choose Employee Name"),
  loan_amount: Yup.string().required("Enter Loan Amount"),
  installment_duration: Yup.string().required("Select An Installment Duration"),
});
export const VehicleValidation = Yup.object({
  vehicle_number: Yup.string().required("Enter Vehicle Number"),
  vehicle_name: Yup.string().required("Enter Vehicle Name"),
  chasis_number: Yup.string().required("Enter Chasis Number"),
  engine_number: Yup.string().required("Enter Engine Number"),
  fc_validity: Yup.string().required("Enter FC Validity"),
  insurance_validity: Yup.string().required("Enter Insurance Validity"),
});
// export const PackValidation = Yup.object({
// 	material_type: Yup.string().required("please enter Material Type"),
// 	material_size: Yup.string().required("please enter Material Size"),
// 	weight: Yup.string().required("please enter Weight"),
// 	cost: Yup.string().required("please enter Cost"),
// 	description: Yup.string().required("please enter Description")
// })

export const DepartmentValidation = Yup.object({
  department_name: Yup.string().required("Fill department Name"),
  // designationName: Yup.string().required("Fill department Name"),
  // status: Yup.string().required("Choose status"),
});

export const DesignationValidation = Yup.object({
  designation_name: Yup.string().required("Fill designation Name"),
  // designationName: Yup.string().required("Fill department Name"),
  // status: Yup.string().required("Choose status"),
  online_portal: Yup.string().nullable().required("Choose Access"),
  login_access: Yup.string().nullable().required("Require Login Access"),
});
// export const OpenIssueValidation = Yup.object({
// 	store_id: Yup.string().nullable().required("Choose Store"),

// 	// designationName: Yup.string().required("Fill department Name"),
// 	// status: Yup.string().required("Choose status"),
// 	online_portal: Yup.string().nullable().required("Choose Access"),
// 	login_access: Yup.string().nullable().required("Require Login Access")
// });
export const IssueValidation = Yup.object({
  name: Yup.string().required("Fill Name"),
  email: Yup.string().nullable().email("Invalid email").required("Fill Email"),
  primary_contact_no: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 or More")
    .max(12345678900, "Must be 10 characters or less")
    .required("Fill Contact Number"),
  secondary_contact_no: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 or More")
    .max(12345678900, "Must be 10 characters or less")
    .required("Fill Contact Number"),
  address: Yup.string().required("Fill Address"),
  description: Yup.string().required("Fill Description"),
});

export const ShiftValidation = Yup.object({
  shift_name: Yup.string().required("Fill Shift Name"),
  shift_in_time: Yup.string().nullable().required("Fill Shift in Time"),
  shift_out_time: Yup.string().nullable().required("Fill Shift out Time"),
});

export const BranchValidation = Yup.object({
  outlet_name: Yup.string().nullable().required("Fill Name"),
  outlet_nickname: Yup.string().nullable().required("Fill Nickname"),
  outlet_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 or More")
    .max(12345678900, "Must be 10 characters or less")
    .required("Fill Contact Number"),
  outlet_address: Yup.string().nullable().required("Fill Address"),
});
export const CompanyDetailsValidation = Yup.object({
  company_name: Yup.string().nullable().required("Fill Company Name"),
  contact_number: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 or More")
    .max(12345678900, "Must be 10 characters or less")
    .required("Fill Contact Number"),
  reg_address: Yup.string().nullable().required("Fill Address"),
  gst_number: Yup.string().nullable().required("Fill GST"),
  tan_number: Yup.string().nullable().required("Fill TAN"),
  pan_number: Yup.string().nullable().required("Fill PAN"),
  pf_number: Yup.string().nullable().required("Fill PS"),
  esi_number: Yup.string().nullable().required("Fill ESI"),
});
export const ProductItemsValidation = Yup.object({
  return: Yup.number().nullable().required("Choose Return"),
  packaging_type: Yup.number().nullable().required("Choose Packaging Type"),
  cleaning: Yup.number().nullable().required("Choose cleaning"),
  sticker: Yup.number().nullable().required("Choose sticker"),
  grinding: Yup.number().nullable().required("Choose Grinding"),
  cover_type: Yup.number().nullable().required("Choose Cover Type"),
  cover_sizes: Yup.number().nullable().required("Choose Cover Size"),
  gf_description: Yup.string().nullable().required("Enter Description"),
  gf_detailed_description: Yup.string()
    .nullable()
    .required("Enter Detailed Desription"),
  de_distributor: Yup.string().nullable().required("Choose Distrivutor"),
  variant: Yup.number().nullable().required("Choose Variant"),
  variant_of: Yup.number().nullable().required("Choose Variant Of"),
});
export const EmployeeFamilyValidation = Yup.object({
  name: Yup.string().nullable().required("Fill Name"),
  dob: Yup.string()
    .nullable()
    .max(new Date(), "Enter a valid Date")
    .required("Fill Date of birth"),
  gender: Yup.string().nullable().required("Choose Gender"),
  blood_group: Yup.string().nullable().required("Choose BloodGroup"),
  relation: Yup.string().nullable().required("Choose Relation"),
  profession: Yup.string().nullable().required("Fill Profession"),
  nationality: Yup.string().nullable().required("Choose Nationality"),
});
export const ItemsValidation = Yup.object({
  material_name: Yup.string().nullable().required("Fill Material Name"),
  description: Yup.string().nullable(),
  material_category: Yup.string().nullable().required("Choose Category"),
});
