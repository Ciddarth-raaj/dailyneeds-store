import * as Yup from "yup";

export const Validation = Yup.object({
        name: Yup.string()
            .required('Require Name'),
        fatherName: Yup.string()
            .required('Require Father Name'),
        dob: Yup.string()
            .max(new Date(), 'Must be 15 characters or less')
            .required('Require Date of birth'),
        permanentAddress: Yup.string()
            .required('Require Address'),
        residentialAddress: Yup.string()
            .required('Require residential Address'),
        contactNo: Yup.number()
            .min(123456789, 'Must be 9 or More')
            .max(12345678900, 'Must be 10 characters or less')
            .required('Require Contact Number'),
        alternateNo: Yup.string()
            .min(123456789, 'Must be 9 or More')
            .max(12345678900, 'Must be 10 characters or less')
            .required('Require Alternate Number'),
        email: Yup.string()
            .email("Invalid email")
            .required('Require Email'),
        educationalQualification: Yup.string()
            .required('Require Educational Qualification'),
        introducerName: Yup.string()
            .required('Require Introducer Name'),
        introducerDetails: Yup.string()
            .min(30, 'Must be 30 characters or more')
            .required('Require Introducer Details'),
        employeeId: Yup.number()
            .required('Require Employee ID'),
        salary: Yup.string()
            .required('Require Salary'),
        unifrom: Yup.string()
            .required('Require Unifrom'),
        experience: Yup.string()
            .required('Require Experience'),
        joiningDate: Yup.string()
            .required('Require Joining Date'),
        resignationDate: Yup.string()  
            .required('Require Resignation Date'),
        idNo: Yup.number()      
            .required('Require ID NO'),
})