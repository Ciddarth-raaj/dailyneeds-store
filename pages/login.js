import React from "react";

import styles from "../styles/login.module.css";
import { toast } from "react-toastify";

import { CloseIcon } from "@chakra-ui/icons";
import LoginHelper from "../helper/login";
import { Container, Button, Switch } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import CustomInput from "../components/customInput/customInput";
import { BranchValidation } from "../util/validation";
import { withUser } from "../hocs/withUser";

class LogIn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      toggle: false,
      isLoading: false,
      show: true,
      token: "",
    };
  }
  login(values) {
    const { userContext } = this.props;

    LoginHelper.login(values.username, values.password)
      .then((data) => {
        if (data.code === 400) {
          toast.error(`${data.msg}`);
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

          this.props.setVisibility(true);
        }
      })
      .catch((err) => console.log(err));
  }
  render() {
    const { setVisibility } = this.props;
    const { toggle, isLoading, show, token } = this.state;
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
                    <img src={"/assets/dnds-logo.png"} />
                  </h3>

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
                  <Button
                    className={styles.updateButton}
                    style={{ width: "97%", marginBottom: "25px" }}
                    isLoading={isLoading}
                    colorScheme="purple"
                    loadingText="Updating"
                    onClick={() => handleSubmit()}
                  >
                    Login
                  </Button>
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
