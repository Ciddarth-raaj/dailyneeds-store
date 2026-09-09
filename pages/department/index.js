//External Dependancies
import { useToast } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

//Helpers
import DepartmentHelper from "../../helper/department";

//InternalDependancies
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import MasterEditModal from "../../components/masters/MasterEditModal";
import usePermissions from "../../customHooks/usePermissions";

/**
 * Department master.
 *
 * ================================================== WHAT WAS BROKEN ========
 *
 * The Action column existed only as a commented-out block, so this screen had
 * no actions at all: a department could be looked at and nothing else. The
 * detail page at /department/:id was already a working edit form, but nothing
 * in the UI linked to it, and it carried no status field either - so even
 * reaching it by typing the URL could rename a department but never retire one.
 *
 * Both actions are back, and Edit opens a dialog rather than navigating: the
 * grid's sort, filter and scroll position survive, which matters when the task
 * is retiring several rows in a row.
 */
function DepartmentView() {
  const toast = useToast();
  // The same key that guards creating a department. Renaming or retiring one
  // is the same authority, and it is what the backend's `/update-department`
  // already requires - so an unauthorized user is not offered an action that
  // would fail.
  const canManage = usePermissions(["add_department"]);

  const [department, setDepartment] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => getDepartmentData(), []);

  function getDepartmentData() {
    DepartmentHelper.getDepartment()
      .then((data) => {
        setDepartment(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.log(err));
  }

  /**
   * Rename and/or retire, in one request, keyed by the department's own id.
   *
   * `department_details` carries both columns: the backend's `UPDATE department
   * SET ?` writes whatever it is given, so an unchanged name is simply written
   * back as itself. No employee row is touched.
   */
  const saveDepartment = async ({ id, name, status }) => {
    setSaving(true);
    try {
      const res = await DepartmentHelper.updateDepartment({
        department_id: Number(id),
        department_details: { department_name: name, status: Number(status) },
      });
      if (!res || res.code !== 200) {
        toast({
          title: (res && res.msg) || "The department could not be updated",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
        return false;
      }
      toast({ title: "Department updated", status: "success", duration: 3000 });
      // Refetch rather than patch in place, so the row shows exactly what was
      // stored rather than what this screen hoped was stored.
      getDepartmentData();
      return true;
    } catch (err) {
      console.log(err);
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const colDefs = [
    {
      field: "department_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "department_name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "department_code",
      headerName: "Code",
      hideByDefault: true,
    },
    {
      field: "status",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (props) =>
        props.data.status === 1 ? { label: "Active", colorScheme: "green" }
          : { label: "Inactive", colorScheme: "red" },
    },
    {
      field: "department_id",
      headerName: "Action",
      type: "action-icons",
      valueGetter: (props) => {
        const actions = [
          {
            label: "View",
            iconType: "view",
            redirectionUrl: `/department/${props.data.department_id}`,
          },
        ];
        // Offered only to somebody who may actually save. The backend checks
        // again; this is so the action is not there to be clicked in vain.
        if (canManage) {
          actions.push({
            label: "Edit",
            iconType: "edit",
            onClick: () =>
              setEditing({
                id: props.data.department_id,
                name: props.data.department_name,
                status: props.data.status,
              }),
          });
        }
        return actions;
      },
    },
  ];

  return (
    <GlobalWrapper title="Department Details">
      <CustomContainer title="Department" filledHeader>
        <AgGrid rowData={department} colDefs={colDefs} />
      </CustomContainer>

      <MasterEditModal
        noun="Department"
        isOpen={Boolean(editing)}
        record={editing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={saveDepartment}
      />
    </GlobalWrapper>
  );
}

export default DepartmentView;
