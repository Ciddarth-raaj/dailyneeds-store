/* eslint-disable @next/next/no-img-element */
import React from "react";

import styles from "../styles/login.module.css";
import { toast } from "react-toastify";

import { CloseIcon } from "@chakra-ui/icons";
import LoginHelper from "../helper/login";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Container,
  Button,
  Switch,
  Flex,
} from "@chakra-ui/react";
import { Formik, Form } from "formik";
import CustomInput from "../components/customInput/customInput";
import { BranchValidation } from "../util/validation";
import { withUser } from "../hocs/withUser";

const IP_BLOCKED_MESSAGE =
  "This account can only be used from an approved network. Please sign in from your store's connection, or ask an admin to allow this network.";

class LogIn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      toggle: false,
      isLoading: false,
      show: true,
      token: "",
      blockedIp: null,
    };
  }

  componentDidMount() {
    // A session cut off mid-use lands back here with the reason in the URL;
    // without this the user just sees an empty form and retries a password
    // that was never wrong.
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("blocked") === "ip") {
      this.setState({ blockedIp: params.get("ip") || "" });
      toast.error(IP_BLOCKED_MESSAGE);
    }
  }

  login(values) {
    const { userContext } = this.props;

    LoginHelper.login(values.username, values.password)
      .then((data) => {
        if (data.code === 400) {
          toast.error(`${data.msg}`);
        }
        if (data.code === 403 && data.error === "IP_NOT_ALLOWED") {
          this.setState({ blockedIp: data.ip || "" });
          toast.error(data.msg || IP_BLOCKED_MESSAGE);
          return;
        }
        if (data.data.code === 200) {
          userContext.updateUserConfig({
            token: data.data.token,
            storeId: data.data.store_id,
            designationId: data.data.designation_id,
            userType: data.data.user_type,
            employeeId: data.data.employee_id,
          });

          // Still set these since they're not in userContext
          global.config.name = data.data.name;
          global.config.designation = data.data.designation;
          global.config.employee_image = data.data.employee_image;

          window.location.href = "/";
        }
      })
      .catch((err) => console.log(err));
  }

  render() {
    const { setVisibility } = this.props;
    const { toggle, isLoading, show, token, blockedIp } = this.state;
    return (
      <Formik
        initialValues={{
          username: "",
          password: "",
        }}
        onSubmit={(values) => {
          this.login(values);
        }}
      >
        {(formikProps) => {
          const { handleSubmit, values } = formikProps;
          return (
            <Form onSubmit={formikProps.handleSubmit}>
              <Container className={styles.mainWrapper}>
                <div
                  className={styles.wrapper}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className={styles.title}>
                    <img src={"/assets/dnds-logo.png"} alt="logo" />
                  </h3>

                  {blockedIp !== null && (
                    <Alert
                      status="error"
                      borderRadius="md"
                      marginBottom="16px"
                      alignItems="flex-start"
                    >
                      <AlertIcon />
                      <Box fontSize="13px">
                        <AlertTitle fontSize="14px">
                          Network not allowed
                        </AlertTitle>
                        <AlertDescription display="block">
                          {IP_BLOCKED_MESSAGE}
                          {blockedIp ? ` Your current IP is ${blockedIp}.` : ""}
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  <div className={styles.inputHolder}>
                    <CustomInput
                      label="User Name"
                      name="username"
                      type="text"
                    />
                  </div>
                  <div className={styles.inputHolder}>
                    <CustomInput
                      label="Password"
                      name="password"
                      type={!show ? "text" : "password"}
                      onClick={() => this.setState({ show: !show })}
                      method="password"
                      autocapitalize="none"
                    />
                  </div>

                  <Flex justifyContent="center">
                    <Button
                      className={styles.updateButton}
                      isLoading={isLoading}
                      colorScheme="purple"
                      loadingText="Updating"
                      onClick={() => handleSubmit()}
                    >
                      Login
                    </Button>
                  </Flex>
                </div>
              </Container>
            </Form>
          );
        }}
      </Formik>
    );
  }
}

export default withUser(LogIn);
