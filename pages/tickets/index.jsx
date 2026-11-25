import React from "react";
import WorkItemsPage from "../../components/workItems/WorkItemsPage";

function Tickets() {
  return (
    <WorkItemsPage
      title="Tickets"
      itemType="ticket"
      permissionKey={["view_tickets"]}
      tableKey="tickets-all"
      createLabel="Raise Ticket"
      emptyMessage="No tickets match these filters"
    />
  );
}

export default Tickets;
