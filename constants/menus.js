/* eslint-disable import/no-anonymous-default-export */
export default {
  employee: {
    title: "Employees",
    selected: true,
    openPage: true,
    icon: "fa-users",
    subMenu: {
      dashboard: {
        title: "Dashboard",
        permission: "dashboard",
        selected: false,
        location: "/",
      },
      view: {
        title: "Employee",
        permission: "view_employees",
        selected: false,
        location: "/employee",
      },
      view_departments: {
        title: "Department",
        permission: "view_department",
        selected: false,
        location: "/department",
      },
      view_designation: {
        title: "Designation",
        permission: "view_designation",
        selected: false,
        location: "/designation",
      },
      view_shift: {
        title: "Shift",
        permission: "view_shift",
        selected: false,
        location: "/shift",
      },
      view_family: {
        title: "Family",
        permission: "view_family",
        selected: false,
        location: "/family",
      },
      // view_adhaar: {
      //     title: "View Adhaar",
      //     selected: false,
      //     location: "/adhaar",
      // },
      view_documents: {
        title: "Document",
        permission: "view_documents",
        selected: false,
        location: "/document",
      },
      view_withoutAdhaar: {
        title: "Without Adhaar",
        permission: "view_without_adhaar",
        selected: false,
        location: "/without-adhaar",
      },
      view_bank: {
        title: "Without Bank Details",
        permission: "view_banks",
        selected: false,
        location: "/bank",
      },
      view_salary: {
        title: "Salary Advance",
        permission: "view_salary_advance",
        selected: false,
        location: "/salary",
      },
      view_resignation: {
        title: "Resignation",
        permission: "view_resignation",
        selected: false,
        location: "/resignation",
      },
      view_storebudget: {
        title: "Employee Count",
        permission: "view_store_budget",
        selected: false,
        location: "/store-budget",
      },
      view_whatsapporder: {
        title: "Whatsapp Orders",
        permission: "view_whatsapp_order",
        selected: false,
        location: "/whatsapp",
      },
    },
  },
  accounts: {
    title: "Accounts",
    selected: false,
    openPage: false,
    icon: "fa-ticket",
    subMenu: {
      view_account_sheet: {
        title: "Account Sheet",
        permission: "view_account_sheet",
        selected: false,
        location: "/accounts",
      },
      add_account_sheet: {
        title: "Add Account Sheet",
        permission: "add_account_sheet",
        selected: false,
        location: "/accounts/create",
      },
      add_e_payment: {
        title: "Add E-Payment",
        permission: "add_account_sheet",
        selected: false,
        location: "/accounts/epayment/create",
      },
    },
  },
  reconcilation: {
    title: "Reconciliation",
    selected: false,
    openPage: false,
    icon: "fa-calculator",
    subMenu: {
      view_sales_reconciliation: {
        title: "Sales",
        permission: "view_sales_reconciliation",
        selected: false,
        location: "/reconciliation/sales",
      },
      view_payment_receipts_reconciliation: {
        title: "Payment / Receipts",
        permission: "view_payment_receipts_reconciliation",
        selected: false,
        location: "/reconciliation/payment-receipts",
      },
      view_epayment_reconciliation: {
        title: "E-Payment",
        permission: "view_epayment_reconciliation",
        selected: false,
        location: "/reconciliation/epayment",
      },
      view_reconciliation_difference: {
        title: "Difference",
        permission: "view_reconciliation_difference",
        selected: false,
        location: "/reconciliation/difference",
      },
      view_digital_payments: {
        title: "Digital Payments",
        permission: "view_digital_payments",
        selected: false,
        location: "/reconciliation/digital-payments",
      },
    },
  },
  purchase: {
    title: "Purchase",
    selected: false,
    openPage: false,
    icon: "fa-users",
    subMenu: {
      view_purchase_order: {
        title: "All Purchases",
        permission: "view_purchases",
        selected: false,
        location: "/purchase",
      },
      view_purchases_difference: {
        title: "Difference",
        permission: "view_purchases_difference",
        selected: false,
        location: "/purchase/difference",
      },
    },
  },
  products: {
    title: "Products",
    selected: false,
    openPage: false,
    icon: "fa-archive",
    subMenu: {
      view_products: {
        title: "Product",
        permission: "view_products",
        selected: false,
        location: "/products",
      },
      // view_departments: {
      //   title: 'View Deapartments',
      //   selected: false,
      //   location: '/department'
      // },
      view_category: {
        title: "Category",
        permission: "view_category",
        selected: false,
        location: "/categories",
      },
      view_subcategory: {
        title: "Subcategory",
        permission: "view_subcategory",
        selected: false,
        location: "/subcategories",
      },
      view_brands: {
        title: "Brand",
        permission: "view_brands",
        selected: false,
        location: "/brands",
      },
      view_product_department: {
        title: "Product Department",
        permission: "view_product_department",
        selected: false,
        location: "/product-department",
      },
    },
  },
  indents: {
    title: "Indents & Transportations",
    selected: false,
    openPage: false,
    icon: "fa-truck",
    subMenu: {
      new_indent: {
        title: "New Indent",
        permission: "view_indents",
        selected: false,
        location: "/indent",
      },
      indents_sent: {
        title: "Indents Sent",
        permission: "sent_indents",
        selected: false,
        location: "/indent/indent-sent",
      },
      indents_received: {
        title: "Indents Received",
        permission: "received_indents",
        selected: false,
        location: "/indent/indent-received",
      },
      create_despatch: {
        title: "Create Despatch",
        permission: "add_dispatch",
        selected: false,
        location: "/indent/despatch",
      },
      accept_indents: {
        title: "Accept Indents",
        permission: "accept_indents",
        selected: false,
        location: "/indent/acceptIndent",
      },
      issue_received_indent: {
        title: "Issues In Received Indents",
        permission: "view_issues_received_indents",
        selected: false,
        location: "/indent/issue-received",
      },
      issue_sent_indent: {
        title: "Issues In Sent Indents",
        permission: "view_issues_sent_indents",
        selected: false,
        location: "/indent/issue-sent",
      },
      vehicle: {
        title: "Vehicle",
        permission: "view_vehicle",
        selected: false,
        location: "/vehicle",
      },
    },
  },
  tickets: {
    title: "Tickets",
    selected: false,
    openPage: false,
    icon: "fa-ticket",
    subMenu: {
      open_issue: {
        title: "Open Issues",
        permission: "view_open_issues",
        selected: false,
        location: "/open-issue",
      },
      // all_issue: {
      //   title: 'All Issues',
      //   selected: false,
      //   location: '/all-issue'
      // },
      // add_issue: {
      //   title: 'Add Issue',
      //   selected: false,
      //   location: '/addissue'
      // },
    },
  },
  // contacts: {
  //   title: "Contacts",
  //   selected: false,
  //   openPage: false,
  //   icon: "fa-address-book",
  //   subMenu: {
  //     service_provider: {
  //       title: "Service Provider",
  //       permission: "view_service_provider",
  //       selected: false,
  //       location: "/serviceprovider-list",
  //     },
  //     // add_service_provider: {
  //     //   title: 'Add Service Provider',
  //     //   selected: false,
  //     //   location: '/addservice-provider'
  //     // },
  //   },
  // },
  master: {
    title: "Master",
    selected: false,
    openPage: false,
    icon: "fa-users",
    subMenu: {
      view_master_list: {
        title: "Master List",
        permission: "view_master_list",
        selected: false,
        location: "/master",
      },
    },
  },
};
