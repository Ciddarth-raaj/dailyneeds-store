import React from "react";
import WorkItemsPage from "../../components/workItems/WorkItemsPage";

/** Tickets and tasks together, scoped to whoever is signed in. */
function MyWork() {
  return (
    <WorkItemsPage
      title="My Work"
      scope="mine"
      permissionKey={["view_my_tickets", "view_tasks"]}
      tableKey="my-work"
      createLabel="Add Task"
      emptyMessage="Nothing is assigned to you right now"
    />
  );
}

export default MyWork;
