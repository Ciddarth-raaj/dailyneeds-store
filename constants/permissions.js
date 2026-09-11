export const PERMISSIONS = {
  // Dashboard
  dashboard: {
    dashboard: "View Dashboard",
    view_purchase_return_dashboard: "View Purchase Return Dashboard",
    view_stock_dashboard: "View Stock Dashboard",
    view_stock_holding_dashboard: "View Stock Holding Dashboard",
  },

  // Employees
  //
  // EMPLOYEE MASTER. The five keys after `view_employees` are the ones the
  // backend has enforced since Stage 0C / C2 — `routes/employee_master.js`
  // gates every lifecycle route on them and the C2 migration declared them in
  // `all_permissions` — but they were never listed here, and this file is the
  // ONLY source the Designation screen builds its checkboxes from
  // (`util/permissionCatalog.js`). So the keys existed, the enforcement
  // existed, and there was no way to grant them: a Store Manager who needed to
  // correct a phone number could only be given `add_employees`, which carries
  // the whole HR surface with it. Nothing is renamed or invented here; the
  // keys are exactly the ones the routes already require.
  //
  // They are FOUR SEPARATE DECISIONS on purpose, so one can be granted without
  // the others:
  //
  //   view_employees           open and read employee profiles
  //   employee_create          create a new employee
  //   employee_edit            edit the permitted employee master fields
  //   employee_resign/_rejoin  move somebody's employment status
  //
  // `employee_edit` DOES NOT CARRY SALARY, BANK, AADHAAR, PAN, UAN, PF OR ESI.
  // Those are B3 sensitive fields on a different write path entirely
  // (`view_employee_sensitive` / `edit_employee_sensitive`, plus
  // `add_employees` on the route), and `middlewares/sensitive.js` refuses a
  // body that so much as mentions one of them. Granting Edit Employee to a
  // manager therefore cannot reach payroll data.
  //
  // Resign and Rejoin stay two keys rather than being fused into one "change
  // status" key, because that is what the backend enforces and what the audit
  // trail records. They are labelled as the pair they are so the intent is
  // legible on the Designation screen.
  employee: {
    view_employees: "View Employees",
    employee_create: "Add Employee",
    employee_edit: "Edit Employee",
    employee_resign: "Change Employee Status — Resign",
    employee_rejoin: "Change Employee Status — Rejoin",
    // Service history, and the Aadhaar / bank VERIFICATION STATUS panels on
    // the profile - not the values, which stay behind the sensitive keys.
    // Listed because the profile's lifecycle, Aadhaar-status and bank-status
    // reads are all gated on it, so without it an administrator has no way to
    // give a manager the complete profile view.
    view_employee_lifecycle: "View Employee Lifecycle & Verification Status",
    view_department: "View Departments",
    view_designation: "View Designation",
    // view_shift: "View Shifts",
    // add_shifts: "Add Shifts",
    // view_family: "View Family",
    // add_family: "Add Family",
    // view_salary_advance: "View Salary Advance",
    // add_salary_advance: "Add Salary Advance",
    // view_resignation: "View Resignation",
    // add_resignation: "View Resignation",
    // view_without_adhaar: "View Without Adhaar",
    // view_documents: "View Documents",
    // view_banks: "View Banks",
    // add_banks: "Add Banks",
    // view_store_budget: "View Store Budget",
    // add_store_budger: "Add Store Budget",
    // view_whatsapp_order: "View Whatsapp Order",
  },

  // Shifts — the Work Shift system (the new payroll/attendance shift master
  // and the employee -> shift mapping), NOT the legacy `shift_master` behind
  // /shift, whose `view_shift` / `add_shifts` stay commented out above.
  //
  // Approved access is HR and administrators. Administrators need no grant -
  // the backend bypasses the permission table for them - and the migration
  // grants these five to HR Executive and to nobody else. They are listed
  // here so an administrator can grant them to another designation
  // deliberately, on this screen, rather than by inheriting a key that
  // happened to be lying around.
  //
  // Assigning one employee and bulk-assigning many are separate keys because
  // they are separate decisions: correcting one person's roster is an
  // everyday fix, re-rostering four hundred people in a click is not.
  //
  // The Employee Profile's Current Shift is READ-ONLY and appears here only
  // through `view_shift_assignments`; the shift is changed on Employee Shift
  // Assignment and nowhere else.
  shifts: {
    view_work_shifts: "View Work Shifts",
    manage_work_shifts: "Manage Work Shifts",
    view_shift_assignments: "View Shift Assignments",
    assign_employee_shift: "Assign Employee Shift",
    bulk_assign_employee_shift: "Bulk Assign Employee Shift",
  },

  // Attendance - Part 1, the raw Biomax punch flow. Granted by the migration
  // to HR Executive (the three read keys) and to nobody else; device
  // management is administrators only at go-live and re-derivation gates no
  // screen yet. Listed so an administrator can grant them deliberately.
  //
  // Punch Audit has its own key: reading attendance is not the same decision
  // as seeing which terminal and IP every punch came from.
  attendance: {
    view_raw_attendance: "View Attendance List",
    export_raw_attendance: "Export Attendance List",
    view_attendance_punch_audit: "View Attendance Punch Audit",
    view_biomax_devices: "View Biomax Devices",
    manage_biomax_devices: "Manage Biomax Devices",
    rederive_attendance: "Re-derive Attendance Dates (reserved)",
  },

  // Master
  master: {
    view_branch: "View Branches",
    manage_ip_restrictions: "Manage IP Restrictions",
    view_master_list: "View Master List",
    view_product_distributors: "View Product Distributors",
    add_product_distributor: "Assign Product Distributor Buyer",
    view_remarks_master: "View Remarks Master",
    add_remarks_master: "Add Remarks Master",
  },

  // Materials
  materials: {
    view_materials: "View Materials",
    add_materials: "Add Materials",
    view_materials_category: "View Materials Category",
    add_materials_category: "Add Materials Category",
    view_materials_request: "View Materials Request",
    add_materials_request: "Add Materials Request",
    view_sticker_types: "View Sticker Types",
    add_sticker_types: "Add Sticker Types",
  },

  // Purchase Order
  purchase_order: {
    // view_purchase_order: "View Purchase Order",
    // add_purchase_order: "Add Purchase Order",
  },

  // Invoice
  invoice: {
    view_invoice: "View Invoices",
    add_invoice: "Add Invoices",
  },

  // Items
  items: {
    view_items: "View Items",
  },

  // Cleaning and Packing
  cleaning: {
    view_cleaning_packing: "View Cleaning and Packing",
  },

  // EB Consumption
  eb_consumption: {
    view_eb_consumption: "View EB Consumption",
    add_eb_consumption: "Add EB Consumption",
    view_eb_machine_master: "View EB Machine Master",
    add_eb_machine_master: "Add EB Machine Master",
  },

  // Advance Request
  advance_request: {
    view_advance_request: "View Advance Request",
    create_advance_request: "Create Advance Request",
    view_old_balance_check: "View Old Balance Check",
    approve_advance_request: "Approve Advance Request",
    pay_advance_request: "Pay Advance Request",
    edit_advance_request: "Edit Advance Request",
  },

  // Accounts
  accounts: {
    view_account_sheet: "View Account Sheet",
    add_account_sheet: "Add Account Sheet",
    save_account_sheet: "Save Account Sheet",
    unsave_account_sheet: "Unsave Account Sheet",
    view_purchases: "View Purchases",
    view_purchases_difference: "View Purchases Difference",
  },

  // Reconciliation
  reconcilation: {
    view_sales_reconciliation: "View Sales Reconciliation",
    view_payment_receipts_reconciliation:
      "View Payment Receipts Reconciliation",
    view_reconciliation_difference: "View Reconciliation Difference",
    view_digital_payments: "View Digital Payments",
    view_epayment_reconciliation: "View E-Payment Reconciliation",
  },

  // Purchase
  purchase: {
    view_job_worksheet: "View Job Worksheet",
    add_job_worksheet: "Add Job Worksheet",
    view_purchase_return: "View Purchase Return",
    add_purchase_return: "Add Purchase Return Extra",
    update_purchase_return_status: "Update Purchase Return Status",
    view_purchase_acknowledgement: "View Purchase Acknowledgement",
    add_purchase_acknowledgement: "Add Purchase Acknowledgement",
  },

  // Debit Note
  debit_note: {
    view_debit_note: "View Debit Notes",
    view_debit_note_difference: "View Debit Notes Difference",
  },

  // Products
  Products: {
    view_products: "View Products",
    edit_products: "Edit Products",
    view_hq_offers: "View HQ Offers (V2)",
    view_offers_v3: "View Offers V3",
    add_offers_v3: "Add Offers V3",
    view_offers_v3_talker_proofs: "View Talker Board",
    add_offers_v3_talker_proofs: "Photograph Talkers",
    verify_offers_v3_talker_proofs: "Review Talker Problems",
    manage_offers_v3_talker_groups: "Create & Manage Talkers",
    print_offers_v3_talkers: "Print Talkers (Outlet)",
    view_category: "View Category",
    view_subcategory: "View Sub Category",
    // view_brands: "View Brands",
    // add_brands: "Add Brands",
    // view_product_department: "View Product Department",
  },

  // Indents & Transportations
  indents: {
    // view_indents: "View Indents",
    // received_indents: "Received Indents",
    // sent_indents: "Sent Indents",
    // accept_indents: "Accept Indents",
    // add_dispatch: "Add Dispatch",
    // accept_dispatch: "Accept Dispatch",
    // view_issues_received_indents: "View Issues in Received Indents",
    // view_issues_sent_indents: "View Sent in Received Indents",
    // view_vehicle: "View Vehicle",
  },

  // Tickets
  tickets: {
    view_tickets: "View All Tickets",
    view_my_tickets: "View User's Tickets",
    add_tickets: "Add Tickets",
    view_tasks: "View All Tasks",
    add_tasks: "Add Tasks",
    edit_tickets: "Edit Any Ticket or Task",
    delete_tickets: "Delete Tickets and Tasks",
    manage_recurring_tasks: "Manage Recurring Tasks",
    // add_open_issues: "Add Open Issues",
    // view_all_issues: "View All Issues",
    // add_issue: "Add Issue",
  },

  // Pick & Pack
  pick_pack: {
    view_pick_pack_remarks: "View Pick & Pack Remarks",
    add_pick_pack_remarks: "Add Pick & Pack Remarks",
    view_pick_pack_write_off: "View Pick & Pack Write Off",
    add_pick_pack_write_off: "Add Pick & Pack Write Off",
    view_pick_pack_verification_remarks: "View Pick & Pack Verification Remarks",
    add_pick_pack_verification_remarks: "Add Pick & Pack Verification Remarks",
    view_pick_pack_verifications: "View Pick & Pack Verifications",
    add_pick_pack_verifications: "Add Pick & Pack Verifications",
  },

  // Stock Checker
  stock_checker: {
    view_stock_checker: "View Stock Checker",
    add_stock_checker: "Add Stock Checker",
    view_assigned_products: "View Assigned Products",
  },

  // Expiry Checker
  expiry_checker: {
    view_expiry_checker: "View Expiry Checker",
    add_expiry_checker: "Add Expiry Checker",
    add_expiry_checker: "View Expiry Assigned Products",
  },

  // Uploads
  uploads: {
    view_stock_holding_report: "View Stock Holding Report",
    add_stock_holding_report: "Add Stock Holding Report",
    delete_stock_holding_report: "Delete Stock Holding Report",
  },

  // GRN
  grn: {
    view_all_grn: "View All GRN",
    view_purchase_uom: "View Purchase UOM",
    view_issue_grn: "View Issue GRN",
    ignore_grn_issues: "Ignore GRN Issues",
  },

  // Purchase Ref
  purchase_ref: {
    view_purchase_ref: "View Purchase Ref",
  },

  // GST (group order matches GST module menu: Vendors → Tools → Configs)
  gst: {
    gst_vendors: {
      view_gst_vendors: "View GST Vendors",
      view_gst_filing_dates: "View GST Filing Dates",
      view_tally_purchases: "View Tally Purchases",
      delete_tally_purchases: "Delete Tally Purchases",
    },
    gst_tools: {
      view_gst_gstr2a_purchase_register: "View GSTR 2A v Purchase Register",
      sync_gst_gstr2a_b2b: "Sync GSTR-2A B2B",
    },
    gst_configs: {
      view_gst_portal: "View GST Portal",
    },
  },

  // Misc
  Miscellaneous: {
    all_stores: "Access All Stores",
    allow_product_sync: "Allow Product Sync",
    view_sto: "View STO Comparison",
    add_sto: "Add STO Comparison",
    delete_sto: "Delete STO Comparison",
    view_price_checker: "View Price Checker",
    view_images_download_log: "View Image Download Log",
    view_api_logs: "View API Logs",
  },
};
