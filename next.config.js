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
      { source: "/lr-workflow/advance-request", destination: "/advance-request", permanent: true },
      {
        source: "/lr-workflow/advance-request/:path*",
        destination: "/advance-request/:path*",
        permanent: true,
      },
    ];
  },
};
