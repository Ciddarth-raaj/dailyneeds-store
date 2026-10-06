module.exports = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Branch Details and IP Restrictions moved under Masters, and LR Workflow
  // became Advance Request. Bookmarks and any link not updated keep working;
  // the query string (?id=) is carried across.
  async redirects() {
    return [
      { source: "/branch-details", destination: "/master/branch", permanent: true },
      { source: "/branch-details/:mode", destination: "/master/branch/:mode", permanent: true },
      { source: "/misc/ip-restrictions", destination: "/master/ip-restrictions", permanent: true },
      // The old create-only Company Details page; the screen is under Master now.
      { source: "/company-details", destination: "/master/company-details", permanent: true },
      { source: "/lr-workflow/advance-request", destination: "/advance-request", permanent: true },
      {
        source: "/lr-workflow/advance-request/:path*",
        destination: "/advance-request/:path*",
        permanent: true,
      },
      // The dashboard screens are tabs of /dashboard now. TEMPORARY (307)
      // rather than permanent while the consolidation beds in: a browser
      // caches a 308 for good, and these routes may yet need to come back.
      // The old page files redirect too, for in-app navigations; the tab map
      // is util/dashboardTabs.js#LEGACY_DASHBOARD_ROUTES.
      { source: "/attendance/dashboard", destination: "/dashboard?tab=staffing", permanent: false },
      { source: "/payroll/dashboard", destination: "/dashboard?tab=payroll", permanent: false },
      { source: "/attendance/my", destination: "/dashboard?tab=my-attendance", permanent: false },
    ];
  },
};
