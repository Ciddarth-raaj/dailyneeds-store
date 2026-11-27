/**
 * Standalone PREVIEW of the Stock Audit & SAPL module: the same components as
 * pages/stock-audit, with a hash router and SAMPLE data. Built by
 * preview/stock-audit/build.sh into a static page; never part of the Next app.
 */
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ChakraProvider } from "@chakra-ui/react";
import { Toaster } from "react-hot-toast";
import theme from "../../theme";
import StockAuditApp from "../../components/stockAudit/StockAuditApp";

// In-memory routing; the address only ever carries a plain #screen name
// (deep links with paths or query strings are not reliable in every host).
const screenFromHash = () => (window.location.hash || "").replace(/^#\/?/, "").replace(/[^a-z0-9-]/gi, "");

function Root() {
  const [loc, setLoc] = useState({ path: screenFromHash(), params: {} });
  useEffect(() => {
    const on = () => {
      const path = screenFromHash();
      setLoc((l) => (l.path === path ? l : { path, params: {} }));
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (path, params = {}) => {
    setLoc({ path, params });
    window.scrollTo(0, 0);
    try {
      if (window.location.hash.replace(/^#/, "") !== path) window.history.replaceState(null, "", path ? `#${path}` : "#");
    } catch (e) {
      /* the hash is a convenience only */
    }
  };
  return (
    <ChakraProvider theme={theme}>
      <Toaster position="top-center" />
      <StockAuditApp key={loc.path + JSON.stringify(loc.params)} path={loc.path} params={loc.params} go={go} preview />
    </ChakraProvider>
  );
}

ReactDOM.render(<Root />, document.getElementById("root"));
