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
        title: 'Employee',
        selected: false,
        location: '/employee'
      },
      view_departments: {
        title: 'Department',
        selected: false,
        location: '/department'
      },
      view_designation: {
        title: 'Designation',
        selected: false,
        location: '/designation'
      },
      view_shift: {
        title: 'Shift',
        selected: false,
        location: '/shift'
      },
      view_family: {
        title: 'Family',
        selected: false,
        location: '/family'
      },
      // view_adhaar: {
      //     title: "View Adhaar",
      //     selected: false,
      //     location: "/adhaar",
      // },
      view_documents: {
        title: 'Document',
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
        title: 'Product',
        selected: false,
        location: '/products'
      },
      // view_departments: {
      //   title: 'View Deapartments',
      //   selected: false,
      //   location: '/department'
      // },
      view_category: {
        title: 'Category',
        selected: false,
        location: '/categories'
      },
      view_subcategory: {
        title: 'Subcategory',
        selected: false,
        location: '/subcategories'
      },
      view_brands: {
        title: 'Brand',
        selected: false,
        location: '/brands'
      },
      view_product_department: {
        title: 'Product Department',
        selected: false,
        location: '/product-department'
      },
    }
  },
  indents: {
    title: 'Indents & Transportation',
    selected: false,
    openPage: false,
    icon: 'fa-archive',
    subMenu: {
      new_indent: {
        title: 'New Indent',
        selected: false,
        location: '/indent'
      },
      indents_sent: {
        title: 'Indents Sent',
        selected: false,
        location: '/indent/sent'
      },
      indents_received: {
        title: 'Indents Received',
        selected: false,
        location: '/indent/received'
      },
      create_despatch: {
        title: 'Create Despatch',
        selected: false,
        location: '/indent/despatch'
      },
      accept_indents: {
        title: 'Accept Indents',
        selected: false,
        location: '/indent/acceptIndent'
      },
      issue_received_indent: {
        title: 'Issues In Received Indents',
        selected: false,
        location: '/indent/issueReceived'
      },
      issue_sent_indent: {
        title: 'Issues In Sent Indents',
        selected: false,
        location: '/indent/issueSent'
      },
    },
  },
  maintenance: {
    title: 'Maintenance',
    selected: false,
    openPage: false,
    icon: 'fa-archive',
    subMenu: {
      open_issue: {
        title: 'Open Issues',
        selected: false,
        location: '/open-issue'
      },
      all_issue: {
        title: 'All Issues',
        selected: false,
        location: '/all-issue'
      },
      add_issue: {
        title: 'Add Issues',
        selected: false,
        location: '/addissue'
      },
      service_provider: {
        title: 'Service Provider',
        selected: false,
        location: '/serviceprovider-list'
      },
      add_service_provider: {
        title: 'Add Service Provider',
        selected: false,
        location: '/addservice-provider'
      },
    }
  }
}
