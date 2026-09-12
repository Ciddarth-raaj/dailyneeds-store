const ALL_PAGES_MENU = {
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
      view_stock_dashboard: {
        title: "Stock Dashboard",
        permission: "view_stock_dashboard",
        selected: false,
        location: "/dashboard/stock",
      },
      view_stock_holding_dashboard: {
        title: "Stock Holding Dashboard",
        permission: "view_stock_holding_dashboard",
        selected: false,
        location: "/dashboard/stock-holding",
      },
    },
  },
  // Stage 0C / C3. Employees, Department and Designation have MOVED to the HR
  // module (`HR_MENU` below), which is a top-level module on the rail beside
  // WMS and GST. There is one employee master now, at /hr/employees, and the
  // old top-level Employees section is gone rather than left beside it - two
  // employee lists in the navigation is how two employee masters begin.
  //
  // /employee still resolves: it redirects to /hr/employees, so a bookmark or
  // a pasted link keeps working. The commented-out HR entries that used to sit
  // here (Shift, Family, Documents, Salary Advance, Resignation, ...) were
  // already switched off before C3 and were removed with the section; they are
  // in git history if any of them is revived.
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
      view_remarks_master: {
        title: "Remarks",
        permission: "view_remarks_master",
        selected: false,
        location: "/master/remarks",
      },
      branch_and_restrictions: {
        title: "Branch and Restrictions",
        subMenu: {
          view_branch: {
            title: "Branches",
            permission: "view_branch",
            selected: false,
            location: "/master/branch",
          },
          manage_ip_restrictions: {
            title: "IP Restrictions",
            permission: "manage_ip_restrictions",
            selected: false,
            location: "/master/ip-restrictions",
          },
        },
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
      view_sticker_types: {
        title: "Sticker Types",
        permission: "view_sticker_types",
        selected: false,
        location: "/purchase/sticker-types",
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
  advance_request: {
    title: "Advance Request",
    selected: false,
    openPage: false,
    icon: "fa-truck",
    subMenu: {
      view_advance_request: {
        title: "All Requests",
        permission: "view_advance_request",
        selected: false,
        location: "/advance-request",
      },
      create_advance_request: {
        title: "Create Request",
        permission: "create_advance_request",
        selected: false,
        location: "/advance-request/create",
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
      view_job_worksheet: {
        title: "Job Worksheet",
        permission: "view_job_worksheet",
        selected: false,
        location: "/purchase/job-worksheet",
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
    title: "Tickets & Tasks",
    selected: false,
    openPage: false,
    icon: "fa-ticket",
    subMenu: {
      my_work: {
        title: "My Work",
        permission: "view_my_tickets",
        selected: false,
        location: "/my-work",
      },
      open_issue: {
        title: "All Tickets",
        permission: "view_tickets",
        selected: false,
        location: "/tickets",
      },
      tasks: {
        title: "All Tasks",
        permission: "view_tasks",
        selected: false,
        location: "/tasks",
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
      api_logs: {
        title: "API Logs",
        permission: "view_api_logs",
        selected: false,
        location: "/misc/api-logs",
      },
      stock_checker: {
        title: "Stock Checker",
        subMenu: {
          view_stock_checker: {
            title: "View All",
            permission: "view_stock_checker",
            selected: false,
            location: "/stock-checker",
          },
          view_assigned_products: {
            title: "Assigned Products",
            permission: "view_assigned_products",
            selected: false,
            location: "/stock-checker/assigned-products",
          },
        },
      },
      expiry_checker: {
        title: "Expiry Checker",
        subMenu: {
          view_expiry_checker: {
            title: "View All",
            permission: "view_expiry_checker",
            selected: false,
            location: "/products/expiry-checker",
          },
          view_expiry_assigned_products: {
            title: "Assigned Products",
            permission: "view_expiry_assigned_products",
            selected: false,
            location: "/products/expiry-checker/assigned-products",
          },
        },
      },
    },
  },
};

/** Menu tree for the WMS module (module rail → WMS). */
const WMS_MENU = {
  dashboard: {
    title: "Dashboard",
    selected: false,
    openPage: false,
    icon: "fa-pie-chart",
    subMenu: {
      view_purchase_return_dashboard: {
        title: "Purchase Return Dashboard",
        permission: "view_purchase_return_dashboard",
        selected: false,
        location: "/dashboard/purchase-return",
      },
    },
  },
  master: {
    title: "Master",
    selected: false,
    openPage: false,
    icon: "fa-list-alt",
    subMenu: {
      view_product_distributors: {
        title: "Product Distributors",
        permission: "view_product_distributors",
        selected: false,
        location: "/master/distributors",
      },
      view_products: {
        title: "All Products",
        permission: "view_products",
        selected: false,
        location: "/products",
      },
      view_items: {
        title: "Repack Items Master",
        permission: "view_items",
        selected: false,
        location: "/items",
      },
      view_products_report: {
        title: "Product Image Report",
        permission: "view_products",
        selected: false,
        location: "/products/report",
      },
      images_download_log: {
        title: "Image Download Log",
        permission: "view_images_download_log",
        selected: false,
        location: "/products/image-download-log",
      },
      view_products_dashboard: {
        title: "Products Dashboard",
        permission: "view_products_dashboard",
        selected: false,
        location: "/dashboard/products",
      },
    },
  },
  grn: {
    title: "GRN",
    selected: false,
    openPage: false,
    icon: "fa-truck-loading",
    subMenu: {
      view_all_grn: {
        title: "All GRN",
        permission: "view_all_grn",
        selected: false,
        location: "/grn",
      },
      view_purchase_uom: {
        title: "Purchase UOM",
        permission: "view_purchase_uom",
        selected: false,
        location: "/grn/purchase-uom",
      },
      view_issue_grn: {
        title: "Issue GRN",
        permission: "view_issue_grn",
        selected: false,
        location: "/grn/issue",
      },
    },
  },
  purchase: {
    title: "Purchase",
    selected: false,
    openPage: false,
    icon: "fa-dollar-sign",
    subMenu: {
      view_purchase_acknowledgement: {
        title: "Purchase Acknowledgement",
        permission: "view_purchase_acknowledgement",
        selected: false,
        location: "/purchase/purchase-acknowledgement",
      },
    },
  },
  purchase_ref: {
    title: "Purchase Ref",
    selected: false,
    openPage: false,
    icon: "fa-file-invoice",
    subMenu: {
      view_purchase_ref: {
        title: "Purchase Ref",
        permission: "view_purchase_ref",
        selected: false,
        location: "/purchase-ref",
      },
    },
  },
  uploads: {
    title: "Uploads",
    selected: false,
    openPage: false,
    icon: "fa-upload",
    subMenu: {
      view_stock_holding_report: {
        title: "Stock Holding Report",
        permission: "view_stock_holding_report",
        selected: false,
        location: "/uploads/stock-holding-report",
      },
    },
  },
  pick_and_pack: {
    title: "Pick and Pack",
    selected: false,
    openPage: false,
    icon: "fa-boxes-packing",
    subMenu: {
      sto_comparison: {
        title: "STO Comparison",
        permission: "view_sto",
        selected: false,
        location: "/sto",
      },
      price_checker: {
        title: "Price Checker",
        permission: "view_price_checker",
        selected: false,
        location: "/price-checker",
      },
      view_pick_pack_remarks: {
        title: "Remarks Master",
        permission: "view_pick_pack_remarks",
        selected: false,
        location: "/pick-pack/remarks",
      },
      view_pick_pack_write_off: {
        title: "Write Off",
        permission: "view_pick_pack_write_off",
        selected: false,
        location: "/pick-pack/write-off",
      },
      view_pick_pack_write_off_list: {
        title: "Write Off List",
        permission: "view_pick_pack_write_off",
        selected: false,
        location: "/pick-pack/write-off-list",
      },
    },
  },
  verification: {
    title: "Verification",
    selected: false,
    openPage: false,
    icon: "fa-clipboard-check",
    subMenu: {
      view_pick_pack_verification_remarks: {
        title: "Verification Master",
        permission: "view_pick_pack_verification_remarks",
        selected: false,
        location: "/pick-pack/verification/remarks",
      },
      view_pick_pack_verifications: {
        title: "Verification",
        permission: "view_pick_pack_verifications",
        selected: false,
        location: "/pick-pack/verification",
      },
      view_pick_pack_verifications_list: {
        title: "Verification List",
        permission: "view_pick_pack_verifications",
        selected: false,
        location: "/pick-pack/verification-list",
      },
    },
  },
  offer: {
    title: "Offer",
    selected: false,
    openPage: false,
    icon: "fa-tags",
    subMenu: {
      view_offers_v2: {
        title: "Offers V2",
        permission: "view_hq_offers",
        selected: false,
        location: "/offers-v2",
      },
      view_offers_v3: {
        title: "Offers V3",
        permission: "view_offers_v3",
        selected: false,
        location: "/offers-v3",
      },
      view_talker_capture: {
        title: "Talker Check",
        permission: "add_offers_v3_talker_proofs",
        selected: false,
        location: "/offers-v3/talker-capture",
      },
      view_talker_board: {
        title: "Talker Board",
        permission: "view_offers_v3_talker_proofs",
        selected: false,
        location: "/offers-v3/talker-board",
      },
      view_talker_groups: {
        title: "Talkers",
        permission: "manage_offers_v3_talker_groups",
        selected: false,
        location: "/offers-v3/talker-groups",
      },
      view_talker_print: {
        // Outlets print; HQ creates. This is the one talker page an outlet
        // needs, so it hangs off its own permission.
        title: "Print Talkers",
        permission: "print_offers_v3_talkers",
        selected: false,
        location: "/offers-v3/talker-print",
      },
    },
  },
  cleaning: {
    title: "Cleaning and Packing",
    selected: false,
    openPage: false,
    icon: "fa-boxes-packing",
    subMenu: {
      view_cleaning: {
        title: "View List",
        permission: "view_cleaning_packing",
        selected: false,
        location: "/cleaning-packing",
      },
    },
  },
};

/** Menu tree for the GST module (module rail → GST). */
const GST_MENU = {
  gst_vendors: {
    title: "Vendors",
    selected: false,
    openPage: false,
    icon: "fa-address-book",
    subMenu: {
      view_all: {
        title: "View All",
        permission: "view_gst_vendors",
        selected: false,
        location: "/gst/vendors",
      },
      filing_dates: {
        title: "Filing Dates",
        permission: "view_gst_filing_dates",
        selected: false,
        location: "/gst/filing-dates",
      },
      view_tally_purchases: {
        title: "All Tally Purchases",
        permission: "view_tally_purchases",
        selected: false,
        location: "/purchase/tally",
      },
    },
  },
  gst_tools: {
    title: "Tools",
    selected: false,
    openPage: false,
    icon: "fa-wrench",
    subMenu: {
      gstr_2a_purchase_register: {
        title: "GSTR 2A v Purchase Register",
        permission: "view_gst_gstr2a_purchase_register",
        selected: false,
        location: "/gst/tools/gstr-2a-purchase-register",
      },
    },
  },
  gst_configs: {
    title: "Configs",
    selected: false,
    openPage: false,
    icon: "fa-sliders",
    subMenu: {
      gst_portal: {
        title: "GST Portal",
        permission: "view_gst_portal",
        selected: false,
        location: "/gst/portal",
      },
    },
  },
};

/**
 * Stage 0C / C3 — HR, the single top-level module for everything about the
 * people who work here: who they are, when they worked, and (later) what they
 * are paid for it.
 *
 *   Employee Master   who works here, and everything true of them
 *   Shifts            the roster they are expected to keep
 *   Attendance        when they worked (Part 1: the raw Biomax punch flow)
 *   Payroll           what they are paid for it. M4: Salary Revision &
 *                     History, and Salary Approval. A SECTION here, never a
 *                     module of its own - and it waited until it had screens,
 *                     because an empty section is a promise the navigation
 *                     cannot keep.
 *
 * Attendance used to be a module beside HR on the rail. It is a section of HR
 * now so that employee, attendance and payroll screens are found in one
 * place. Its routes and permissions did not move: /attendance/list,
 * /attendance/list?tab=audit and /attendance/devices, each behind the same
 * key as before.
 *
 * Employees, Department and Designation moved here from the old top-level
 * Employees section, which is gone. `/employee` redirects to `/hr/employees`,
 * so existing links and bookmarks still resolve.
 */
const HR_MENU = {
  employee_master: {
    title: "Employee Master",
    selected: true,
    openPage: true,
    icon: "fa-users",
    subMenu: {
      view_employees: {
        title: "Employees",
        permission: "view_employees",
        selected: false,
        location: "/hr/employees",
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
    },
  },
  // The new payroll/attendance shift master, on `work_shift`. Gated on the
  // Work Shift system's OWN keys, which the backend's /work-shift and
  // /hr/work-shift-assignments routes require.
  //
  // These entries used to say `view_shift`, borrowed from the legacy shift
  // master. That key is granted to designations with no payroll role at all,
  // so it put the roster on the rail of people who were never meant to see
  // it. `view_work_shifts` and `view_shift_assignments` are granted to HR and
  // to administrators, and to nobody else.
  //
  // The legacy /shift screen is untouched and stays unlisted, exactly as it
  // has been since C3. Two shift masters in the navigation would put the
  // choice of which one to edit in front of people who have no way to make it.
  shifts: {
    title: "Shifts",
    selected: false,
    openPage: true,
    icon: "fa-clock",
    subMenu: {
      view_work_shift: {
        title: "Work Shift Master",
        permission: "view_work_shifts",
        selected: false,
        location: "/work-shift",
      },
      // Where employees are put ONTO those shifts. Two keys, and an array
      // means ALL of them (see util/menuPermissions.js), matching the
      // `requireAll(view_employees, view_shift_assignments)` the backend's
      // read endpoint uses - the screen joins the employee master to the
      // shift master, so showing it to somebody holding only one key would
      // put an entry on their rail that 403s the moment they open it.
      employee_shift_assignment: {
        title: "Employee Shift Assignment",
        permission: ["view_employees", "view_shift_assignments"],
        selected: false,
        location: "/employee-shift-assignment",
      },
    },
  },
  // Attendance - Part 1, the raw Biomax punch flow. Same three screens, same
  // routes and same permission keys as when this was a module of its own.
  //
  //   Attendance List   one row per employee per attendance date, every punch
  //                     of the day merged whichever terminal recorded it.
  //                     Filtered by HOME outlet, never by device.
  //   Punch Audit       one row per physical punch, filtered by device / punch
  //                     location. Its own permission (D7), because seeing
  //                     which terminal and IP every punch came from is a
  //                     different decision from reading attendance.
  //   Biomax Devices    the terminal registry with effective-dated locations.
  //                     Administrators only at go-live: the backend grants
  //                     `view_biomax_devices` / `manage_biomax_devices` to no
  //                     designation, and administrators bypass the table.
  //
  // Nothing here calculates attendance. IN/OUT, hours, lateness, OT, status
  // and payroll are Part 2 and have no entry until they have screens.
  attendance: {
    title: "Attendance",
    selected: false,
    openPage: true,
    icon: "fa-clock-o",
    subMenu: {
      attendance_list: {
        title: "Attendance List",
        permission: "view_raw_attendance",
        selected: false,
        location: "/attendance/list",
      },
      punch_audit: {
        title: "Punch Audit",
        permission: "view_attendance_punch_audit",
        selected: false,
        location: "/attendance/list?tab=audit",
      },
      biomax_devices: {
        title: "Biomax Devices",
        permission: "view_biomax_devices",
        selected: false,
        location: "/attendance/devices",
      },
      // The permanent DigiSME fallback: an Excel export of the same punches,
      // imported into the same table. Administrators only - the backend
      // grants `manage_attendance_import` to no designation - so this entry
      // is invisible to everyone else, like Biomax Devices beside it.
      import_attendance: {
        title: "Import Attendance",
        permission: "manage_attendance_import",
        selected: false,
        location: "/attendance/imports",
      },
      // Attendance v2, the first calculated screens. My Attendance has NO
      // permission: it is every employee's own month, and the backend takes
      // the employee from the session rather than from the page. Employee
      // Attendance is the HR/Admin view of somebody else's month, behind the
      // key the backend checks on that read.
      my_attendance: {
        title: "My Attendance",
        selected: false,
        location: "/attendance/my",
      },
      employee_attendance: {
        title: "Employee Attendance",
        permission: "view_calculated_attendance",
        selected: false,
        location: "/attendance/calculated",
      },
      // The approval screens share one read key; what each approver sees is
      // their own role's and outlet's, decided on the server. Recalculate is
      // behind the key the backend grants to nobody by migration.
      attendance_approval: {
        title: "Attendance Approval",
        permission: "view_attendance_approvals",
        selected: false,
        location: "/attendance/approval",
      },
      ot_approval: {
        title: "OT Approval",
        permission: "view_attendance_approvals",
        selected: false,
        location: "/attendance/ot-approval",
      },
      recalculate_attendance: {
        title: "Recalculate Attendance",
        permission: "recalculate_attendance",
        selected: false,
        location: "/attendance/recalculate",
      },
    },
  },
  // M4 — Payroll. A SECTION OF HR, never a module of its own, exactly as the
  // note above this tree has said since C3: employee, attendance and payroll
  // screens are found in one place.
  //
  // It is declared NOW because it now has screens. The rule it waited for was
  // "an empty section is a promise the navigation cannot keep" - M2 built the
  // salary engine with no screens at all and M3 built a read-only card on the
  // employee profile, so there was nothing to list. M4 builds the two screens
  // where salary is entered and decided, and they are listed.
  //
  // TWO ENTRIES, AND THEY ARE TWO DECISIONS. Proposing a pay change and
  // agreeing to it are separate permissions on the server and separate screens
  // here; one screen doing both would make `approve_salary_revision`
  // decorative.
  //
  // SEPARATE FROM EMPLOYEE MASTER, which is the approved rule and not a filing
  // preference. The profile's Payroll section stays READ-ONLY and shows the
  // current approved figure; a second place to type a salary is a second
  // salary.
  //
  // BOTH ENTRIES CARRY ARRAYS, WHICH MEAN *ALL* OF THESE KEYS (see
  // util/menuPermissions.js), matching the `requireAll(...)` each backend
  // route uses. An entry shown to somebody holding only one key would put a
  // screen on their rail that 403s the moment they open it.
  //
  // The monthly-payroll keys `process_payroll` and `hr_reports` are
  // deliberately NOT used here: nothing in this section runs a payroll period
  // or produces a report, and gating these screens on a key they do not need
  // would make them ungrantable without handing out one that opens nothing.
  //
  // M5 ADDS A THIRD ENTRY AND STILL NO FOURTH. Bulk Salary Upload is a faster
  // way to raise the proposals the first entry raises one at a time; it is not
  // a payroll run, a payslip, a report or a bank payment, none of which have an
  // entry here because none of them has a screen.
  payroll: {
    title: "Payroll",
    selected: false,
    openPage: true,
    icon: "fa-money",
    subMenu: {
      salary_revision: {
        title: "Salary Revision & History",
        permission: ["view_employees", "view_salary"],
        selected: false,
        location: "/payroll/salary-revision",
      },
      // The approver's worklist: every outstanding pay proposal in the
      // company, which is why it takes the approver's key on top of the two
      // that open the screen beside it.
      salary_approval: {
        title: "Salary Approval",
        permission: ["view_employees", "view_salary", "approve_salary_revision"],
        selected: false,
        location: "/payroll/salary-approval",
      },
      // M5 - Bulk Salary Upload, beside the screen where one salary is typed.
      // It PROPOSES faster and decides nothing: every row it creates lands
      // Pending and is approved or rejected on Salary Approval above.
      //
      // `add_salary` on top of the reading pair, matching the two
      // /hr/salary/bulk endpoints exactly. Not a `bulk_salary_upload` key of
      // its own: uploading a hundred proposals and typing a hundred proposals
      // are the same authority at different speeds, and a second key to grant
      // is the one somebody forgets.
      bulk_salary_upload: {
        title: "Bulk Salary Upload",
        permission: ["view_employees", "view_salary", "add_salary"],
        selected: false,
        location: "/payroll/bulk-salary-upload",
      },
    },
  },
};

/**
 * Reports — a SHARED top-level module, not a section of HR.
 *
 * The reporting machinery is per-dataset and the datasets belong to different
 * modules: Employee Master is HR's, Attendance and Payroll will be their own.
 * Putting the reports inside HR would mean an Attendance report either living
 * under HR - which is not where anyone would look for it - or Reports existing
 * twice. So Reports is a module on the rail beside HR, and each dataset adds an
 * entry to it.
 *
 * Only the Employee Master dataset is built today, so only it is listed. There
 * are deliberately no Attendance or Payroll placeholders: an entry that leads
 * nowhere is a promise the navigation cannot keep.
 *
 * `view_reports` is discovery and preview. It confers no field access of its
 * own - somebody who reaches the screen still sees exactly the columns their
 * existing permissions allow - and exporting is the separate `export_reports`
 * decision.
 */
const REPORTS_MENU = {
  employee_master: {
    title: "Employee Master",
    selected: true,
    openPage: true,
    icon: "fa-file-text-o",
    subMenu: {
      // Two entries, because they are two jobs. Saved Reports is the
      // catalogue - which reports exist - and it renders no employee data at
      // all. Create Report is the builder. The old screen was both at once,
      // plus the results, which is the crowding this splits up.
      //
      // BOTH permissions on each, not either. `view_reports` is a reporting
      // capability; the Employee Master dataset is HR's, and reaching it needs
      // the same key that guards the HR directory. The backend requires
      // exactly this pair with `requireAll`, so showing an entry on
      // `view_reports` alone would put a module on somebody's rail that 403s
      // when they open it.
      saved_reports: {
        title: "Saved Reports",
        permission: ["view_reports", "view_employees"],
        selected: false,
        location: "/reports/employee-master",
      },
      create_report: {
        title: "Create Report",
        permission: ["view_reports", "view_employees"],
        selected: false,
        location: "/reports/employee-master/new",
      },
    },
  },
};

/**
 * Top-level app modules; each has its own sidebar menu tree.
 * `accent` drives module-rail colors and the main menu panel (see sideBar `data-menu-accent`).
 * Rail icon: set `iconClass` (full FA6 classes, e.g. "fa-solid fa-chart-line") or `icon` (legacy suffix, e.g. "fa-users" → "fa fa-users").
 */
export const MENU_MODULES = {
  all: {
    title: "All",
    /** Full FA6 class string, or use `icon` (e.g. "fa-users") with legacy `fa ${icon}` */
    iconClass: "fa-solid fa-layer-group",
    accent: "purple",
    menu: ALL_PAGES_MENU,
  },
  // Stage 0C / C3. Purple, like the rest of the application shell - HR is not
  // a different product, it is where the employee master now lives.
  hr: {
    title: "HR",
    iconClass: "fa-solid fa-users",
    accent: "purple",
    menu: HR_MENU,
  },
  // Reports reads across the modules rather than belonging to one, so it sits
  // beside them on the rail. Purple, like HR and the rest of the application
  // shell: it is the same product looked at a different way, not a separate
  // one.
  reports: {
    title: "Reports",
    iconClass: "fa-solid fa-file-lines",
    accent: "purple",
    menu: REPORTS_MENU,
  },
  wms: {
    title: "WMS",
    iconClass: "fa-solid fa-warehouse",
    accent: "teal",
    menu: WMS_MENU,
  },
  gst: {
    title: "GST",
    iconClass: "fa-solid fa-file-invoice-dollar",
    accent: "blue",
    menu: GST_MENU,
  },
};

export const DEFAULT_MODULE_ID = "all";

export default ALL_PAGES_MENU;
