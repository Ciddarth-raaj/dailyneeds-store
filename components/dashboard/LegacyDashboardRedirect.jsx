import React, { useEffect } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../globalWrapper/globalWrapper";
import { dashboardHref } from "../../util/dashboardTabs";

/**
 * An old dashboard route, sent to its tab on `/dashboard`.
 *
 * `next.config.js` already redirects these on a full page load - a bookmark, a
 * pasted link. This covers an IN-APP navigation, which loads the page's code
 * without asking the server and so never meets that redirect. Any query string
 * is carried across; `replace`, so Back does not bounce through the old URL.
 */
export default function LegacyDashboardRedirect({ tab }) {
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    router.replace(dashboardHref(tab, router.query));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, tab]);
  return <GlobalWrapper title="Dashboard" loading />;
}
