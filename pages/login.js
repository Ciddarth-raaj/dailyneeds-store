import React from "react";

import styles from "../styles/login.module.css";
import { toast } from "react-toastify";

import { CloseIcon } from "@chakra-ui/icons";
import LoginHelper from "../helper/login";
import { Container, Button, Switch } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import CustomInput from "../components/customInput/customInput";
import { BranchValidation } from "../util/validation";

export default class LogIn extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            toggle: false,
            isLoading: false,
            show: true,
            token: ''
        };
    }
    login(values) {
        LoginHelper.login(values.username, values.password)
            .then((data) => {
                localStorage.setItem('Token', data.data.token);
                localStorage.setItem('Store_id', data.data.store_id);
                localStorage.setItem('Designation_id', data.data.designation_id);
                localStorage.setItem('Employee_id', data.data.employee_id);

                window.location = '/';
            })
            .catch((err) => console.log(err))
    }
    render() {
        const { setVisibility } = this.props;
        const { toggle, isLoading, show, token } = this.state;
        return (
            <Formik
                initialValues={{
                    username: '',
                    password: '',
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
                                    <CloseIcon
                                        className={styles.closeButton}
                                        color="red"
                                        onClick={() => setVisibility(false)}
                                    />

                                    <h3 className={styles.title}>
                                        LOGIN
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
                                            type={show !== true ? 'text' : 'password'}
                                            onClick={() => this.setState({ show: !show })}
                                            method='password'
                                        />
                                    </div>
                                    <Button
                                        className={styles.updateButton}
                                        style={{width: "97%"}}
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
