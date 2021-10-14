import React from "react";

import styles from "./resignedUser.module.css";
import { toast } from "react-toastify";

import { CloseIcon } from "@chakra-ui/icons";
import { Container, Button, Switch } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import OutletHelper from "../../helper/outlets";
import CustomInput from "../customInput/customInput";
import { BranchValidation } from "../../util/validation";
import { Reason } from "../../constants/values";

export default class ResignedUser extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            toggle: false,
            isLoading: false,
          
        };
    }

    render() {
        const { setVisibility, setData } = this.props;
        const { toggle, isLoading, reason, reason_type, resignation_date } = this.state;
        return (
            <Formik
                initialValues={{
                    reason: this.props.data[0]?.reason,
                    reason_type: this.props.data[0]?.reason_type,
                    resignation_date: this.props.data[0]?.resignation_date,
                }}
                validationSchema={BranchValidation}
                onSubmit={(values) => {
                    this.updateOutlet(values);
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
                                        Resignation Details
                                    </h3>

                                    <div className={styles.inputHolder}>
                                        {/* <label htmlFor="reason" className={styles.label}>Reason Type</label>
                                        <p id="reason">{reason_type}</p> */}
                                        <CustomInput 
                                            label="Reason Type"
                                            name="reason_type"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.textAreaHolder}>
                                    {/* <label htmlFor="reason" className={styles.label}>Reason</label>
                                        <p id="reason">{reason}</p> */}
                                        <CustomInput 
                                            label="Reason"
                                            name="reason"
                                            type="text"
                                            method="TextArea"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                    {/* <label htmlFor="reason" className={styles.label}>Resignation Date</label>
                                        <p id="reason">{resignation_date}</p> */}
                                        <CustomInput 
                                          label="Resignation Date"
                                          name="resignation_date"
                                          type="text"
                                        /> 
                                    </div>
                                    <Button
                                        className={styles.updateButton}
                                        style={{width: "97%"}}
                                        isLoading={isLoading}
                                        colorScheme="purple"
                                        loadingText="Updating"
                                        onClick={() =>  setVisibility(false)}
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
