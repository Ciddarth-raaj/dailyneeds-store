import React from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import StockAuditApp from "../../components/stockAudit/StockAuditApp";
import { useUser } from "../../contexts/UserContext";
import { P } from "../../components/stockAudit/permissions";

/**
 * /stock-audit/<screen> - the Stock Audit & SAPL module (components/stockAudit).
 * The screens read through components/stockAudit/data/adapter.js, which serves
 * clearly labelled SAMPLE data until the backend /stock-audit endpoints exist.
 * The signed-in user's permission keys decide the menu; the backend enforces
 * every key and the branch scope again on each request.
 */
export default function StockAuditPage() {
  const router = useRouter();
  const { userConfig } = useUser();
  const keys = (userConfig.permissions || []).map((p) => p.permission_key);
  const path = (router.query.screen || []).join("/");
  const params = Object.fromEntries(Object.entries(router.query).filter(([k]) => k !== "screen"));
  const go = (to, q = {}) => router.push({ pathname: `/stock-audit/${to}`, query: q });
  return (
    <GlobalWrapper title="Stock Audit" permissionKey={Object.values(P)}>
      <StockAuditApp key={router.asPath} path={path} params={params} go={go} preview={false} permissionKeys={keys} />
    </GlobalWrapper>
  );
}
