import React from "react";

import styles from "./branchModal.module.css";
import { toast } from "react-toastify";

import { CloseIcon } from "@chakra-ui/icons";
import { Container, Button, Switch } from "@chakra-ui/react";
import { Formik, Form } from "formik";

import CustomInput from "../customInput/customInput";
import { BranchValidation } from "../../util/validation";

const initialValue = {
    brand_name: "adidas",
    brand_nickname: "adidas",
    contact_number: "1234567890",
    phone_number: "1234567890",
    address: "Vadapalani",
};

export default class BranchModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            toggle: false,
            isLoading: false,
        };
    }

    update() {
        toast.success("Successfully Updated!");
        this.props.setVisibility(false);
    }

    render() {
        console.log(this.props.data)
        const { setVisibility } = this.props;
        const { toggle, isLoading } = this.state;
        return (
            <Formik
                initialValues={initialValue}
                validationSchema={BranchValidation}
                onSubmit={() => {
                    this.update();
                }}
            >
                {(formikProps) => {
                    const { handleSubmit } = formikProps;
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
                                        Edit Branch Details
                                    </h3>

                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Brand Name"
                                            name="brand_name"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Brand Nickname"
                                            name="brand_nickname"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Contact Number"
                                            name="contact_number"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Phone Numbers (Separated by ,)"
                                            name="phone_number"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Address"
                                            name="address"
                                            type="text"
                                            method="TextArea"
                                        />
                                    </div>
                                    <div className={styles.switchHolder}>
                                        <Switch
                                            className={styles.switch}
                                            colorScheme="purple"
                                            size="lg"
                                            onChange={() =>
                                                this.setState({
                                                    toggle: !toggle,
                                                })
                                            }
                                        />
                                    </div>
                                    <Button
                                        isLoading={isLoading}
                                        colorScheme="purple"
                                        loadingText="Updating"
                                        onClick={() => handleSubmit()}
                                    >
                                        Update
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
