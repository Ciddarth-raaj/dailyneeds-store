/* eslint-disable import/no-anonymous-default-export */
export default {
  dashboard: {
    title: "Dashboard",
    selected: true,
    // openPage: true,
    icon: "fa-pie-chart ",
    // location: "/",
    // permission: "dashboard",
    // isDirect: true,
    subMenu: {
      view_dashboard: {
        title: "Dashboard",
        permission: "dashboard",
        selected: false,
        location: "/",
      },
      view_products_dashboard: {
        title: "Products Dashboard",
        permission: "view_products_dashboard",
        selected: false,
        location: "/dashboard/products",
      },
    },
  },
  employee: {
    title: "Employees",
    selected: true,
    openPage: true,
    icon: "fa-users",
    subMenu: {
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
      // view_shift: {
      //   title: "Shift",
      //   permission: "view_shift",
      //   selected: false,
      //   location: "/shift",
      // },
      // view_family: {
      //   title: "Family",
      //   permission: "view_family",
      //   selected: false,
      //   location: "/family",
      // },
      // // view_adhaar: {
      // //     title: "View Adhaar",
      // //     selected: false,
      // //     location: "/adhaar",
      // // },
      // view_documents: {
      //   title: "Document",
      //   permission: "view_documents",
      //   selected: false,
      //   location: "/document",
      // },
      // view_withoutAdhaar: {
      //   title: "Without Adhaar",
      //   permission: "view_without_adhaar",
      //   selected: false,
      //   location: "/without-adhaar",
      // },
      // view_bank: {
      //   title: "Without Bank Details",
      //   permission: "view_banks",
      //   selected: false,
      //   location: "/bank",
      // },
      // view_salary: {
      //   title: "Salary Advance",
      //   permission: "view_salary_advance",
      //   selected: false,
      //   location: "/salary",
      // },
      // view_resignation: {
      //   title: "Resignation",
      //   permission: "view_resignation",
      //   selected: false,
      //   location: "/resignation",
      // },
      // view_storebudget: {
      //   title: "Employee Count",
      //   permission: "view_store_budget",
      //   selected: false,
      //   location: "/store-budget",
      // },
      // view_whatsapporder: {
      //   title: "Whatsapp Orders",
      //   permission: "view_whatsapp_order",
      //   selected: false,
      //   location: "/whatsapp",
      // },
    },
  },
  master: {
    title: "Master",
    selected: false,
    openPage: false,
    icon: "fa-list-alt",
    subMenu: {
      view_master_list: {
        title: "Master List",
        permission: "view_master_list",
        selected: false,
        location: "/master",
      },
      view_product_distributors: {
        title: "Product Distributors",
        permission: "view_product_distributors",
        selected: false,
        location: "/master/distributors",
      },
    },
  },
  materials: {
    title: "Materials",
    selected: false,
    openPage: false,
    icon: "fa-boxes", // Changed to a more relevant icon for materials
    subMenu: {
      view_materials: {
        title: "All Materials",
        permission: "view_materials",
        selected: false,
        location: "/materials",
      },
      view_materials_category: {
        title: "Materials Category",
        permission: "view_materials_category",
        selected: false,
        location: "/materials/category",
      },
      view_materials_request: {
        title: "Materials Request",
        permission: "view_materials_request",
        selected: false,
        location: "/materials/request",
      },
    },
  },
  purchase_order: {
    title: "Purchase Order",
    selected: false,
    openPage: false,
    icon: "fa-credit-card", // Changed to a more relevant icon for materials
    subMenu: {
      view_purchase: {
        title: "View Purchase Order",
        permission: "view_purchase_order",
        selected: false,
        location: "/purchase-order",
      },
      add_purchase: {
        title: "Add Purchase Order",
        permission: "add_purchase_order",
        selected: false,
        location: "/purchase-order/create",
      },
    },
  },
  invoice: {
    title: "Invoice",
    selected: false,
    openPage: false,
    icon: "fa-file-invoice", // Changed to a more relevant icon for materials
    subMenu: {
      view_invoice: {
        title: "View Invoice",
        permission: "view_invoice",
        selected: false,
        location: "/invoice",
      },
      add_invoice: {
        title: "Add Invoice",
        permission: "add_invoice",
        selected: false,
        location: "/invoice/create",
      },
    },
  },
  items: {
    title: "Items",
    selected: false,
    openPage: false,
    icon: "fa-shopping-basket", // Changed to a more relevant icon for materials
    subMenu: {
      view_items: {
        title: "Repack Items Master",
        permission: "view_items",
        selected: false,
        location: "/items",
      },
    },
  },
  cleaning: {
    title: "Cleaning and Packing",
    selected: false,
    openPage: false,
    icon: "fa-boxes-packing", // Changed to a more relevant icon for materials
    subMenu: {
      view_cleaning: {
        title: "View List",
        permission: "view_cleaning_packing",
        selected: false,
        location: "/cleaning-packing",
      },
    },
  },
  eb_consumption: {
    title: "EB Consumption",
    selected: false,
    openPage: false,
    icon: "fa-bolt",
    subMenu: {
      view_cleaning: {
        title: "View List",
        permission: "view_eb_consumption",
        selected: false,
        location: "/eb-consumption",
      },
      add_eb_consumption: {
        title: "Add EB Consumption",
        permission: "add_eb_consumption",
        selected: false,
        location: "/eb-consumption/create",
      },
      view_eb_machine_master: {
        title: "EB Machine Master",
        permission: "view_eb_machine_master",
        selected: false,
        location: "/eb-consumption/master",
      },
    },
  },
  lr_workflow: {
    title: "LR Workflow",
    selected: false,
    openPage: false,
    icon: "fa-truck",
    subMenu: {
      view_advance_request: {
        title: "Advance Requests",
        permission: "view_advance_request",
        selected: false,
        location: "/lr-workflow/advance-request",
      },
      create_advance_request: {
        title: "Create Advance Request",
        permission: "create_advance_request",
        selected: false,
        location: "/lr-workflow/advance-request/create",
      },
    },
  },
  accounts: {
    title: "Accounts",
    selected: false,
    openPage: false,
    icon: "fa-ticket",
    aboveLine: true,
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
    icon: "fa-dollar-sign",
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
      view_job_worksheet: {
        title: "Job Worksheet",
        permission: "view_job_worksheet",
        selected: false,
        location: "/purchase/job-worksheet",
      },
      view_sticker_types: {
        title: "Sticker Types",
        permission: "view_sticker_types",
        selected: false,
        location: "/purchase/sticker-types",
      },
      view_purchase_return: {
        title: "Purchase Return",
        permission: "view_purchase_return",
        selected: false,
        location: "/purchase/purchase-return",
      },
    },
  },
  debit_note: {
    title: "Debit Note",
    selected: false,
    openPage: false,
    belowLine: true,
    icon: "fa-money-bill-alt",
    subMenu: {
      view_purchase_order: {
        title: "All Debit Notes",
        permission: "view_debit_note",
        selected: false,
        location: "/debit-note",
      },
      view_debit_note_difference: {
        title: "Difference",
        permission: "view_debit_note_difference",
        selected: false,
        location: "/debit-note/difference",
      },
    },
  },
  // miscellaneous: {
  //   title: "Miscellaneous",
  //   selected: false,
  //   openPage: false,
  //   icon: "fa-book",
  //   subMenu: {
  //     qr_generator: {
  //       title: "QR Generator",
  //       permission: "view_qr_generator",
  //       selected: false,
  //       location: "/qr-generator",
  //     },
  //   },
  // },
  products: {
    title: "Products",
    selected: false,
    openPage: false,
    icon: "fa-archive",
    subMenu: {
      view_products: {
        title: "All Products",
        permission: "view_products",
        selected: false,
        location: "/products",
      },
      view_products_report: {
        title: "Product Image Report",
        permission: "view_products",
        selected: false,
        location: "/products/report",
      },
      // view_departments: {
      //   title: 'View Deapartments',
      //   selected: false,
      //   location: '/department'
      // },
      // view_category: {
      //   title: "Category",
      //   permission: "view_category",
      //   selected: false,
      //   location: "/categories",
      // },
      // view_subcategory: {
      //   title: "Subcategory",
      //   permission: "view_subcategory",
      //   selected: false,
      //   location: "/subcategories",
      // },
      // view_brands: {
      //   title: "Brand",
      //   permission: "view_brands",
      //   selected: false,
      //   location: "/brands",
      // },
      // view_product_department: {
      //   title: "Product Department",
      //   permission: "view_product_department",
      //   selected: false,
      //   location: "/product-department",
      // },
    },
  },
  // indents: {
  //   title: "Indents & Transportations",
  //   selected: false,
  //   openPage: false,
  //   icon: "fa-truck",
  //   subMenu: {
  //     new_indent: {
  //       title: "New Indent",
  //       permission: "view_indents",
  //       selected: false,
  //       location: "/indent",
  //     },
  //     indents_sent: {
  //       title: "Indents Sent",
  //       permission: "sent_indents",
  //       selected: false,
  //       location: "/indent/indent-sent",
  //     },
  //     indents_received: {
  //       title: "Indents Received",
  //       permission: "received_indents",
  //       selected: false,
  //       location: "/indent/indent-received",
  //     },
  //     create_despatch: {
  //       title: "Create Despatch",
  //       permission: "add_dispatch",
  //       selected: false,
  //       location: "/indent/despatch",
  //     },
  //     accept_indents: {
  //       title: "Accept Indents",
  //       permission: "accept_indents",
  //       selected: false,
  //       location: "/indent/acceptIndent",
  //     },
  //     issue_received_indent: {
  //       title: "Issues In Received Indents",
  //       permission: "view_issues_received_indents",
  //       selected: false,
  //       location: "/indent/issue-received",
  //     },
  //     issue_sent_indent: {
  //       title: "Issues In Sent Indents",
  //       permission: "view_issues_sent_indents",
  //       selected: false,
  //       location: "/indent/issue-sent",
  //     },
  //     vehicle: {
  //       title: "Vehicle",
  //       permission: "view_vehicle",
  //       selected: false,
  //       location: "/vehicle",
  //     },
  //   },
  // },
  tickets: {
    title: "Tickets",
    selected: false,
    openPage: false,
    icon: "fa-ticket",
    subMenu: {
      open_issue: {
        title: "View All",
        permission: "view_tickets",
        selected: false,
        location: "/tickets",
      },
      my_tickets: {
        title: "My Tickets",
        permission: "view_my_tickets",
        selected: false,
        location: "/tickets/my-tickets",
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
  misc: {
    title: "Miscellaneous",
    selected: false,
    openPage: false,
    icon: "fa-book",
    subMenu: {
      price_checker: {
        title: "Price Checker",
        permission: "view_price_checker",
        selected: false,
        location: "/price-checker",
      },
    },
  },
};
