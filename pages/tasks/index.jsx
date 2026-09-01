import React from "react";
import WorkItemsPage from "../../components/workItems/WorkItemsPage";

function Tasks() {
  return (
    <WorkItemsPage
      title="Tasks"
      itemType="task"
      permissionKey={["view_tasks"]}
      tableKey="tasks-all"
      createLabel="Add Task"
      emptyMessage="No tasks match these filters"
    />
  );
}

export default Tasks;
