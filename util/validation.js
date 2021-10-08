import * as Yup from "yup";

export const Validation = Yup.object({
	employee_name: Yup.string().nullable().required("Fill Name"),
	father_name: Yup.string().nullable().required("Fill Father Name"),
	dob: Yup.string().nullable().max(new Date(), "Must be 15 characters or less").required("Fill Date of birth"),
	permanent_address: Yup.string().nullable().required("Fill Address"),
	residential_address: Yup.string().nullable().required("Fill Residential Address"),
	gender: Yup.string().nullable().required("Choose Gender"),
	// blood_group: Yup.string().nullable().required("Choose BloodGroup"),
	designation_id: Yup.string().nullable().required("Choose Designation"),
	marital_status: Yup.string().nullable().required("Choose Marital Status"),
	shift_id: Yup.string().nullable().required("Choose Shift"),
	store_id: Yup.string().nullable().required("Choose Store"),
	department_id: Yup.string().nullable().required("Choose Department"),
	primary_contact_number: Yup.number().nullable().typeError("Must be a number").min(123456789, "Must be 9 or More").max(12345678900, "Must be 10 characters or less").required("Fill Contact Number"),
	// alternateNo: Yup.string()
	// 	.min(123456789, "Must be 9 or More")
	// 	.max(12345678900, "Must be 10 characters or less")
	// 	.required("Fill Alternate Number"),
	// email_id: Yup.string()
	// 	.nullable()
	// 	.email("Invalid email")
	// 	.required("Fill Email"),
	qualification: Yup.string().nullable().required("Fill Educational Qualification"),
	// introducerName: Yup.string().required("Fill Introducer Name"),
	// introducerDetails: Yup.string()
	// 	.min(30, "Must be 30 characters or more")
	// 	.required("Fill Introducer Details"),
	// id_number: Yup.number()
	// 	.typeError("Must be a number")
	// 	.nullable()
	// 	.required("Fill Employee ID"),
	salary: Yup.string().nullable().required("Fill Salary"),
	// uniform_qty: Yup.string().required("Fill Unifrom"),
	// experience: Yup.string().required("Fill Experience"),
	// joiningDate: Yup.string().required("Fill Joining Date"),
	// resignationDate: Yup.string().required("Fill Resignation Date"),
	// idNo: Yup.number().required("Fill ID Card No"),
});

export const SalaryValidation = Yup.object({
	employee_name: Yup.string().required("Choose Employee Name"),
	loan_amount: Yup.string().required("Enter Loan Amount"),
	installment: Yup.string().required("Select An Installment Duration")
})

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
});

export const ShiftValidation = Yup.object({
	shift_name: Yup.string().required("Fill Shift Name"),
	shift_in_time: Yup.string().nullable().required("Fill Shift in Time"),
	shift_out_time: Yup.string().nullable().required("Fill Shift out Time"),
});

export const BranchValidation = Yup.object({
	outlet_name: Yup.string().nullable().required("Fill Name"),
	outlet_nickname: Yup.string().nullable().required("Fill Nickname"),
	outlet_phone: Yup.number().nullable().typeError("Must be a number").min(123456789, "Must be 9 or More").max(12345678900, "Must be 10 characters or less").required("Fill Contact Number"),
	outlet_address: Yup.string().nullable().required("Fill Address"),
});
export const CompanyDetailsValidation = Yup.object({
	company_name: Yup.string().nullable().required("Fill Company Name"),
	contact_number: Yup.number().nullable().typeError("Must be a number").min(123456789, "Must be 9 or More").max(12345678900, "Must be 10 characters or less").required("Fill Contact Number"),
	reg_address: Yup.string().nullable().required("Fill Address"),
	gst_number: Yup.string().nullable().required("Fill GST"),
	tan_number: Yup.string().nullable().required("Fill TAN"),
	pan_number: Yup.string().nullable().required("Fill PAN"),
	pf_number: Yup.string().nullable().required("Fill PS"),
	esi_number: Yup.string().nullable().required("Fill ESI"),
});
export const ProductItemsValidation = Yup.object({
	id: Yup.number().nullable().required("Fill Id"),
	name: Yup.string().nullable().required("Fill Name"),
	brand_name: Yup.string().nullable().required("Fill Brand Name"),
	combo_name: Yup.string().nullable().required("Fill Combo Name"),
	department_name: Yup.string().nullable().required("Fill Department Name"),
	category_name: Yup.string().nullable().required("Fill Category Name"),
	subcategory_name: Yup.string().nullable().required("Fill Sub Category Name"),
	distributor: Yup.string().nullable().required("Fill Distributor"),
	distributor_name: Yup.string().nullable().required("Fill Distributor Name"),
	manufacturer_name: Yup.string().nullable().required("Fill Manufacturer Name"),
	flavours: Yup.string().nullable().required("Fill Flavours"),
	measure: Yup.string().nullable().required("Fill Measure"),
	measure_in: Yup.string().nullable().required("Fill Measure In"),
	packaging_type: Yup.string().nullable().required("Fill Packaging Type"),
	preparation_type: Yup.string().nullable().required("Fill Preparation Type"),
	cleaning: Yup.number().nullable().required("Fill Cleaning"),
	sticker: Yup.number().nullable().required("Fill Sticker"),
	grinding: Yup.number().nullable().required("Fill Grinding"),
	cover_type: Yup.number().nullable().required("Fill Cover Type"),
	cover_size: Yup.number().nullable().required("Fill Cover Size"),
	tax_id: Yup.string().nullable().required("Fill Tax Id"),
	hsn_code: Yup.string().nullable().required("Fill HSN Code"),
	status: Yup.string().nullable().required("Fill Status"),
	is_online_allowed: Yup.number().nullable().required("Fill Alllowed Online"),
	life_cucle: Yup.string().nullable().required("Fill Life Cycle"),
});
export const EmployeeFamilyValidation = Yup.object({
	name: Yup.string().nullable().required("Fill Name"),
	dob: Yup.string().nullable().max(new Date(), "Enter a valid Date").required("Fill Date of birth"),
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
