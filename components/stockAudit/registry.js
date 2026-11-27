import { P } from "./permissions";
import { CompanyDashboard, StoreDashboard, EmployeePerformance, MyStockAudit, ArticleAuditDetails } from "./screens/monitoring";
import { AllotmentReport, AllotmentHistory } from "./screens/allotment";
import { BulkAllotmentImport, BulkImportValidation } from "./screens/bulkImport";
import { RecountVerification, VarianceReport } from "./screens/verification";
import { CycleMaster, EmployeeMapping, SyncReport, PolicySettings, EligibleHeadcount, ResponsiblePersons } from "./screens/admin";
import { EmployeeIncentives, SupervisorKpi, StoreManagerKpi, OperationsManagerKpi, CalculationPreview, Approvals, IncentiveHistory } from "./screens/incentives";
import { Leaderboard, StorePoints, SeasonMaster, ScoringSettings, PrizeDistribution, CompetitionHistory } from "./screens/sapl";
import { HrDownload, ConsolidatedPdfPreview, StorePdfPreview } from "./screens/hr";

/** Every screen: number (as in the brief), path, group, title, permission to see it in the menu. */
export const SCREENS = [
  { no: 1, path: "company", group: "Monitoring", title: "Company-wide Dashboard", perm: P.COMPANY, C: CompanyDashboard },
  { no: 2, path: "store", group: "Monitoring", title: "Store-wise Dashboard", perm: P.STORE, C: StoreDashboard },
  { no: 3, path: "employees", group: "Monitoring", title: "Employee-wise Performance", perm: P.STORE, C: EmployeePerformance },
  { no: 4, path: "my", group: "Monitoring", title: "My Stock Audit", perm: P.OWN, C: MyStockAudit },
  { no: 5, path: "allotment", group: "Allotment", title: "Article Allotment Report", perm: P.STORE, C: AllotmentReport },
  { no: 6, path: "import", group: "Allotment", title: "Allotment Import (bulk CSV)", perm: P.IMPORT, C: BulkAllotmentImport },
  { no: 7, path: "import-validation", group: "Allotment", title: "Import Validation", perm: P.IMPORT, C: BulkImportValidation },
  { no: 8, path: "allotment-history", group: "Allotment", title: "Upload & Revision History", perm: P.IMPORT, C: AllotmentHistory },
  { no: 9, path: "articles", group: "Monitoring", title: "Article-wise Audit Details", perm: [P.STORE, P.OWN], C: ArticleAuditDetails },
  { no: 10, path: "verification", group: "Monitoring", title: "Recount & Verification", perm: P.STORE, C: RecountVerification },
  { no: 11, path: "variance", group: "Monitoring", title: "Shortage & Excess", perm: P.STORE, C: VarianceReport },
  { no: 12, path: "cycles", group: "Administration", title: "Audit Cycle Master", perm: P.CYCLES, C: CycleMaster },
  { no: 13, path: "mapping", group: "Administration", title: "RetailPilot Employee Mapping", perm: P.MAPPING, C: EmployeeMapping },
  { no: 14, path: "sync", group: "Administration", title: "Sync & Exceptions", perm: P.SYNC, C: SyncReport },
  { no: 15, path: "incentives", group: "Incentives", title: "Employee Incentives", perm: P.STORE, C: EmployeeIncentives },
  { no: 16, path: "supervisor", group: "Incentives", title: "Supervisor KPI & Incentive", perm: P.STORE, C: SupervisorKpi },
  { no: 17, path: "store-manager", group: "Incentives", title: "Store Manager KPI & Incentive", perm: P.STORE, C: StoreManagerKpi },
  { no: 18, path: "operations-manager", group: "Incentives", title: "Operations Manager KPI", perm: P.COMPANY, C: OperationsManagerKpi },
  { no: 19, path: "calc-preview", group: "Incentives", title: "Calculation Preview", perm: P.CALCULATE, C: CalculationPreview },
  { no: 20, path: "approvals", group: "Incentives", title: "Incentive Approval", perm: P.APPROVE, C: Approvals },
  { no: 21, path: "incentive-history", group: "Incentives", title: "Incentive History", perm: [P.CALCULATE, P.APPROVE], C: IncentiveHistory },
  { no: 22, path: "policy", group: "Administration", title: "Incentive Policy Settings", perm: P.POLICY, C: PolicySettings },
  { no: 23, path: "sapl", group: "Premier League", title: "SAPL Leaderboard", perm: P.SAPL_VIEW, C: Leaderboard },
  { no: 24, path: "sapl-store", group: "Premier League", title: "Store Points Breakdown", perm: P.SAPL_VIEW, C: StorePoints },
  { no: 25, path: "seasons", group: "Premier League", title: "Season Master", perm: P.SAPL_MANAGE, C: SeasonMaster },
  { no: 26, path: "sapl-scoring", group: "Premier League", title: "Scoring Settings", perm: P.SAPL_MANAGE, C: ScoringSettings },
  { no: 27, path: "prize", group: "Premier League", title: "Prize Distribution", perm: P.SAPL_PRIZE, C: PrizeDistribution },
  { no: 28, path: "sapl-history", group: "Premier League", title: "History & Championships", perm: P.SAPL_VIEW, C: CompetitionHistory },
  { no: 29, path: "hr-reports", group: "HR Reports", title: "HR Daily PDF Download", perm: P.HR_PDF, C: HrDownload },
  { no: 30, path: "hr-pdf-all", group: "HR Reports", title: "Consolidated PDF Preview", perm: P.HR_PDF, C: ConsolidatedPdfPreview },
  { no: 31, path: "hr-pdf-store", group: "HR Reports", title: "Store PDF Preview", perm: P.HR_PDF, C: StorePdfPreview },
  { no: 32, path: "eligibility", group: "Administration", title: "Eligible Headcount & Exclusions", perm: [P.CYCLES, P.EXCLUSIONS_APPROVE, P.STORE, P.COMPANY], C: EligibleHeadcount },
  { no: 33, path: "roles", group: "Administration", title: "Responsible Persons", perm: [P.ROLES, P.STORE, P.COMPANY], C: ResponsiblePersons },
];

export const GROUPS = ["Monitoring", "Allotment", "Incentives", "Premier League", "HR Reports", "Administration"];

export const allowed = (screen, can) => (Array.isArray(screen.perm) ? screen.perm.some(can) : can(screen.perm));
