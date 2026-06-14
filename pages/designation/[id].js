//External Dependencies
import { Formik, Form } from "formik";
import {
  Flex,
  Container,
  ButtonGroup,
  Button,
  CheckboxGroup,
  Grid,
  Checkbox,
  Text,
  VStack,
} from "@chakra-ui/react";
import React from "react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../../styles/create.module.css";

//Internal Dependencies
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { DesignationValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";
import DesignationHelper from "../../helper/designation";
import CustomContainer from "../../components/CustomContainer";

//Constants
import { PERMISSIONS } from "../../constants/permissions";
import MENUS, { MENU_MODULES } from "../../constants/menus";

function isNestedPermissionGroup(menuPermissions) {
  const values = Object.values(menuPermissions || {});
  if (!values.length) return false;
  return values.every((v) => typeof v === "object" && v !== null);
}

function renderPermissionCheckboxes(menuPermissions, permissions, handleCheckbox) {
  return Object.keys(menuPermissions)
    .filter((key) => menuPermissions[key])
    .map((key) => (
      <Checkbox
        key={key}
        isChecked={permissions.includes(key)}
        onChange={(e) => handleCheckbox(key, e.target.checked)}
      >
        {menuPermissions[key]}
      </Checkbox>
    ));
}

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

  render() {
    const { loading } = this.state;
    const { id } = this.state;
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

                <CustomContainer
                  title={
                    id !== null ? "Update Designation" : "Add New Designation"
                  }
                  filledHeader
                  smallHeader
                >
                  <div className={styles.wrapper}>
                    <div className={styles.inputHolder}>
                      <CustomInput
                        label="Designation Name"
                        name="designation_name"
                        type="text"
                      />
                      {/* <CustomInput
												label="Status"
												values={[
													{
														id: 1,
														value: "Active",
													},
													{
														id: 0,
														value: "Inactive",
													},
												]}
												name="status"
												type="text"
												method="switch"
											/> */}
                    </div>
                    <div className={styles.inputHolder}>
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
                      />
                    </div>
                    {/* <CheckboxGroup defaultValue={["dashboard"]}> */}
                    <CheckboxGroup>
                      {/* <Checkbox></Checkbox> */}
                      <VStack align="stretch" spacing={10} w="100%">
                        {Object.keys(PERMISSIONS).flatMap((menuKey) => {
                          const menuPermissions = PERMISSIONS[menuKey];
                          const menuTitle =
                            MENUS[menuKey]?.title ||
                            (menuKey === "gst" ? "GST" : menuKey);
                          const nested = isNestedPermissionGroup(menuPermissions);
                          const sectionColorScheme =
                            menuKey === "gst" ? "blue" : "purple";

                          if (nested) {
                            return Object.keys(menuPermissions)
                              .filter((groupKey) => menuPermissions[groupKey])
                              .map((groupKey) => {
                                const groupPerms = menuPermissions[groupKey];
                                const groupTitle =
                                  MENU_MODULES[menuKey]?.menu?.[groupKey]
                                    ?.title || groupKey;
                                const groupKeys = Object.keys(groupPerms).filter(
                                  (key) => groupPerms[key]
                                );

                                if (!groupKeys.length) return null;

                                return (
                                  <CustomContainer
                                    key={`${menuKey}-${groupKey}`}
                                    title={`${menuTitle} - ${groupTitle}`}
                                    subtleHeader
                                    smallHeader
                                    colorScheme={sectionColorScheme}
                                  >
                                    <Grid
                                      templateColumns="repeat(3, 1fr)"
                                      gap={6}
                                      pl={4}
                                    >
                                      {renderPermissionCheckboxes(
                                        groupPerms,
                                        this.state.permissions,
                                        this.handleCheckbox
                                      )}
                                    </Grid>
                                  </CustomContainer>
                                );
                              })
                              .filter(Boolean);
                          }

                          const permissionKeys = Object.keys(
                            menuPermissions
                          ).filter((key) => menuPermissions[key]);

                          if (permissionKeys.length === 0) return [];

                          return [
                            <CustomContainer
                              key={menuKey}
                              title={menuTitle}
                              subtleHeader
                              smallHeader
                              colorScheme={sectionColorScheme}
                            >
                              <Grid
                                templateColumns="repeat(3, 1fr)"
                                gap={6}
                                pl={4}
                              >
                                {renderPermissionCheckboxes(
                                  menuPermissions,
                                  this.state.permissions,
                                  this.handleCheckbox
                                )}
                              </Grid>
                            </CustomContainer>,
                          ];
                        })}
                      </VStack>
                    </CheckboxGroup>

                    <ButtonGroup
                      mt={10}
                      spacing="6"
                      style={{
                        width: "100%",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button>Cancel</Button>
                      <Button
                        isLoading={loading}
                        loadingText="Submitting"
                        colorScheme="purple"
                        onClick={() => handleSubmit()}
                      >
                        {id !== null ? "Update" : "Create"}
                      </Button>
                    </ButtonGroup>
                  </div>
                </CustomContainer>
              </Form>
            );
          }}
        </Formik>
      </GlobalWrapper>
    );
  }
}

export default withRouter(CreateDesignation);
