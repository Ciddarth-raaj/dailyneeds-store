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
      view_brands: {
        title: 'View Brands',
        selected: false,
        location: '/brands'
      },
      view_category: {
        title: 'View Categories',
        selected: false,
        location: '/categories'
      },
      view_subcategory: {
        title: 'View Sub Categories',
        selected: false,
        location: '/subcategories'
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
        title: 'Without Adhaar',
        selected: false,
        location: '/without-adhaar'
      },
      view_bank: {
        title: 'Without Bank Details',
        selected: false,
        location: '/bank'
      },
      view_salary: {
        title: 'Salary Advance',
        selected: false,
        location: '/salary'
      },
      view_resignation: {
        title: 'Resignation',
        selected: false,
        location: '/resignation'
      },
    }
  },
  products: {
    title: 'Products',
    selected: false,
    openPage: false,
    icon: 'fa-archive',
    subMenu: {
      view_products: {
        title: 'View Products',
        selected: false,
        location: '/products'
      }
    }
  }
}
