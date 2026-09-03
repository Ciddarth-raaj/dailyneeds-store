//External Dependencies
import { Formik, Form } from "formik";
import { Button } from "@chakra-ui/react";
import React from "react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../../components/designation/designationForm.module.css";

//Internal Dependencies
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { DesignationValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";
import DesignationHelper from "../../helper/designation";
import CustomContainer from "../../components/CustomContainer";
import PermissionMatrix from "../../components/designation/PermissionMatrix";

//Constants
import {
  TOTAL_PERMISSION_COUNT,
  countEnabledPermissions,
} from "../../util/permissionCatalog";

class CreateDesignation extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      checkedItems: false,
      permissions: [],
      data: [],
      id: null,
    };
  }

  componentDidMount() {
    this.fetchRecord();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.router.query.id !== this.props.router.query.id) {
      this.fetchRecord();
    }
  }

  fetchRecord() {
    const recordId = this.props.router.query.id;
    if (!recordId || recordId === "create") {
      this.setState({ data: [], id: null, permissions: [] });
      return;
    }
    DesignationHelper.getDesignationById(recordId)
      .then((data) => {
        const permissions = (data.permissions || []).map(
          (item) => item.permission_key
        );
        this.setState({
          data: data.designations || [],
          id: data.designations?.[0]?.designation_id ?? null,
          permissions,
        });
      })
      .catch((err) => console.log(err));
  }

  createDesignation(values) {
    const { permissions } = this.state;
    const { router } = this.props;
    this.setState({ loading: true });
    DesignationHelper.createDesignation({ ...values, permissions })
      .then((data) => {
        console.log(data);
        if (data.code == 200) {
          toast.success("Successfully Creating Designation!");
          router.push("/designation");
        } else {
          throw `${data.msg}`;
        }
      })
      .catch((err) => {
        console.log(err);
        toast.error("Error Creating Designation!");
      })
      .finally(() => this.setState({ loading: false }));
  }

  updateDesignation(values) {
    const { designation_id } = this.state.data[0];
    const { router } = this.props;
    const { permissions } = this.state;

    this.setState({ loading: true });
    DesignationHelper.updateDesignation({
      designation_id: designation_id,
      designation_details: values,
      permissions,
    })
      .then((data) => {
        if (data.code === 200) {
          toast.success("Successfully Updated Designation!");
          router.push("/designation");
        } else {
          toast.error("Error Updating Designation!");
          throw `${data.msg}`;
        }
      })
      .catch((err) => console.log(err))
      .finally(() => this.setState({ loading: false }));
  }

  handleCheckbox = (key, checked) => {
    this.setState((prev) => {
      const { permissions } = prev;
      if (checked) {
        if (permissions.includes(key)) return null;
        return { permissions: [...permissions, key] };
      }
      if (!permissions.includes(key)) return null;
      return { permissions: permissions.filter((v) => v !== key) };
    });
  };

  /** Select all / clear all for a single module, keeping every other key intact. */
  handleModuleCheckbox = (keys, checked) => {
    this.setState((prev) => {
      const { permissions } = prev;
      if (checked) {
        const missing = keys.filter((key) => !permissions.includes(key));
        if (!missing.length) return null;
        return { permissions: [...permissions, ...missing] };
      }
      const removable = new Set(keys);
      if (!permissions.some((key) => removable.has(key))) return null;
      return { permissions: permissions.filter((key) => !removable.has(key)) };
    });
  };

  render() {
    const { loading, id, permissions } = this.state;
    const enabledCount = countEnabledPermissions(permissions);

    return (
      <GlobalWrapper title="Designation">
        <Formik
          enableReinitialize
          initialValues={{
            designation_name: this.state.data[0]?.designation_name,
            status: 1,
            online_portal: this.state.data[0]?.online_portal,
            login_access: this.state.data[0]?.login_access,
          }}
          validationSchema={DesignationValidation}
          onSubmit={(values) => {
            id !== null
              ? this.updateDesignation(values)
              : this.createDesignation(values);
          }}
        >
          {(formikProps) => {
            const { handleSubmit } = formikProps;
            return (
              <Form onSubmit={formikProps.handleSubmit}>
                <FormikErrorFocus
                  align={"middle"}
                  ease={"linear"}
                  duration={200}
                />

                <div className={styles.formWrapper}>
                  <CustomContainer
                    title={
                      id !== null ? "Update Designation" : "Add New Designation"
                    }
                    filledHeader
                    smallHeader
                    size="xs"
                  >
                    <div className={styles.detailsGrid}>
                      <CustomInput
                        label="Designation Name"
                        name="designation_name"
                        type="text"
                        containerStyle={{ padding: 0 }}
                        ignoreMarginBottom
                      />
                      <CustomInput
                        label="Online Access"
                        name="online_portal"
                        values={[
                          {
                            id: 1,
                            value: "Grant Access",
                          },
                          {
                            id: 0,
                            value: "Discard Access",
                          },
                        ]}
                        type="text"
                        method="switch"
                        containerStyle={{ padding: 0 }}
                        ignoreMarginBottom
                      />
                      <CustomInput
                        label="Login Access"
                        name="login_access"
                        values={[
                          {
                            id: 1,
                            value: "Grant Access",
                          },
                          {
                            id: 0,
                            value: "Discard Access",
                          },
                        ]}
                        type="text"
                        method="switch"
                        containerStyle={{ padding: 0 }}
                        ignoreMarginBottom
                      />
                    </div>
                  </CustomContainer>

                  <CustomContainer
                    title="Permissions"
                    subtitle="Enable the actions this designation is allowed to perform"
                    subtleHeader
                    smallHeader
                    size="xs"
                  >
                    <PermissionMatrix
                      permissions={permissions}
                      onToggle={this.handleCheckbox}
                      onToggleModule={this.handleModuleCheckbox}
                    />
                  </CustomContainer>

                  <div className={styles.stickyBar}>
                    <span className={styles.stickyBarSummary}>
                      <span className={styles.stickyBarCount}>
                        {enabledCount} of {TOTAL_PERMISSION_COUNT}
                      </span>{" "}
                      permissions enabled
                    </span>

                    <div className={styles.stickyBarActions}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => this.props.router.push("/designation")}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        isLoading={loading}
                        loadingText="Submitting"
                        colorScheme="purple"
                        onClick={() => handleSubmit()}
                      >
                        {id !== null ? "Save Changes" : "Create"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Form>
            );
          }}
        </Formik>
      </GlobalWrapper>
    );
  }
}

export default withRouter(CreateDesignation);
