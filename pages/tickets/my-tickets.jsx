import React, { useMemo } from "react";
import AgGrid from "../../components/AgGrid";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { useTickets } from "../../customHooks/useTickets";
import { useRouter } from "next/router";
import { colDefs } from ".";
import { useUser } from "../../contexts/UserContext";

function Tickets() {
  const { employeeId } = useUser().userConfig;
  const router = useRouter();
  const filters = useMemo(() => {
    return {
      offset: 0,
      limit: 10000,
      assigned_to: employeeId,
    };
  }, [employeeId]);
  const { tickets } = useTickets(filters);

  return (
    <GlobalWrapper title="My Tickets" permissionKey={["view_my_tickets"]}>
      <CustomContainer title="My Tickets" filledHeader>
        <AgGrid rowData={tickets} columnDefs={colDefs(router, "my-tickets")} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Tickets;
