//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, ButtonGroup, Button } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../styles/registration.module.css";

//helper
import CompanyHelper from "../helper/company";

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
			loading: false,
            editCompany: false,
        };
    }

    createCompany(values) {
        const { router } = this.props;
		this.setState({ loading: true });
		CompanyHelper.createCompany(values)
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Added Company!");
				} else {
					toast.error("Error creating Company!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }),
                                router.push("/"));
	}

    render() {
        const { loadingCompany, loading, editCompany } = this.state;

        return (
            <GlobalWrapper title="Company Details">
                <Head />
                <Formik
                    initialValues={{
                        company_name: "",
                        reg_address: "",
                        contact_number: "",
                        gst_number: "",
                        tan_number: "",
                        pan_number: "",
                        esi_number: "",
                        pf_number: "",
                    }}
                    validationSchema={CompanyDetailsValidation}
                    onSubmit={(values) => {
                        this.createCompany(values);
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
                                                    editCompany === true && handleSubmit();
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
                                            <CustomInput
                                                label="Contact Number *"
                                                name="contact_number"
                                                type="text"
                                                editable={editCompany}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Reg Address *"
                                                name="reg_address"
                                                type="text"
                                                method="TextArea"
                                                editable={editCompany}
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="GST Number *"
                                                name="gst_number"
                                                type="text"
                                                editable={editCompany}
                                            />
                                            <CustomInput
                                                label="TAN Number *"
                                                name="tan_number"
                                                type="text"
                                                editable={editCompany}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="PAN Number *"
                                                name="pan_number"
                                                type="text"
                                                editable={editCompany}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="ESI Number *"
                                                name="esi_number"
                                                type="text"
                                                editable={editCompany}
                                            />
                                            <CustomInput
                                                label="PF Number *"
                                                name="pf_number"
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
