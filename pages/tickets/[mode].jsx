import React, { useEffect, useState } from "react";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomInput from "../../components/customInput/customInput";
import styles from "../../styles/master.module.css";
import { Button, Divider, Flex } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import useOutlets from "../../customHooks/useOutlets";
import moment from "moment";
import {
  createEBConsumption,
  updateEBConsumption,
} from "../../helper/eb_consumption";
import { useUser } from "../../contexts/UserContext";
import useTicketById from "../../customHooks/useTicketById";
import { priorityRenderer, statusRenderer } from ".";
import { useTelegramDepartments } from "../../customHooks/useTelegramDepartments";
import FilesHelper from "../../helper/asset";
import { createTicket, updateTicket } from "../../helper/tickets";
import useEmployees from "../../customHooks/useEmployees";

const CONSUMPTION_VALIDATION_SCHEMA = Yup.object().shape({
  date: Yup.date().required("Required"),
  branch_id: Yup.string().required("Required"),
  opening_units: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .required("Required"),
  closing_units: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be ≥ 0")
    .required("Required"),
});

const INITIAL_VALUES = {
  title: "",
  description: "",
  status: null,
  priority: null,
  outlet_id: null,
  assigned_to: null,
  department_id: null,
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
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const { ticket } = useTicketById(paramId);
  const { storeId } = useUser().userConfig;
  const { outlets } = useOutlets();
  const { departments } = useTelegramDepartments();
  const { employees } = useEmployees();

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
    const data = {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      outlet_id: values.outlet_id ?? null,
      assigned_to: values.assigned_to ?? null,
      department_id: values.department_id ?? null,
    };

    if (!editMode) {
      data.images = [];

      for (const item of values.files) {
        try {
          const res = await FilesHelper.upload(item, item.name, "tickets");

          if (res.code === 200) {
            data.images.push(res.remoteUrl);
          }
        } catch (err) {
          console.log(err);
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

    toast.promise(editMode ? updateTicket(paramId, data) : createTicket(data), {
      loading: editMode ? "Updating Ticket!" : "Creating Ticket!",
      success: (data) => {
        if (data.code === 200 || data.id) {
          router.push("/tickets");
          return editMode
            ? "Successfully Updated Ticket!"
            : "Successfully Created Ticket!";
        } else {
          throw data;
        }
      },
      error: (err) => {
        console.log(err);
        return editMode ? "Error Updating Ticket!" : "Error Creating Ticket!";
      },
    });
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
          //   validationSchema={CONSUMPTION_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm, values, setFieldValue } =
              formikProps;

            return (
              <div className={styles.inputContainer}>
                <Flex gap="22px">
                  <CustomInput
                    label="Branch"
                    isRequired
                    placeholder="Click here to select branch..."
                    name="outlet_id"
                    method="switch"
                    values={OUTLETS_LIST}
                    editable={!viewMode}
                  />

                  <CustomInput
                    label="Department"
                    isRequired
                    placeholder="Click here to select department..."
                    name="branch_id"
                    method="switch"
                    values={DEPARTMENTS_LSIT}
                    editable={!viewMode}
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
                    editable={!viewMode}
                  />

                  <CustomInput
                    label="Priority"
                    isRequired
                    name="priority"
                    method="switch"
                    values={PRIORITY_LIST}
                    editable={!viewMode}
                    renderer={priorityRenderer}
                  />

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
                    isRequired
                    name="assigned_to"
                    method="switch"
                    values={getEmployeeList(values.outlet_id)}
                    editable={!viewMode}
                  />
                </Flex>

                <CustomInput
                  label="Decription"
                  placeholder="Describe the task"
                  name="description"
                  type="number"
                  method="TextArea"
                  editable={!viewMode}
                />

                <CustomInput
                  label="Files"
                  name="files"
                  method="file"
                  editable={!viewMode}
                  multiple
                  accept="image/*"
                />

                {!viewMode && (
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
                      {editMode ? "Update" : "Create"}
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
