import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@chakra-ui/react";
import toast from "react-hot-toast";

import AgGrid from "../../../components/AgGrid";
import CustomContainer from "../../../components/CustomContainer";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import OutletHelper from "../../../helper/outlets";
import usePermissions from "../../../customHooks/usePermissions";

const VIEW_PERMISSION = "view_branch";
const IP_PERMISSION = "manage_ip_restrictions";

/**
 * Branch listing, under Masters → Branch and Restrictions.
 *
 * The IP column comes from the permission-gated rule endpoint rather than
 * the outlet list: the outlet list needs no token, so it deliberately does
 * not carry a branch's allow-list. Users without the IP permission simply
 * do not see the column.
 */
function Branches() {
  const canManageIp = usePermissions(IP_PERMISSION);

  const [outlets, setOutlets] = useState([]);
  const [ipRules, setIpRules] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const requests = [OutletHelper.getOutlet()];
    if (canManageIp) requests.push(OutletHelper.getIpRestrictions());

    Promise.all(requests)
      .then(([list, rules]) => {
        setOutlets(Array.isArray(list) ? list : []);
        const byId = {};
        (rules || []).forEach((rule) => {
          byId[rule.outlet_id] = rule;
        });
        setIpRules(byId);
      })
      .catch((err) => toast.error(err?.message || "Could not load branches"))
      .finally(() => setLoading(false));
  }, [canManageIp]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () =>
      outlets.map((outlet) => ({
        ...outlet,
        ip_rule: ipRules[outlet.outlet_id] || null,
      })),
    [outlets, ipRules]
  );

  const colDefs = useMemo(() => {
    const columns = [
      { field: "outlet_id", headerName: "ID", resizable: false, maxWidth: 100 },
      { field: "outlet_name", headerName: "Branch", resizable: true, flex: 2 },
      { field: "outlet_nickname", headerName: "Nickname", resizable: true, flex: 1 },
      { field: "gofrugal_id", headerName: "GoFrugal ID", hideByDefault: true },
      { field: "outlet_code", headerName: "Outlet Code", resizable: true, hideByDefault: true },
    ];

    if (canManageIp) {
      columns.push({
        field: "ip_rule",
        headerName: "IP",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.ip_rule?.ip_restriction_enabled
            ? { label: "Restricted", colorScheme: "red" }
            : { label: "Open", colorScheme: "gray" },
      });
    }

    columns.push({
      field: "actions",
      headerName: "Action",
      type: "action-icons",
      valueGetter: (params) => {
        const id = params.data?.outlet_id;
        return [
          {
            label: "View",
            iconType: "view",
            redirectionUrl: `/master/branch/view?id=${id}`,
          },
          {
            label: "Edit",
            iconType: "edit",
            redirectionUrl: `/master/branch/edit?id=${id}`,
          },
        ];
      },
    });

    return columns;
  }, [canManageIp]);

  return (
    <GlobalWrapper title="Branches" permissionKey={VIEW_PERMISSION}>
      <CustomContainer
        title="Branches"
        filledHeader
        rightSection={
          <Link href="/master/branch/create" passHref>
            <Button colorScheme="purple" size="sm">
              Add
            </Button>
          </Link>
        }
      >
        {loading ? null : (
          <AgGrid
            rowData={rows}
            columnDefs={colDefs}
            tableKey="master-branches"
            gridOptions={{
              getRowId: (params) => String(params.data?.outlet_id ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Branches;
