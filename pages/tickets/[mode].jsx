import React, { useEffect, useState } from "react";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomInput from "../../components/customInput/customInput";
import styles from "../../styles/master.module.css";
import { Button, Divider, Flex, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import useOutlets from "../../customHooks/useOutlets";
import { useUser } from "../../contexts/UserContext";
import useTicketById from "../../customHooks/useTicketById";
import { priorityRenderer, statusRenderer } from ".";
import { useTelegramDepartments } from "../../customHooks/useTelegramDepartments";
import FilesHelper from "../../helper/asset";
import { createTicket, updateTicket } from "../../helper/tickets";
import useEmployees from "../../customHooks/useEmployees";
import usePermissions from "../../customHooks/usePermissions";

const TICKET_VALIDATION_SCHEMA = Yup.object()
  .shape({
    title: Yup.string().required("Title is required"),
    priority: Yup.string().required("Priority is required"),
    status: Yup.string().required("Status is required"),
    outlet_id: Yup.string().nullable(),
    department_id: Yup.string().nullable(),
    description: Yup.string().nullable(),
    assigned_to: Yup.string().nullable(),
    files: Yup.array().nullable(),
  })
  .test(
    "branch-or-department",
    "At least one of Branch or Department must be selected",
    function (values) {
      const hasOutlet = !!values?.outlet_id;
      const hasDepartment = !!values?.department_id;

      if (!hasOutlet && !hasDepartment) {
        return this.createError({
          path: "outlet_id", // or '' to attach to form-level error
          message: "At least one of Branch or Department must be selected",
        });
      }

      return true;
    }
  );

const INITIAL_VALUES = {
  title: "",
  description: "",
  status: "open",
  priority: "",
  outlet_id: "",
  assigned_to: "",
  department_id: "",
  files: [],
};

const PRIORITY_LIST = [
  {
    value: "Low",
    id: "low",
  },
  {
    value: "Medium",
    id: "medium",
  },
  {
    value: "High",
    id: "high",
  },
];

const STATUS_LIST = [
  {
    value: "Open",
    id: "open",
  },
  {
    value: "In Progress",
    id: "in_progress",
  },
  {
    value: "Closed",
    id: "closed",
  },
];

function TicketForm() {
  const router = useRouter();
  const { mode, id: paramId, type = "all" } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";
  const onlyStatus = type === "my-tickets";

  const { ticket } = useTicketById(paramId);
  const { outlets } = useOutlets();
  const { departments } = useTelegramDepartments();
  const { employees } = useEmployees();

  const canAddTickets = usePermissions(["add_tickets"]);

  const getEmployeeList = (storeId) => {
    return employees
      .filter((item) =>
        storeId === null || item.store_id === null
          ? true
          : item.store_id == storeId
      )
      .map((item) => ({
        id: item.employee_id,
        value: item.employee_name,
      }));
  };

  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  const DEPARTMENTS_LSIT = departments.map((item) => ({
    id: item.id,
    value: item.department,
  }));

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  useEffect(() => {
    if (!createMode && ticket) {
      setInitialValues({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        outlet_id: ticket.outlet_id,
        assigned_to: ticket.assigned_to,
        department_id: ticket.department_id,
        files: ticket.images.map((item) => item.s3_url),
      });
    }
  }, [ticket, createMode]);

  const handleSubmit = async (values) => {
    const toastId = toast.loading(
      editMode || viewMode ? "Updating Ticket!" : "Creating Ticket!"
    );

    try {
      let data = {
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        outlet_id: values.outlet_id === "" ? null : values.outlet_id,
        assigned_to: values.assigned_to === "" ? null : values.assigned_to,
        department_id:
          values.department_id === "" ? null : values.department_id,
      };

      if (!editMode && !viewMode) {
        data.images = [];

        if (values.files && values.files.length > 0) {
          for (const item of values.files) {
            // If item is a string (URL), use it directly
            if (typeof item === "string") {
              data.images.push(item);
            } else {
              // If item is a File object, upload it
              try {
                const res = await FilesHelper.upload(
                  item,
                  item.name,
                  "tickets"
                );

                if (res.code === 200) {
                  data.images.push(res.remoteUrl);
                }
              } catch (err) {
                console.log(err);
              }
            }
          }
        }
      } else {
        data.images_to_delete = [];
        data.images_to_add = [];

        const deletedImages = ticket.images.filter(
          (item) => !values.files?.includes(item.s3_url)
        );

        data.images_to_delete = deletedImages.map((item) => item.image_id);

        for (const item of values.files) {
          if (typeof item !== "string") {
            try {
              const res = await FilesHelper.upload(item, item.name, "tickets");

              if (res.code === 200) {
                data.images_to_add.push(res.remoteUrl);
              }
            } catch (err) {
              console.log(err);
            }
          }
        }
      }

      if (onlyStatus) {
        data = {
          status: values.status,
        };
      }

      const promise =
        editMode || viewMode ? updateTicket(paramId, data) : createTicket(data);
      const response = await promise;

      if (response.code === 200 || response.id) {
        if (
          (editMode || viewMode) &&
          ticket.assigned_to !== values.assigned_to
        ) {
          await updateTicket(paramId, {
            assigned_to: values.assigned_to,
          });
        }

        toast.success(
          editMode || viewMode
            ? "Successfully Updated Ticket!"
            : "Successfully Created Ticket!",
          {
            id: toastId,
          }
        );

        router.push(type === "my-tickets" ? "/tickets/my-tickets" : "/tickets");
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error(
        editMode || viewMode
          ? "Error Updating Ticket!"
          : "Error Creating Ticket!",
        {
          id: toastId,
        }
      );
    }
  };

  const globalWrapperPermissionKey = createMode
    ? ["add_tickets"]
    : ["view_tickets"];

  return (
    <GlobalWrapper permissionKey={globalWrapperPermissionKey}>
      <CustomContainer
        title={
          viewMode ? "View Ticket" : editMode ? "Edit Ticket" : "Add New Ticket"
        }
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={TICKET_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm, values, errors } = formikProps;

            return (
              <div className={styles.inputContainer}>
                <Flex gap="22px">
                  <CustomInput
                    label="Branch"
                    placeholder="Click here to select branch..."
                    name="outlet_id"
                    method="switch"
                    values={OUTLETS_LIST}
                    editable={!viewMode && canAddTickets && !onlyStatus}
                  />

                  <CustomInput
                    label="Department"
                    placeholder="Click here to select department..."
                    name="department_id"
                    method="switch"
                    values={DEPARTMENTS_LSIT}
                    editable={!viewMode && canAddTickets && !onlyStatus}
                  />
                </Flex>

                <Divider mb="24px" />

                <Flex gap="22px">
                  <CustomInput
                    label="Title"
                    isRequired
                    placeholder="Enter ticket title"
                    name="title"
                    type="text"
                    editable={!viewMode && canAddTickets && !onlyStatus}
                  />

                  <CustomInput
                    label="Priority"
                    isRequired
                    name="priority"
                    method="switch"
                    values={PRIORITY_LIST}
                    editable={!viewMode && canAddTickets && !onlyStatus}
                    renderer={priorityRenderer}
                  />

                  {!createMode && (
                    <>
                      <CustomInput
                        label="Status"
                        isRequired
                        name="status"
                        method="switch"
                        values={STATUS_LIST}
                        editable={!viewMode}
                        renderer={statusRenderer}
                      />

                      <CustomInput
                        label="Assigned To"
                        name="assigned_to"
                        method="switch"
                        values={getEmployeeList(values.outlet_id)}
                        editable={canAddTickets && !onlyStatus}
                      />
                    </>
                  )}
                </Flex>

                <CustomInput
                  label="Description"
                  placeholder="Describe the task"
                  name="description"
                  method="TextArea"
                  editable={!viewMode && canAddTickets && !onlyStatus}
                />

                <CustomInput
                  label="Files"
                  name="files"
                  method="file"
                  editable={!viewMode && canAddTickets && !onlyStatus}
                  multiple
                  accept="image/*"
                />

                {!viewMode &&
                  errors.items &&
                  typeof errors.items === "string" && (
                    <Flex justifyContent="flex-end">
                      <Text color="red" fontSize="sm">
                        {errors.items}
                      </Text>
                    </Flex>
                  )}

                {canAddTickets && (
                  <Flex
                    className={styles.buttonContainer}
                    mt={8}
                    justify="flex-end"
                  >
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={() => resetForm()}
                    >
                      Reset
                    </Button>

                    <Button colorScheme="purple" onClick={handleSubmit}>
                      {editMode || viewMode ? "Update" : "Create"}
                    </Button>
                  </Flex>
                )}
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default TicketForm;
