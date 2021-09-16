//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, ButtonGroup, Button } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../styles/registration.module.css";

//Internal Dependencies
import CustomInput from "../components/customInput/customInput";
import Head from "../util/head";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";
import { CompanyDetailsValidation } from "../util/validation";

class CompanyDetails extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loadingCompany: false,
            editCompany: false,
        };
    }

    save() {
        const { editCompany } = this.state;
        editCompany ? "" : toast.success("Successfully Saved!");
    }

    render() {
        const { loadingCompany, editCompany } = this.state;

        return (
            <GlobalWrapper title="Company Details">
                <Head />
                <Formik
                    initialValues={{
                        company_name: "Company",
                        address: "Vadapalani, Chennai - 6000093, Tamil Nadu",
                        contact_number: "1234567890",
                        gst: "12343",
                        tan: "2324235",
                        pan: "1232143",
                        esi: "123124",
                        ps: "23",
                    }}
                    validationSchema={CompanyDetailsValidation}
                    onSubmit={() => {
                        this.save();
                    }}
                >
                    {(formikProps) => {
                        const { handleSubmit } = formikProps;
                        return (
                            <Form>
                                <FormikErrorFocus
                                    align={"middle"}
                                    ease={"linear"}
                                    duration={200}
                                />
                                <Container
                                    className={styles.container}
                                    pb={"40px"}
                                    boxShadow="lg"
                                >
                                    <p className={styles.buttoninputHolder}>
                                        <div>Company Information</div>
                                        <div style={{ paddingRight: 10 }}>
                                            <Button
                                                isLoading={loadingCompany}
                                                variant="outline"
                                                leftIcon={
                                                    editCompany ? (
                                                        <i
                                                            class="fa fa-floppy-o"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <i
                                                            class="fa fa-pencil"
                                                            aria-hidden="true"
                                                        />
                                                    )
                                                }
                                                colorScheme="purple"
                                                onClick={() => {
                                                    this.setState({
                                                        editCompany:
                                                            !editCompany,
                                                    });
                                                    handleSubmit();
                                                }}
                                            >
                                                {editCompany ? "Save" : "Edit"}
                                            </Button>
                                        </div>
                                    </p>

                                    <div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Company Name *"
                                                name="company_name"
                                                type="text"
                                                editable={editCompany}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Reg Address *"
                                                name="address"
                                                type="text"
                                                method="TextArea"
                                                editable={editCompany}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Contact Number *"
                                                name="contact_number"
                                                type="text"
                                                editable={editCompany}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="GST Number *"
                                                name="gst"
                                                type="text"
                                                editable={editCompany}
                                            />
                                            <CustomInput
                                                label="TAN Number *"
                                                name="tan"
                                                type="text"
                                                editable={editCompany}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="PAN Number *"
                                                name="pan"
                                                type="text"
                                                editable={editCompany}
                                            />
                                            <div
                                                className={`${styles.inputHolder} ${styles.hidden}`}
                                            >
                                                <CustomInput
                                                    label="PAN Number *"
                                                    name="pan"
                                                    type="text"
                                                    editable={editCompany}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="ESI Number *"
                                                name="esi"
                                                type="text"
                                                editable={editCompany}
                                            />
                                            <CustomInput
                                                label="PS Number *"
                                                name="ps"
                                                type="text"
                                                editable={editCompany}
                                            />
                                        </div>
                                    </div>
                                </Container>
                            </Form>
                        );
                    }}
                </Formik>
            </GlobalWrapper>
        );
    }
}

export default withRouter(CompanyDetails);
