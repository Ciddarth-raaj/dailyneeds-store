import * as Yup from "yup";

export const Validation = Yup.object({
    name: Yup.string()
        .required('Fill Name'),
    fatherName: Yup.string()
        .required('Fill Father Name'),
    dob: Yup.string()
        .max(new Date(), 'Must be 15 characters or less')
        .required('Fill Date of birth'),
    permanentAddress: Yup.string()
        .required('Fill Address'),
    residentialAddress: Yup.string()
        .required('Fill residential Address'),
    gender: Yup.string()
        .required('Choose Gender'),
    blood_group_id: Yup.string()
        .required('Choose BloodGroup'),
    designation_id: Yup.string()
        .required('Choose Designation'),
    store_id: Yup.string()
        .required('Choose Store'),
    department_id: Yup.string()
        .required('Choose Department'),
    contactNo: Yup.number()
        .min(123456789, 'Must be 9 or More')
        .max(12345678900, 'Must be 10 characters or less')
        .required('Fill Contact Number'),
    alternateNo: Yup.string()
        .min(123456789, 'Must be 9 or More')
        .max(12345678900, 'Must be 10 characters or less')
        .required('Fill Alternate Number'),
    email: Yup.string()
        .email("Invalid email")
        .required('Fill Email'),
    educationalQualification: Yup.string()
        .required('Fill Educational Qualification'),
    introducerName: Yup.string()
        .required('Fill Introducer Name'),
    introducerDetails: Yup.string()
        .min(30, 'Must be 30 characters or more')
        .required('Fill Introducer Details'),
    employeeId: Yup.number()
        .required('Fill Employee ID'),
    salary: Yup.string()
        .required('Fill Salary'),
    unifrom: Yup.string()
        .required('Fill Unifrom'),
    experience: Yup.string()
        .required('Fill Experience'),
    joiningDate: Yup.string()
        .required('Fill Joining Date'),
    resignationDate: Yup.string()
        .required('Fill Resignation Date'),
    idNo: Yup.number()
        .required('Fill ID NO'),
})

export const Create = Yup.object({
    departmentName: Yup.string()
        .required('Fill department Name'),
    designationName: Yup.string()
        .required('Fill department Name'),
    status: Yup.string()
        .required('Choose status')
})