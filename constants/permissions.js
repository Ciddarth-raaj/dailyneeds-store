export const PERMISSIONS = {
  // Dashboard
  //
  // GLOBAL DASHBOARD ACCESS. Two kinds of right live here and they answer two
  // different questions:
  //
  //   a FEATURE key per dashboard - may this person open that screen
  //   the STORE SCOPE, shared by every dashboard - which branches may they see
  //
  // A feature key permits a screen and never widens a location. Only
  // Attendance is wired to a screen today; the other three are listed so the
  // scope can be configured for them in advance and are inert until their
  // module exists - granting one builds nothing and shows nothing.
  //
  // THE SCOPE IS EXACTLY ONE OF THE TWO. They are rendered as ordinary
  // checkboxes like every other right, but `EXCLUSIVE_PERMISSION_GROUPS` below
  // makes ticking one untick the other, so the confusing both-ticked state
  // cannot be produced here. The server refuses it too, independently: this is
  // the convenience, that is the guarantee.
  dashboard: {
    dashboard: "View Dashboard",
    view_purchase_return_dashboard: "View Purchase Return Dashboard",
    view_stock_dashboard: "View Stock Dashboard",
    view_stock_holding_dashboard: "View Stock Holding Dashboard",
    view_attendance_dashboard: "View Attendance & Staffing Dashboard",
    view_hr_dashboard: "View HR Dashboard (not built yet)",
    view_sales_dashboard: "View Sales Dashboard (not built yet)",
    view_my_dashboard: "View My Dashboard (not built yet)",
    dashboard_scope_own_store: "Dashboard Store Scope: Own Store",
    dashboard_scope_all_stores: "Dashboard Store Scope: All Stores",
  },

  // Employees
  //
  // The Employee Master keys. `view_employees` opens the directory and the
  // profile; the four action keys below are what Stage 0C / C2 split out of
  // the old catch-all `add_employees`, and each gates exactly the route it
  // names (`employee_edit` -> POST /hr/employee/:id/edit, and so on).
  //
  // They existed in `all_permissions` and guarded those routes from the day
  // C2 shipped, but were never listed here - and this file is what the
  // Permission Matrix renders, so there was no way for an administrator to
  // GRANT them. In practice that meant edit access could only be given as
  // `add_employees`, which also confers create and status change. Listing
  // them makes the split usable: a Store Manager can hold View and Edit and
  // nothing else.
  //
  // Reading is separate from editing, and both are separate from the
  // lifecycle actions:
  //
  //   view_employees           the directory and the profile (read)
  //   view_employee_lifecycle  the employment-period history the profile
  //                            reads; granted alongside View so the profile
  //                            opens, read-only, without Edit
  //   employee_edit            the ordinary editor - Personal, Employment,
  //                            Education. NOT salary, bank, Aadhaar, PAN,
  //                            UAN, PF or ESI: those stay behind
  //                            `view_employee_sensitive` /
  //                            `edit_employee_sensitive`, which are
  //                            deliberately absent from this screen, so Edit
  //                            can never become a way to reach them.
  //   employee_create          hire somebody new
  //   employee_resign          record that somebody has left
  //   employee_rejoin          bring a former employee back
  //
  // Resign and Rejoin are the two halves of "change employee status" and stay
  // two keys because they are the two keys the backend already checks.
  employee: {
    view_employees: "View Employees",
    view_employee_lifecycle: "View Employee Employment History",
    // The Aadhaar VERIFICATION STATUS on the employee profile - verified or
    // pending, the last four digits and the verified name. Listed here for
    // the reason the four C2 action keys above it were: the backend has
    // required it since the Aadhaar-status migration, and this file is what
    // the Permission Matrix renders, so without an entry there was no
    // checkbox and the permission could not be granted at all. An
    // administrator ticks it deliberately; nothing grants it automatically.
    //
    // IT IS THE STATUS AND NOTHING ELSE. Not `view_aadhaar_full`, which reads
    // the twelve digits back and is granted to nobody and stays off this
    // screen. Not the employment history beside it - separating the two is
    // exactly why this key exists. Not the sensitive fields, which are
    // deliberately absent here. And it grants no branch: the backend applies
    // this key AND the employee branch scope, so a holder still reads only
    // employees in the branches they are assigned to.
    view_employee_aadhaar: "View Employee Aadhaar Status",
    // VERIFYING the Aadhaar of an employee who ALREADY EXISTS and whose
    // Aadhaar is still PENDING - the OTP flow behind "Verify now" on the
    // employee profile. Its own box, and a deliberately temporary one: it is
    // here so that store managers can clear the old-employee backlog and so
    // that, when the backlog is done, an administrator can take the ability
    // away again by unticking exactly this one thing.
    //
    // IT IS NOT THE BOX ABOVE IT. Reading the badge is not running the check.
    // It is not Edit Employee either, which is still what ATTACHING the
    // verified identity requires - the whole workflow needs the status read,
    // this key, and Edit, which is what `canVerifyExistingAadhaar` asks for
    // before the button is drawn.
    //
    // AND IT REACHES NOTHING ELSE. No sensitive edit, no full Aadhaar number,
    // no employment history, no branch: the backend applies this key AND the
    // employee branch scope, and refuses outright for an employee whose
    // Aadhaar is already VERIFIED, so it can never replace a verified one.
    verify_employee_aadhaar: "Verify Employee Aadhaar",
    employee_edit: "Edit Employee",
    employee_create: "Add Employee",
    employee_resign: "Change Employee Status — Resign",
    employee_rejoin: "Change Employee Status — Rejoin",
    // M1. The two employee-master sections after a store manager's four
    // onboarding stages, each grantable on its own. Both sit on top of the
    // sensitive-edit pair, which stays out of this matrix on purpose.
    edit_payment_details: "Edit Payment Details (Cash / Bank)",
    edit_statutory_details: "Edit Statutory Details (PAN / PF / ESI)",
    // M3 / M4. Seeing salary figures: the Payroll section on the employee
    // profile (read-only, M3) and the Payroll screens where salary is entered
    // and decided (M4).
    //
    // It is listed here for the same reason `employee_edit` was: the backend
    // has checked it since M2, and this file is what the Permission Matrix
    // renders, so without an entry the permission cannot be granted at all and
    // the section would be visible to administrators alone.
    //
    // THE FOUR ACTION KEYS BESIDE IT ARE M4'S, AND THEY ARE LISTED NOW BECAUSE
    // THEIR SCREENS EXIST. M3 deliberately left them off: a key that can be
    // granted before its screen exists grants nothing while being remembered
    // as if it did. Salary Revision & History and Salary Approval are those
    // screens.
    //
    // FOUR KEYS AND NOT ONE, because they are four decisions that are given to
    // four different sets of people:
    //
    //   add_salary                        propose a salary or a revision
    //   edit_salary                       amend a proposal that is still
    //                                     PENDING. Approved and rejected
    //                                     history is immutable and this key
    //                                     does not change that.
    //   manual_salary_component_override  depart from the automatic breakup.
    //                                     Moving Basic moves the PF wage, so
    //                                     it is a statutory change and goes to
    //                                     far fewer people than entering a
    //                                     salary does.
    //   approve_salary_revision           agree to it - the money decision,
    //                                     and also the right to reject.
    //
    // ADD AND APPROVE ARE SEPARATE ON PURPOSE, and granting both to one
    // designation is a decision somebody should have to make deliberately on
    // this screen. Nothing is ever created APPROVED, including by an
    // administrator, and the server refuses an approval of a proposal the same
    // person raised.
    //
    // `process_payroll` and `hr_reports` stay OFF this screen: monthly payroll
    // and payroll reporting are not built, and M4 requires neither.
    view_salary: "View Salary (Employee Master and Payroll screens)",
    add_salary: "Add Salary (propose an opening salary or revision)",
    edit_salary: "Edit Salary (amend a pending proposal)",
    manual_salary_component_override: "Manual Salary Component Override",
    approve_salary_revision: "Approve / Reject Salary Revision",
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
  // Staff Budget - the approved headcount plan on
  // Location -> Department -> Designation -> Shift, and, where a monthly rate
  // is configured, what that plan costs per month.
  //
  // ITS OWN GROUP, NOT PART OF THE EMPLOYEE MODULE. The screen reads four
  // masters and its own table and shows nothing about any individual, so a
  // designation can be given the plan without being given the staff list -
  // and, just as deliberately, granting an employee right never drags the
  // budget along with it.
  //
  // Read and write are separate keys because they are separate decisions: a
  // store or operations lead may need to see the approved headcount for their
  // location without being able to move it. Editing also covers configuring
  // the monthly rates, which is the budget owner's act rather than a third
  // role.
  //
  // Granted by the migration to HR Executive and to nobody else;
  // administrators reach both through the backend's user_type 2 bypass. They
  // are listed here so an administrator can grant them to another designation
  // deliberately, on this screen.
  //
  // NOT the legacy /store-budget screen's `view_store_budget` /
  // `add_store_budger`, which stay commented out on a feature this one
  // supersedes but does not touch.
  staff_budget: {
    view_staff_budget: "View Staff Budget",
    edit_staff_budget: "Edit Staff Budget",
  },

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
    manage_attendance_import: "Import Attendance from DigiSME Excel",
    // Attendance v2. Reading a colleague's calculated month is the HR
    // operational role; changing the shift ONE attendance date is calculated
    // under changes that date's pay, so it is its own key, granted by
    // migration to nobody. Reading your OWN month needs neither.
    view_calculated_attendance: "View Employee Attendance (calculated)",
    // The Missing Attendance Report - the chasing list of completed past
    // dates with an ODD punch count. Two keys, read and export, exactly as
    // the raw Attendance List above has: taking a spreadsheet of every
    // branch's gaps off the premises is a different decision from looking at
    // the screen. Neither is granted by migration.
    view_missing_attendance_report: "View Missing Attendance Report",
    export_missing_attendance_report: "Export Missing Attendance Report",
    view_shift_change_eligibility_report: "View Shift Change Eligibility Report",
    export_shift_change_eligibility_report: "Export Shift Change Eligibility Report",
    // A WRITE key, and deliberately not either of the two above: it permits
    // marking an employee/date not eligible so a shift change request can
    // never be raised for it, and removing that block again. Reading the
    // report and changing somebody's eligibility are different decisions.
    manage_shift_change_eligibility: "Manage Shift Change Eligibility (block/unblock)",
    // The management overview of ONE attendance date across the company is
    // `view_attendance_dashboard`, and it is listed under DASHBOARD rather than
    // here: it is one of four dashboard feature keys that share one store
    // scope, and keeping them together is what makes the scope configurable in
    // one place. It is read-only and grants no approval, edit or recalculation.
    edit_attendance_date_shift: "Edit Shift for a Single Attendance Date",
    // The EFFECTIVE-DATED permanent shift change ("Edit Shift Assignment"):
    // one employee, one new shift, one date it applies from, a reason. It
    // moves the NRM, shortage and overtime of every date from that one
    // onward, so it is neither of the assignment keys and is granted by
    // migration to nobody.
    edit_shift_assignment_effective_dated: "Edit Shift Assignment (effective from a date)",
    // The approval and recalculation screens. `view_attendance_approvals`
    // opens Attendance Approval and OT Approval - what each person sees
    // there is decided by their approval role and outlet on the server;
    // `approve_attendance_regularization` is the decision itself.
    // `recalculate_attendance` re-runs the engine and rewrites the rows
    // payroll reads, and is granted by migration to nobody.
    view_attendance_approvals: "View Attendance / OT Approvals",
    approve_attendance_regularization: "Approve / Reject Attendance and OT Requests",
    recalculate_attendance: "Recalculate Attendance",
    // THE ONE-DAY SHIFT CHANGE, all three of its keys, granted by migration
    // to nobody.
    //
    //   raise_    the EMPLOYEE's own request, for themselves only - the route
    //             takes the employee from the session and has no field that
    //             could name anybody else, so this key can never act on
    //             somebody else's attendance.
    //   view_     the Shift tab of the approval centre.
    //   approve_  reaching the decision endpoint. NOT the authority to decide
    //             a particular stage, which is the approval chain's and is
    //             decided per request on the server.
    raise_shift_change_request: "Request a One-Day Shift Change (own attendance)",
    view_shift_change_requests: "View Shift Change Requests",
    approve_shift_change_request: "Approve / Reject Shift Change Requests",
    // The Attendance Approver Setup screen and every mutation behind it:
    // per-employee First / Second / Final approvers, Bulk Set, Replace
    // Approver. Granted by migration to nobody.
    manage_attendance_approvers: "Manage Attendance Approvers (Approver Setup)",
    // Void Punch: exclude ONE raw BIOMAX / IMPORT punch from calculation with
    // a reason, on the record, without deleting it. Granted by migration to
    // nobody; the action is hidden without it and the server checks it again.
    void_attendance_punch: "Void a Raw Attendance Punch",
  },

  // Reports — the reporting module on the rail beside HR.
  //
  // THESE THREE KEYS ALREADY EXIST AND ALREADY GATE THE BACKEND. The
  // reports-foundation migration declared `view_reports`, `export_reports` and
  // `manage_shared_report_templates` and granted them to NOBODY;
  // `routes/employee_report.js` has required them since the day Reports
  // shipped. They were simply never listed HERE - and this file is what the
  // Permission Matrix renders - so there was no checkbox and the rights could
  // not be granted at all. Reports worked for administrators, through the
  // `user_type = 2` bypass, and for no one else. Listing them is the whole fix;
  // it is the same gap the C2 employee keys and `view_employee_aadhaar` had.
  //
  // NO SECOND PERMISSION SYSTEM. The keys are the backend's, spelled exactly as
  // `constants/hr_permissions.js` spells them. Nothing here is renamed,
  // aliased or invented.
  //
  // THREE DECISIONS, BECAUSE THEY ARE THREE:
  //
  //   view_reports   discovery and preview. It confers NO field access of its
  //                  own: somebody who reaches the screen sees exactly the
  //                  columns their existing B2/B3/M2 permissions already allow,
  //                  so a report cannot become a way around
  //                  `view_employee_sensitive` or `view_salary`.
  //   export_reports taking data out of the building in bulk. Separate on
  //                  purpose - somebody may reasonably be trusted to look at a
  //                  screen and not to email a spreadsheet.
  //   manage_shared_report_templates
  //                  publishing a report to everybody rather than keeping it.
  //
  // IT IS NOT A DOORWAY INTO A DATASET. The Employee Master dataset is HR's,
  // and reaching it needs `view_employees` as well - the same key that guards
  // the HR directory. The backend requires exactly that pair with `requireAll`
  // (AND, never OR), the navigation entries name both, and the pages ask for
  // both with `{ all: true }`. Ticking only the box below therefore grants the
  // reporting capability and no employee data whatsoever.
  //
  // `hr_reports` AND `process_payroll` STAY OFF THIS SCREEN, for the reason M3
  // gave: neither runs a payroll nor produces a report today, and a key that
  // can be granted before its screen exists grants nothing while being
  // remembered as if it did.
  reports: {
    view_reports: "View Reports",
    export_reports: "Export Reports",
    manage_shared_report_templates: "Manage Shared Report Templates",
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
    // Telegram Group Registry. Read and write are separate keys, and the
    // write key is `manage_*` rather than `add_*` because it also covers
    // editing and deleting a registered group. Both are declared by the
    // registry migration and granted to nobody, so an administrator ticks
    // them here for whoever should maintain the list.
    view_telegram_groups: "View Telegram Group Registry",
    manage_telegram_groups: "Manage Telegram Group Registry",
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
    verify_grn: "Verify GRN",
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

/**
 * RIGHTS THAT ARE MUTUALLY EXCLUSIVE - ticking one unticks the others.
 *
 * The dashboard store scope is ONE value: Own Store or All Stores. The rights
 * table stores booleans and cannot express that, so the server enforces it
 * (`utils/dashboard_scope.js` refuses a designation holding both) and this
 * makes the screen agree, so nobody can produce the state that would be
 * refused. It is a convenience, not the guarantee: the server decides whether
 * both keys were saved anyway, by any other route.
 */
export const EXCLUSIVE_PERMISSION_GROUPS = [
  ["dashboard_scope_own_store", "dashboard_scope_all_stores"],
];

/**
 * The selection after toggling `key`, with any mutually exclusive sibling
 * turned off. Pure: it takes the current keys and returns the next ones.
 */
export function applyExclusive(selectedKeys, key, checked) {
  const next = new Set(selectedKeys || []);
  if (!checked) {
    next.delete(key);
    return [...next];
  }
  next.add(key);
  EXCLUSIVE_PERMISSION_GROUPS.forEach((group) => {
    if (!group.includes(key)) return;
    group.filter((sibling) => sibling !== key).forEach((sibling) => next.delete(sibling));
  });
  return [...next];
}
