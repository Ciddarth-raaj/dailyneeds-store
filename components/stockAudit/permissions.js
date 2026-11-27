/**
 * Stock Audit & SAPL permission keys (mirrors the backend
 * constants/stock_audit_permissions.js). One key per decision.
 * A key permits an ACTION; which stores a caller sees is decided by the
 * backend branch scope, never by the screen.
 */
export const P = {
  OWN: "view_own_stock_audit_performance", // employee self-service
  STORE: "view_stock_audit", // store-wise monitoring (own branch)
  COMPANY: "view_stock_audit_all_stores", // company-wide monitoring
  MAPPING: "manage_stock_audit_employee_mapping",
  CYCLES: "manage_stock_audit_cycles",
  IMPORT: "import_stock_audit_allotment",
  IMPORT_APPROVE: "approve_stock_audit_allotment_import",
  VERIFY: "review_stock_audit_verification",
  ELIGIBILITY: "review_stock_audit_eligibility",
  CALCULATE: "calculate_stock_audit_incentives",
  APPROVE: "approve_stock_audit_incentives",
  REVOKE: "revoke_stock_audit_incentives",
  POLICY: "manage_stock_audit_policy",
  SYNC: "run_stock_audit_sync",
  SAPL_VIEW: "view_sapl_leaderboard",
  SAPL_MANAGE: "manage_sapl_competition",
  SAPL_PRIZE: "manage_sapl_prize_distribution",
  HR_REPORTS: "view_stock_audit_hr_reports",
  HR_PDF: "download_stock_audit_hr_pdf",
  PAYROLL: "process_stock_audit_payroll",
};

export const PERMISSION_LABELS = {
  [P.OWN]: "Stock Audit: My performance and incentive (self-service)",
  [P.STORE]: "Stock Audit: Store-wise monitoring (own branch)",
  [P.COMPANY]: "Stock Audit: Company-wide monitoring (all five stores)",
  [P.MAPPING]: "Stock Audit: RetailPilot employee mapping",
  [P.CYCLES]: "Stock Audit: Manage audit cycles",
  [P.IMPORT]: "Stock Audit: Import article allotment (RetailPilot CSV)",
  [P.IMPORT_APPROVE]: "Stock Audit: Approve allotment imports",
  [P.VERIFY]: "Stock Audit: Review recount verification",
  [P.ELIGIBILITY]: "Stock Audit: Review article eligibility",
  [P.CALCULATE]: "Stock Audit: Calculate incentives",
  [P.APPROVE]: "Stock Audit: Approve incentives (never one's own)",
  [P.REVOKE]: "Stock Audit: Revoke approved incentives",
  [P.POLICY]: "Stock Audit: Incentive policy settings",
  [P.SYNC]: "Stock Audit: RetailPilot synchronization",
  [P.SAPL_VIEW]: "SAPL: View Premier League leaderboard",
  [P.SAPL_MANAGE]: "SAPL: Manage seasons and scoring",
  [P.SAPL_PRIZE]: "SAPL: Winning store prize distribution",
  [P.HR_REPORTS]: "Stock Audit: HR all-store reporting",
  [P.HR_PDF]: "Stock Audit: Download HR daily PDFs",
  [P.PAYROLL]: "Stock Audit: Payroll processing of approved incentives",
};

const ALL = Object.values(P);

/** Preview-only personas, to review what each role sees. The real app uses the signed-in user's keys. */
export const VIEWERS = [
  { id: "admin", label: "Admin (all permissions)", keys: ALL, outlets: null },
  { id: "hr", label: "HR (all five stores, reports)", keys: [P.STORE, P.COMPANY, P.HR_REPORTS, P.HR_PDF, P.SAPL_VIEW, P.IMPORT, P.MAPPING], outlets: null },
  { id: "om", label: "Operations Manager", keys: [P.STORE, P.COMPANY, P.SAPL_VIEW, P.APPROVE, P.VERIFY, P.ELIGIBILITY, P.CALCULATE], outlets: null },
  { id: "sm", label: "Store Manager – ECR", keys: [P.STORE, P.SAPL_VIEW, P.APPROVE, P.VERIFY, P.OWN], outlets: [7] },
  { id: "sup", label: "Supervisor – ECR", keys: [P.STORE, P.SAPL_VIEW, P.VERIFY, P.OWN], outlets: [7] },
  { id: "emp", label: "Employee – ECR (self-service)", keys: [P.OWN, P.SAPL_VIEW], outlets: [7], self: true },
];
