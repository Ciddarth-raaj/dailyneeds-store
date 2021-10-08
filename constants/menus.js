export default {
  employee: {
    title: 'Employees',
    selected: true,
    openPage: true,
    icon: 'fa-users',
    subMenu: {
      dashboard: {
        title: 'Dashboard',
        selected: false,
        location: '/'
      },
      view: {
        title: 'View Employee',
        selected: false,
        location: '/employee'
      },
      view_departments: {
        title: 'View Departments',
        selected: false,
        location: '/department'
      },
      view_designation: {
        title: 'View Designations',
        selected: false,
        location: '/designation'
      },
      view_shift: {
        title: 'View Shift',
        selected: false,
        location: '/shift'
      },
      view_family: {
        title: 'View Family',
        selected: false,
        location: '/family'
      },
      // view_adhaar: {
      //     title: "View Adhaar",
      //     selected: false,
      //     location: "/adhaar",
      // },
      view_documents: {
        title: 'View documents',
        selected: false,
        location: '/document'
      },
      view_withoutAdhaar: {
        title: 'Users Without Adhaar',
        selected: false,
        location: '/without-adhaar'
      },
      view_bank: {
        title: 'Users Without Bank Details',
        selected: false,
        location: '/bank'
      },
      view_salary: {
        title: 'All Employee Salary Advance',
        selected: false,
        location: '/salary'
      }
    }
  }
}
