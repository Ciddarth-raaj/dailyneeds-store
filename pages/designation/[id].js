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
  Box,
  Text,
  VStack,
  Divider,
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
import MENUS from "../../constants/menus";

class CreateDesignation extends React.Component {
  constructor(props) {
    super(props);

    const permissions = props.permissions.map((item) => item.permission_key);

    this.state = {
      loading: false,
      checkedItems: false,
      permissions: permissions ?? [],
    };
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
    const { designation_id } = this.props.data[0];
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

  handleCheckbox(key, checked) {
    let { permissions } = this.state;

    if (permissions.includes(key) && !checked) {
      const index = permissions.findIndex((v) => v == key);
      permissions.splice(index, 1);
    } else {
      permissions.push(key);
    }

    this.setState({ permissions });
  }

  render() {
    const { loading } = this.state;
    const { id } = this.props;
    return (
      <GlobalWrapper title="Designation">
        <Formik
          initialValues={{
            designation_name: this.props.data[0]?.designation_name,
            status: 1,
            online_portal: this.props.data[0]?.online_portal,
            login_access: this.props.data[0]?.login_access,
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
                        {Object.keys(PERMISSIONS).map((menuKey) => {
                          const menuPermissions = PERMISSIONS[menuKey];
                          const menuTitle = MENUS[menuKey]?.title || menuKey;
                          const permissionKeys = Object.keys(
                            menuPermissions
                          ).filter(
                            (key) => menuPermissions[key] // Filter out empty objects
                          );

                          if (permissionKeys.length === 0) return null;

                          return (
                            <CustomContainer
                              key={menuKey}
                              title={menuTitle}
                              subtleHeader
                              smallHeader
                            >
                              <Grid
                                templateColumns="repeat(3, 1fr)"
                                gap={6}
                                pl={4}
                              >
                                {permissionKeys.map((key) => (
                                  <Checkbox
                                    key={key}
                                    isChecked={this.state.permissions.includes(
                                      key
                                    )}
                                    onChange={(e) =>
                                      this.handleCheckbox(key, e.target.checked)
                                    }
                                  >
                                    {menuPermissions[key]}
                                  </Checkbox>
                                ))}
                              </Grid>
                            </CustomContainer>
                          );
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

export async function getServerSideProps(context) {
  var data = [];
  if (context.query.id !== "create") {
    data = await DesignationHelper.getDesignationById(context.query.id);
  }

  const id =
    context.query.id != "create" ? data.designations[0].designation_id : null;
  return {
    props: { data: data.designations, permissions: data.permissions, id },
  };
}

export default withRouter(CreateDesignation);
