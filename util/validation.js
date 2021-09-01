import * as Yup from "yup";

export const Validation = Yup.object({
	employee_name: Yup.string().nullable().required("Fill Name"),
	father_name: Yup.string().nullable().required("Fill Father Name"),
	dob: Yup.string()
		.nullable()
		.max(new Date(), "Must be 15 characters or less")
		.required("Fill Date of birth"),
	permanent_address: Yup.string().nullable().required("Fill Address"),
	residential_address: Yup.string().nullable().required("Fill Residential Address"),
	gender: Yup.string().nullable().required("Choose Gender"),
	// blood_group: Yup.string().nullable().required("Choose BloodGroup"),
	designation_id: Yup.string().nullable().required("Choose Designation"),
	marital_status: Yup.string().nullable().required("Choose Marital Status"),
	shift_id: Yup.string().nullable().required("Choose Shift"),
	store_id: Yup.string().nullable().required("Choose Store"),
	department_id: Yup.string().nullable().required("Choose Department"),
	primary_contact_number: Yup.number()
		.nullable()
		.typeError("Must be a number")
		.min(123456789, "Must be 9 or More")
		.max(12345678900, "Must be 10 characters or less")
		.required("Fill Contact Number"),
	// alternateNo: Yup.string()
	// 	.min(123456789, "Must be 9 or More")
	// 	.max(12345678900, "Must be 10 characters or less")
	// 	.required("Fill Alternate Number"),
	// email_id: Yup.string()
	// 	.nullable()
	// 	.email("Invalid email")
	// 	.required("Fill Email"),
	qualification: Yup.string()
		.nullable()
		.required("Fill Educational Qualification"),
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

export const DepartmentValidation = Yup.object({
	department_name: Yup.string().required("Fill department Name"),
	// designationName: Yup.string().required("Fill department Name"),
	status: Yup.string().required("Choose status"),
});

export const DesignationValidation = Yup.object({
	designation_name: Yup.string().required("Fill designation Name"),
	// designationName: Yup.string().required("Fill department Name"),
	status: Yup.string().required("Choose status"),
	online_portal: Yup.string().nullable().required("Choose Access"),
});

export const ShiftValidation = Yup.object({
	status: Yup.string().required("Choose status"),
	shift_name: Yup.string().required("Fill designation Name"),
	shift_in_time: Yup.string()
	.nullable()
	.max(new Date(), "Must be 15 characters or less")
	.required("Fill Shift in Time"),
	shift_out_time: Yup.string()
	.nullable()
	.max(new Date(), "Must be 15 characters or less")
	.required("Fill Shift out Time"),
});