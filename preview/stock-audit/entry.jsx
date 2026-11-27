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

function parse() {
  const h = window.location.hash.replace(/^#\/?/, "");
  const [path, qs] = h.split("?");
  return { path: path || "", params: Object.fromEntries(new URLSearchParams(qs || "")) };
}

function Root() {
  const [loc, setLoc] = useState(parse());
  useEffect(() => {
    const on = () => { setLoc(parse()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (path, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    window.location.hash = `/${path}${qs ? `?${qs}` : ""}`;
  };
  return (
    <ChakraProvider theme={theme}>
      <Toaster position="top-center" />
      <StockAuditApp key={loc.path + JSON.stringify(loc.params)} path={loc.path} params={loc.params} go={go} preview />
    </ChakraProvider>
  );
}

ReactDOM.render(<Root />, document.getElementById("root"));
