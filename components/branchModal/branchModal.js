import React from "react";

import styles from "./branchModal.module.css";
import { toast } from "react-toastify";

import { CloseIcon } from "@chakra-ui/icons";
import { Container, Button, Switch } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import OutletHelper from "../../helper/outlets";
import CustomInput from "../customInput/customInput";
import { BranchValidation } from "../../util/validation";

export default class BranchModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            toggle: false,
            isLoading: false,
        };
    }

    updateOutlet(values) {
		OutletHelper.updateOutlet({
			outlet_id: this.props.data.outlet_id,
            outlet_details: values
		})
			.then((data) => {
			   if(data.code === 200) {
				   toast.success("Successfully updated Branch");
			   } else {
				   toast.error("Error updating Branch")
			   }
			})
			.catch((err) => console.log(err));
	}
    render() {
        const { setVisibility } = this.props;
        const { toggle, isLoading } = this.state;
        return (
            <Formik
                initialValues={{
                    outlet_name: this.props.data?.outlet_name,
                    outlet_nickname: this.props.data?.outlet_nickname,
                    outlet_phone: this.props.data?.outlet_phone,
                    phone: this.props.data?.phone,
                    outlet_address: this.props.data?.outlet_address,
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
                                        Edit Branch Details
                                    </h3>

                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Brand Name"
                                            name="outlet_name"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Brand Nickname"
                                            name="outlet_nickname"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Contact Number"
                                            name="outlet_phone"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Phone Numbers (Separated by ,)"
                                            name="phone"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Address"
                                            name="outlet_address"
                                            type="text"
                                            method="TextArea"
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
