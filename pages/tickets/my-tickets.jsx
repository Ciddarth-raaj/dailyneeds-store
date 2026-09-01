import React from "react";
import WorkItemsPage from "../../components/workItems/WorkItemsPage";

function MyTickets() {
  return (
    <WorkItemsPage
      title="My Tickets"
      itemType="ticket"
      scope="mine"
      permissionKey={["view_my_tickets"]}
      tableKey="tickets-mine"
      createLabel="Raise Ticket"
      emptyMessage="Nothing is assigned to you right now"
    />
  );
}

export default MyTickets;
