import React, { useEffect, useMemo, useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import {
  Box,
  Button,
  Divider,
  Flex,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";

import CustomContainer from "../../components/CustomContainer";
import CustomInput from "../../components/customInput/customInput";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import WorkItemDetail from "../../components/workItems/WorkItemDetail";
import styles from "../../styles/master.module.css";

import useOutlets from "../../customHooks/useOutlets";
import useEmployees from "../../customHooks/useEmployees";
import usePermissions from "../../customHooks/usePermissions";
import useTicketById from "../../customHooks/useTicketById";
import { useTelegramDepartments } from "../../customHooks/useTelegramDepartments";
import { useUser } from "../../contexts/UserContext";

import FilesHelper from "../../helper/asset";
import { createTicket, updateTicket } from "../../helper/tickets";
import {
  ITEM_TYPE_LIST,
  PRIORITY_LIST,
  RECURRENCE_FREQUENCIES,
  STATUS_LIST,
  WEEKDAYS,
  itemTypeMeta,
  todayISO,
} from "../../constants/workItems";

const VALIDATION_SCHEMA = Yup.object().shape({
  title: Yup.string().trim().required("Title is required"),
  item_type: Yup.string().required("Type is required"),
  priority: Yup.string().required("Priority is required"),
  status: Yup.string().required("Status is required"),
  due_date: Yup.string().nullable(),
  description: Yup.string().nullable(),
  assigned_to: Yup.string().nullable(),
  files: Yup.array().nullable(),
  // A branch or a department — an item filed against neither reaches nobody.
  outlet_id: Yup.string().when("department_id", {
    is: (department) => !department,
    then: Yup.string().required(
      "Choose a branch or a department so this reaches someone"
    ),
    otherwise: Yup.string().nullable(),
  }),
  department_id: Yup.string().nullable(),
  recurrence_frequency: Yup.string().nullable(),
});

const INITIAL_VALUES = {
  title: "",
  item_type: "ticket",
  description: "",
  status: "open",
  priority: "medium",
  due_date: "",
  outlet_id: "",
  assigned_to: "",
  department_id: "",
  files: [],
  checklist: [],
  is_recurring: false,
  recurrence_frequency: "weekly",
  recurrence_interval: "1",
  recurrence_day_of_week: "1",
  recurrence_day_of_month: "1",
  recurrence_due_in_days: "0",
};

function WorkItemPage() {
  const router = useRouter();
  const { mode, id: paramId, from, type: typeParam } = router.query;

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";
  // `router.query` is empty until the router is ready, so hold the render
  // rather than flashing the edit form at someone who asked for the view.
  const modeReady = viewMode || editMode || createMode;

  const { employeeId } = useUser().userConfig;
  const { ticket, loading, refetch } = useTicketById(paramId);
  const { outlets } = useOutlets();
  const { departments } = useTelegramDepartments();
  const { employees } = useEmployees();

  const canCreate = usePermissions(["add_tickets", "add_tasks"]);
  const canEditAll = usePermissions(["edit_tickets", "add_tickets", "add_tasks"]);
  const canModerate = usePermissions(["edit_tickets"]);

  const [statusSaving, setStatusSaving] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState("");

  // Editing rights follow the same rule the API enforces: an author or someone
  // with edit_tickets may change anything, an assignee may move the status.
  const isAuthor =
    ticket && String(ticket.created_by) === String(employeeId);
  const isAssignee =
    ticket && String(ticket.assigned_to) === String(employeeId);
  const canEditItem = Boolean(canEditAll || isAuthor);
  const canChangeStatus = Boolean(canEditItem || isAssignee);

  const backHref = from || "/tickets";

  const [initialValues, setInitialValues] = useState(() => ({
    ...INITIAL_VALUES,
    item_type: typeParam === "task" ? "task" : "ticket",
  }));

  useEffect(() => {
    if (createMode) {
      setInitialValues((current) => ({
        ...current,
        item_type: typeParam === "task" ? "task" : "ticket",
      }));
      return;
    }

    if (!ticket) return;

    setInitialValues({
      ...INITIAL_VALUES,
      title: ticket.title || "",
      item_type: ticket.item_type || "ticket",
      description: ticket.description || "",
      status: ticket.status || "open",
      priority: ticket.priority || "medium",
      due_date: ticket.due_date ? String(ticket.due_date).slice(0, 10) : "",
      outlet_id: ticket.outlet_id ?? "",
      assigned_to: ticket.assigned_to ?? "",
      department_id: ticket.department_id ?? "",
      files: (ticket.images || []).map((image) => image.s3_url),
      checklist: [],
    });
  }, [ticket, createMode, typeParam]);

  const outletOptions = useMemo(
    () =>
      (outlets || []).map((item) => ({
        id: item.outlet_id,
        value: item.outlet_name,
      })),
    [outlets]
  );

  const departmentOptions = useMemo(
    () =>
      (departments || []).map((item) => ({
        id: item.id,
        value: item.department,
      })),
    [departments]
  );

  /**
   * Staff at the chosen branch, plus anyone not tied to a branch. With no
   * branch chosen the whole list is offered rather than none of it.
   */
  const employeeOptions = (storeId) => {
    const list = employees || [];
    const noBranchChosen =
      storeId === "" || storeId === null || storeId === undefined;

    return list
      .filter(
        (item) =>
          noBranchChosen ||
          item.store_id === null ||
          String(item.store_id) === String(storeId)
      )
      .map((item) => ({ id: item.employee_id, value: item.employee_name }));
  };

  /** Uploads new files in parallel and reports anything that failed. */
  const uploadFiles = async (files) => {
    const pending = (files || []).filter((item) => typeof item !== "string");
    if (pending.length === 0) return { urls: [], failed: [] };

    const results = await Promise.all(
      pending.map(async (file) => {
        try {
          const response = await FilesHelper.upload(file, file.name, "tickets");
          if (response && response.code === 200 && response.remoteUrl) {
            return { url: response.remoteUrl };
          }
          return { error: file.name };
        } catch (err) {
          return { error: file.name };
        }
      })
    );

    return {
      urls: results.filter((item) => item.url).map((item) => item.url),
      failed: results.filter((item) => item.error).map((item) => item.error),
    };
  };

  const buildRecurrence = (values) => {
    if (!values.is_recurring) return undefined;

    const recurrence = {
      frequency: values.recurrence_frequency,
      interval_value: Number(values.recurrence_interval) || 1,
      due_in_days: Number(values.recurrence_due_in_days) || 0,
      next_run_on: todayISO(),
    };

    if (values.recurrence_frequency === "weekly") {
      recurrence.day_of_week = Number(values.recurrence_day_of_week);
    }

    if (values.recurrence_frequency === "monthly") {
      recurrence.day_of_month = Number(values.recurrence_day_of_month);
    }

    return recurrence;
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    const typeLabel = itemTypeMeta(values.item_type).label;
    const toastId = toast.loading(
      createMode ? `Creating ${typeLabel.toLowerCase()}...` : "Saving changes..."
    );

    try {
      const { urls, failed } = await uploadFiles(values.files);

      // An attachment that never uploaded must not pass silently — the photo is
      // usually the whole point of the item.
      if (failed.length > 0) {
        toast.error(
          `Could not upload ${failed.length} file${
            failed.length === 1 ? "" : "s"
          }: ${failed.join(", ")}. Nothing was saved — please retry.`,
          { id: toastId, duration: 6000 }
        );
        setSubmitting(false);
        return;
      }

      const payload = {
        title: values.title.trim(),
        item_type: values.item_type,
        description: values.description || "",
        status: values.status,
        priority: values.priority,
        due_date: values.due_date || null,
        outlet_id: values.outlet_id === "" ? null : Number(values.outlet_id),
        assigned_to:
          values.assigned_to === "" ? null : Number(values.assigned_to),
        department_id:
          values.department_id === "" ? null : Number(values.department_id),
      };

      let response;

      if (createMode) {
        payload.images = urls;
        if (values.checklist.length > 0) payload.checklist = values.checklist;

        const recurrence = buildRecurrence(values);
        if (recurrence) payload.recurrence = recurrence;

        response = await createTicket(payload);
      } else {
        // The API diffs the item and picks the right notification, so one
        // request is enough — no follow-up call just to trigger a message.
        const keptUrls = (values.files || []).filter(
          (item) => typeof item === "string"
        );
        payload.images_to_delete = ((ticket && ticket.images) || [])
          .filter((image) => !keptUrls.includes(image.s3_url))
          .map((image) => image.image_id);
        payload.images_to_add = urls;

        response = await updateTicket(paramId, payload);
      }

      if (response && (response.id || response.code === 200)) {
        const recurring = createMode && values.is_recurring;
        toast.success(
          createMode
            ? recurring
              ? "Recurring task scheduled"
              : `${typeLabel} created`
            : "Changes saved",
          { id: toastId }
        );
        router.push(backHref);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error(
        (err && err.msg) ||
          (createMode ? "Could not create this item" : "Could not save changes"),
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status) => {
    setStatusSaving(true);
    const toastId = toast.loading("Updating status...");
    try {
      const response = await updateTicket(paramId, { status });
      if (response && (response.id || response.code === 200)) {
        toast.success("Status updated", { id: toastId });
        refetch();
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Could not update status", { id: toastId });
    } finally {
      setStatusSaving(false);
    }
  };

  if (!modeReady) {
    return (
      <GlobalWrapper
        title="Loading"
        permissionKey={["view_tickets", "view_my_tickets", "view_tasks"]}
        loading
      />
    );
  }

  // ------------------------------------------------------------- view mode

  if (viewMode) {
    return (
      <GlobalWrapper
        title="View Item"
        permissionKey={["view_tickets", "view_my_tickets", "view_tasks"]}
        loading={loading}
      >
        <Flex mb="14px">
          <Button
            size="sm"
            variant="ghost"
            colorScheme="purple"
            leftIcon={<i className="fa fa-arrow-left" />}
            onClick={() => router.push(backHref)}
          >
            Back
          </Button>
        </Flex>

        {ticket ? (
          <WorkItemDetail
            ticket={ticket}
            currentEmployeeId={employeeId}
            canEdit={canEditItem}
            canTick={canChangeStatus}
            canModerate={canModerate}
            onStatusChange={canChangeStatus ? handleStatusChange : null}
            statusSaving={statusSaving}
            onRefetch={refetch}
            onEdit={() =>
              router.push(
                `/tickets/edit?id=${paramId}&from=${encodeURIComponent(backHref)}`
              )
            }
          />
        ) : null}
      </GlobalWrapper>
    );
  }

  // --------------------------------------------------- create / edit modes

  const pageTitle = createMode
    ? `New ${itemTypeMeta(initialValues.item_type).label}`
    : "Edit Item";

  const readOnlyFields = editMode && !canEditItem;

  return (
    <GlobalWrapper
      title={pageTitle}
      permissionKey={createMode ? ["add_tickets", "add_tasks"] : ["view_tickets", "view_my_tickets", "view_tasks"]}
      loading={!createMode && loading}
    >
      <Flex mb="14px">
        <Button
          size="sm"
          variant="ghost"
          colorScheme="purple"
          leftIcon={<i className="fa fa-arrow-left" />}
          onClick={() => router.push(backHref)}
        >
          Back
        </Button>
      </Flex>

      <CustomContainer title={pageTitle} filledHeader>
        {readOnlyFields ? (
          <Text fontSize="sm" color="orange.600" mb="14px">
            You can change the status of this item, but not its details.
          </Text>
        ) : null}

        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
        >
          {({
            handleSubmit: submitForm,
            resetForm,
            values,
            errors,
            touched,
            setFieldValue,
            isSubmitting,
          }) => {
            const fieldsEditable = createMode ? canCreate : canEditItem;

            return (
              <div className={styles.inputContainer}>
                {/* One column on a phone, four on a desktop — the old layout
                    squeezed four controls into a single row at any width. */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="0 22px">
                  <CustomInput
                    label="Branch"
                    placeholder="Select branch..."
                    name="outlet_id"
                    method="switch"
                    values={outletOptions}
                    editable={fieldsEditable}
                  />

                  <CustomInput
                    label="Department"
                    placeholder="Select department..."
                    name="department_id"
                    method="switch"
                    values={departmentOptions}
                    editable={fieldsEditable}
                  />
                </SimpleGrid>

                {errors.outlet_id && touched.outlet_id ? (
                  <Text color="red.500" fontSize="sm" mt="-12px" mb="14px">
                    {errors.outlet_id}
                  </Text>
                ) : null}

                <Divider mb="22px" />

                <CustomInput
                  label="Title"
                  isRequired
                  placeholder="What needs attention?"
                  name="title"
                  type="text"
                  editable={fieldsEditable}
                />

                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing="0 22px">
                  <CustomInput
                    label="Type"
                    isRequired
                    name="item_type"
                    method="switch"
                    values={ITEM_TYPE_LIST}
                    editable={fieldsEditable && createMode}
                  />

                  <CustomInput
                    label="Priority"
                    isRequired
                    name="priority"
                    method="switch"
                    values={PRIORITY_LIST}
                    editable={fieldsEditable}
                  />

                  <CustomInput
                    label="Due date"
                    placeholder="Pick a date..."
                    name="due_date"
                    method="datepicker"
                    editable={fieldsEditable}
                  />

                  {!createMode && (
                    <CustomInput
                      label="Status"
                      isRequired
                      name="status"
                      method="switch"
                      values={STATUS_LIST}
                      editable={canChangeStatus}
                    />
                  )}
                </SimpleGrid>

                <CustomInput
                  label="Assigned to"
                  placeholder="Choose someone..."
                  name="assigned_to"
                  method="searchable-dropdown"
                  values={employeeOptions(values.outlet_id)}
                  editable={fieldsEditable}
                />

                <CustomInput
                  label="Description"
                  placeholder="Add any detail that will help whoever picks this up"
                  name="description"
                  method="TextArea"
                  editable={fieldsEditable}
                />

                <CustomInput
                  label="Photos"
                  name="files"
                  method="file"
                  editable={fieldsEditable}
                  multiple
                  accept="image/*"
                  capture="environment"
                  filePlaceholder="Take a photo or choose from your gallery"
                />

                {/* Checklist steps are collected locally while creating, then
                    saved with the item; an existing item edits them live on
                    its detail page. */}
                {createMode && fieldsEditable && (
                  <Box mb="22px">
                    <Text
                      fontSize="14px"
                      color="gray"
                      fontWeight="600"
                      mb="6px"
                    >
                      Checklist
                    </Text>

                    {values.checklist.length > 0 && (
                      <Flex direction="column" gap="6px" mb="8px">
                        {values.checklist.map((step, index) => (
                          <Flex
                            key={`${step}-${index}`}
                            align="center"
                            gap="8px"
                            bg="gray.50"
                            borderRadius="6px"
                            px="10px"
                            py="8px"
                          >
                            <Text fontSize="sm" flex="1">
                              {step}
                            </Text>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() =>
                                setFieldValue(
                                  "checklist",
                                  values.checklist.filter((_, i) => i !== index)
                                )
                              }
                            >
                              Remove
                            </Button>
                          </Flex>
                        ))}
                      </Flex>
                    )}

                    <Flex gap="8px" direction={{ base: "column", sm: "row" }}>
                      <input
                        placeholder="Add a step..."
                        value={checklistDraft}
                        onChange={(event) =>
                          setChecklistDraft(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          if (!checklistDraft.trim()) return;
                          setFieldValue("checklist", [
                            ...values.checklist,
                            checklistDraft.trim(),
                          ]);
                          setChecklistDraft("");
                        }}
                        style={{
                          flex: 1,
                          height: "40px",
                          borderRadius: "6px",
                          border: "1px solid #E2E8F0",
                          padding: "0 12px",
                          fontSize: "14px",
                        }}
                      />
                      <Button
                        size="sm"
                        height="40px"
                        colorScheme="purple"
                        variant="outline"
                        isDisabled={!checklistDraft.trim()}
                        onClick={() => {
                          setFieldValue("checklist", [
                            ...values.checklist,
                            checklistDraft.trim(),
                          ]);
                          setChecklistDraft("");
                        }}
                      >
                        Add step
                      </Button>
                    </Flex>
                  </Box>
                )}

                {createMode && fieldsEditable && values.item_type === "task" && (
                  <RecurrenceFields values={values} setFieldValue={setFieldValue} />
                )}

                {(fieldsEditable || (editMode && canChangeStatus)) && (
                  <Flex
                    className={styles.buttonContainer}
                    mt={8}
                    gap="12px"
                    direction={{ base: "column-reverse", sm: "row" }}
                    justify="flex-end"
                  >
                    <Button
                      variant="outline"
                      colorScheme="gray"
                      isDisabled={isSubmitting}
                      onClick={() => resetForm()}
                    >
                      Reset
                    </Button>

                    <Button
                      colorScheme="purple"
                      isLoading={isSubmitting}
                      loadingText={createMode ? "Creating..." : "Saving..."}
                      onClick={submitForm}
                    >
                      {createMode ? "Create" : "Save changes"}
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

/** Schedule controls, shown only when a new task is marked as repeating. */
function RecurrenceFields({ values, setFieldValue }) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="10px"
      p="16px"
      mb="22px"
    >
      <Flex align="center" gap="10px" mb={values.is_recurring ? "16px" : "0"}>
        <input
          type="checkbox"
          id="is_recurring"
          checked={values.is_recurring}
          onChange={(event) =>
            setFieldValue("is_recurring", event.target.checked)
          }
          style={{ width: "18px", height: "18px" }}
        />
        <label htmlFor="is_recurring" style={{ fontSize: "14px", cursor: "pointer" }}>
          Repeat this task on a schedule
        </label>
      </Flex>

      {values.is_recurring && (
        <>
          <Text fontSize="xs" color="gray.500" mb="12px">
            A fresh copy is created automatically each time it falls due. This
            blueprint stays out of the task list.
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing="0 22px">
            <CustomInput
              label="Repeats"
              name="recurrence_frequency"
              method="switch"
              values={RECURRENCE_FREQUENCIES}
              editable
            />

            <CustomInput
              label="Every"
              name="recurrence_interval"
              method="number"
              editable
            />

            {values.recurrence_frequency === "weekly" && (
              <CustomInput
                label="On"
                name="recurrence_day_of_week"
                method="switch"
                values={WEEKDAYS}
                editable
              />
            )}

            {values.recurrence_frequency === "monthly" && (
              <CustomInput
                label="Day of month"
                name="recurrence_day_of_month"
                method="number"
                editable
              />
            )}

            <CustomInput
              label="Due after (days)"
              name="recurrence_due_in_days"
              method="number"
              editable
            />
          </SimpleGrid>
        </>
      )}
    </Box>
  );
}

export default WorkItemPage;
