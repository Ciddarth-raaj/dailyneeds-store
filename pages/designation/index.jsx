import React, { useState, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import DesignationHelper from "../../helper/designation";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import MasterEditModal from "../../components/masters/MasterEditModal";
import usePermissions from "../../customHooks/usePermissions";

/**
 * Designation master.
 *
 * ================================================== WHAT WAS BROKEN ========
 *
 * This screen had a View action, and View opened /designation/:id - which is a
 * full edit form, not a viewer. So the name could always be changed. The status
 * could not: that form hardcoded `status: 1` in its initial values and offered
 * no status control at all, which meant saving ANY designation silently set it
 * to Active. Editing an inactive designation reactivated it.
 *
 * Edit here changes exactly the two columns the master screen is for, in a
 * dialog, so the grid's sort, filter and scroll position survive.
 */
function DesignationView() {
  const toast = useToast();
  // The same key that guards creating a designation, and the one the backend's
  // `/update-designation` already requires.
  const canManage = usePermissions(["add_designation"]);

  const [designations, setDesignations] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  function getDesignationData() {
    DesignationHelper.getDesignation()
      .then((data) => {
        setDesignations(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.log(err));
  }

  useEffect(() => {
    getDesignationData();
  }, []);

  /**
   * Rename and/or retire, keyed by the designation's own id.
   *
   * TWO THINGS THIS DELIBERATELY OMITS.
   *
   * `permissions` is not sent. The backend deletes and recreates the whole
   * permission set whenever that array is present, so sending one from a screen
   * that never loaded it would revoke everything this designation can do. Left
   * absent, the permission set is untouched.
   *
   * `online_portal` and `login_access` are not sent either. Both are legacy and
   * inert - nothing in the application reads either one - and the update route
   * now accepts a body without them, leaving the stored values exactly as they
   * are rather than zeroing them. Echoing values nobody reads back through the
   * browser only creates a way to corrupt them.
   */
  const saveDesignation = async ({ id, name, status }) => {
    setSaving(true);
    try {
      const res = await DesignationHelper.updateDesignation({
        designation_id: Number(id),
        designation_details: {
          designation_name: name,
          status: Number(status),
        },
      });
      if (!res || res.code !== 200) {
        toast({
          title: (res && res.msg) || "The designation could not be updated",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
        return false;
      }
      toast({ title: "Designation updated", status: "success", duration: 3000 });
      getDesignationData();
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
      field: "designation_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "designation_name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "status",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (props) =>
        props.data.status === 1
          ? { label: "Active", colorScheme: "green" }
          : { label: "Inactive", colorScheme: "red" },
    },
    {
      field: "designation_id",
      headerName: "Action",
      type: "action-icons",
      valueGetter: (props) => {
        const actions = [
          {
            label: "View",
            iconType: "view",
            redirectionUrl: `/designation/${props.data.designation_id}`,
          },
        ];
        if (canManage) {
          actions.push({
            label: "Edit",
            iconType: "edit",
            onClick: () =>
              setEditing({
                id: props.data.designation_id,
                name: props.data.designation_name,
                status: props.data.status,
              }),
          });
        }
        return actions;
      },
    },
  ];

  return (
    <GlobalWrapper title="Designation Details">
      <CustomContainer title="Designations" filledHeader>
        <AgGrid rowData={designations} colDefs={colDefs} />
      </CustomContainer>

      <MasterEditModal
        noun="Designation"
        isOpen={Boolean(editing)}
        record={editing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={saveDesignation}
      />
    </GlobalWrapper>
  );
}

export default DesignationView;
