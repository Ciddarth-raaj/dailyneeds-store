import React, { useMemo, useState } from "react";
import CustomContainer from "../../CustomContainer";
import { Formik } from "formik";
import CustomInput from "../../customInput/customInput";
import {
  EMPTY_ACCOUNT_OBJECT,
  MODIFIED_PEOPLE_TYPES,
} from "../../../constants/accounts";
import { PAYMENT_TYPES_ACCOUNTS } from "../../../constants/values";
import styles from "../../../styles/master.module.css";
import { Button, IconButton } from "@chakra-ui/button";
import usePeople from "../../../customHooks/usePeople";
import { useUser } from "../../../contexts/UserContext";
import Table from "../../table/table";
import { Menu, MenuItem } from "@szhsin/react-menu";
import {
  createWarehouseSale,
  deleteWarehouseSale,
  updateWarehouseSale,
} from "../../../helper/accounts";
import toast from "react-hot-toast";
import useWarehouseSales from "../../../customHooks/useWarehouseSales";
import currencyFormatter from "../../../util/currencyFormatter";
import { useConfirmation } from "../../../hooks/useConfirmation";
import CashDenominationForm from "./CashDenominationForm";
import useEmployees from "../../../customHooks/useEmployees";
import { CASHIER_DESIGNATION } from "../../../constants/designations";

const HEADING = {
  person_type: "Type",
  payment_type: "Payment Type",
  person_id: "Name",
  description: "Narration",
  amount: "Amount",
  receipt: "Receipt",
  actions: "Actions",
};

const EMPTY_WAREHOUSE_OBJECT = {
  ...EMPTY_ACCOUNT_OBJECT,
  date: new Date(),
};

function WarehouseForm() {
  const { confirm } = useConfirmation();
  const { storeId } = useUser().userConfig;
  const { peopleList } = usePeople();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { employees } = useEmployees({
    store_ids: storeId === null ? [] : [storeId],
    designation_ids: [],
  });

  const EMPLOYEES_MENU = employees.map((item) => ({
    id: item.employee_id,
    value: item.employee_name,
  }));

  const filters = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [selectedDate]);

  const { sales, refetch } = useWarehouseSales(filters);

  const [initialValues, setInitialValues] = useState(EMPTY_WAREHOUSE_OBJECT);
  const [isEditing, setIsEditing] = useState(false);

  const editable = true;
  const isSaved = false;

  const SALES_ROWS = sales.map((item) => {
    const person_type = MODIFIED_PEOPLE_TYPES.find(
      (type) => type.id == item.person_type
    );

    const payment_type = PAYMENT_TYPES_ACCOUNTS.find(
      (type) => type.id == item.payment_type
    );

    const person_name = peopleList.find(
      (person) => person.person_id == item.person_id
    );

    const handleStartEdit = (item) => {
      setIsEditing(true);
      setInitialValues(item);
    };

    return {
      ...item,
      person_type: person_type?.value ?? "N/A",
      payment_type: payment_type?.value ?? "N/A",
      person_id: person_name?.name ?? "N/A",
      amount: currencyFormatter(item.amount),
      actions: (
        <Menu
          align="end"
          gap={5}
          menuButton={
            <IconButton
              disabled={isSaved}
              variant="ghost"
              colorScheme="purple"
              icon={<i className={`fa fa-ellipsis-v`} />}
            />
          }
          transition
        >
          <MenuItem onClick={() => handleStartEdit(item)}>Edit</MenuItem>
          <MenuItem onClick={() => handleDelete(item.sales_id)}>
            Delete
          </MenuItem>
        </Menu>
      ),
    };
  });

  const getPeopleList = (personType) => {
    if (personType === undefined) {
      return [];
    }

    if (personType == 5) {
      return EMPLOYEES_MENU;
    }

    return peopleList.map((item) => ({ id: item.person_id, value: item.name }));
  };

  const onSubmit = (values, resetForm) => {
    if (isEditing) {
      handleUpdate(values, resetForm);
    } else {
      handleSave(values, resetForm);
    }
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm(
      "Are you sure? You can't undo this action afterwards.",
      {
        title: "Delete",
        type: "error",
        confirmText: "Delete",
      }
    );

    if (!shouldDelete) {
      return;
    }

    toast.promise(deleteWarehouseSale(id), {
      loading: "Deleting...",
      success: (response) => {
        if (response.code == 200) {
          refetch();
          return "Deleted successfully";
        } else {
          throw "error";
        }
      },
      error: (err) => {
        console.error(err);
        return "Error deleting sales";
      },
    });
  };

  const handleUpdate = (values, resetForm) => {
    try {
      const params = {
        ...values,
        receipt_path: null,
      };

      const salesId = params.sales_id;
      delete params.receipt;
      delete params.sales_id;
      delete params.person_name;

      toast.promise(updateWarehouseSale(salesId, params), {
        loading: "Updating...",
        success: (response) => {
          if (response.code == 200) {
            setInitialValues(EMPTY_WAREHOUSE_OBJECT);
            setIsEditing(false);
            refetch();
            resetForm();
          } else {
            throw "error";
          }

          return "Updated successfully";
        },
        error: (err) => {
          console.error(err);
          return "Error updating sales";
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async (values, resetForm) => {
    try {
      const params = {
        ...values,
        receipt_path: null,
      };

      delete params.receipt;

      toast.promise(createWarehouseSale(params), {
        loading: "Saving...",
        success: (response) => {
          if (response.code == 200) {
            refetch();
            resetForm();
          } else {
            throw "error";
          }

          return "Saved successfully";
        },
        error: (err) => {
          console.error(err);
          return "Error saving sales";
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className={styles.formContainer}>
        <CustomContainer
          title="Add New Account Sheet"
          filledHeader
          style={{ flex: 2 }}
        >
          <Formik
            enableReinitialize
            initialValues={initialValues}
            // validationSchema={ACCOUNT_VALIDATION_SCHEMA}
            onSubmit={(values, { resetForm }) => onSubmit(values, resetForm)}
          >
            {(formikProps) => {
              const { values, handleSubmit, resetForm } = formikProps;
              return (
                <div>
                  <div className={styles.inputSubContainer}>
                    <CustomInput
                      label="Date *"
                      name="date"
                      type="date"
                      method="datepicker"
                      editable={editable}
                      disabled={isSaved}
                      onChange={(val) => setSelectedDate(val)}
                    />
                    <CustomInput
                      label="Type *"
                      name={`person_type`}
                      type="number"
                      values={MODIFIED_PEOPLE_TYPES}
                      method="switch"
                      editable={editable}
                      disabled={isSaved}
                    />
                  </div>

                  <div className={styles.inputSubContainer}>
                    <CustomInput
                      label="Payment Type *"
                      name={`payment_type`}
                      type="number"
                      values={PAYMENT_TYPES_ACCOUNTS}
                      method="switch"
                      editable={editable}
                      disabled={isSaved}
                    />

                    <CustomInput
                      label="Name *"
                      name={`person_id`}
                      type="number"
                      values={getPeopleList(values.person_type)}
                      method="switch"
                      editable={editable}
                      disabled={isSaved}
                    />
                  </div>

                  <div className={styles.inputSubContainer}>
                    <CustomInput
                      label="Narration *"
                      name={`description`}
                      type="text"
                      editable={editable}
                      disabled={isSaved}
                    />

                    <CustomInput
                      label="Amount *"
                      name={`amount`}
                      type="number"
                      editable={editable}
                      disabled={isSaved}
                    />
                  </div>

                  <CustomInput
                    label="Receipt"
                    name={`receipt`}
                    method="file"
                    editable={editable}
                    disabled={isSaved}
                  />

                  <div className={styles.buttonContainer}>
                    <Button
                      onClick={() => {
                        setInitialValues(EMPTY_WAREHOUSE_OBJECT);
                        resetForm();
                        setIsEditing(false);
                      }}
                      colorScheme="purple"
                      variant="outline"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={() => {
                        handleSubmit(values, resetForm);
                      }}
                      colorScheme="purple"
                    >
                      {isEditing ? "Update" : "Save"}
                    </Button>
                  </div>
                </div>
              );
            }}
          </Formik>
        </CustomContainer>

        <CashDenominationForm
          isSaved={isSaved}
          editable={editable}
          selectedDate={selectedDate}
        />
      </div>

      <div style={{ marginTop: "22px" }}>
        <CustomContainer title="List of Payment and Receipts" smallHeader>
          <Table heading={HEADING} rows={SALES_ROWS} />
        </CustomContainer>
      </div>
    </>
  );
}

export default WarehouseForm;
