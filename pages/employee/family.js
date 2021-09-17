//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, Button, Checkbox } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../../styles/registration.module.css";

//Helper
import { BloodGroup } from "../../constants/values";

//Internal Dependencies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { EmployeeFamilyValidation } from "../../util/validation";

class Family extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loadingFamily: false,
            editFamily: false,
        };
    }

    save() {
        const { editFamily } = this.state;
        editFamily ? "" : toast.success("Successfully Saved!");
    }

    render() {
        const { loadingFamily, editFamily } = this.state;

        return (
            <GlobalWrapper title="Family">
                <Head />
                <Formik
                    initialValues={{
                        name: "Keerthika",
                        dob: "09/11/2000",
                        gender: "",
                        blood_group: "",
                        relation: "",
                        copy_address: "",
                        profession: "Teacher",
                        nationality: "",
                        remarks: "None",

                    }}
                    validationSchema={EmployeeFamilyValidation}
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
                                        <div>Family Details</div>
                                        <div style={{ paddingRight: 10 }}>
                                            <Button
                                                isLoading={loadingFamily}
                                                variant="outline"
                                                leftIcon={
                                                    editFamily ? (
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
                                                        editFamily: !editFamily,
                                                    });
                                                    handleSubmit();
                                                }}
                                            >
                                                {editFamily ? "Save" : "Edit"}
                                            </Button>
                                        </div>
                                    </p>

                                    <div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Name *"
                                                name="name"
                                                type="text"
                                                editable={editFamily}
                                            />
                                            <CustomInput
                                                label="DOB *"
                                                name="dob"
                                                type="text"
                                                method="datepicker"
                                                editable={editFamily}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Gender *"
                                                values={[
                                                    {
                                                        id: "Male",
                                                        value: "Male",
                                                    },
                                                    {
                                                        id: "Female",
                                                        value: "Female",
                                                    },
                                                    {
                                                        id: "Transgendar",
                                                        value: "Transgendar",
                                                    },
                                                ]}
                                                name="gender"
                                                type="text"
                                                method="switch"
                                                editable={editFamily}
                                            />
                                            <CustomInput
                                                label="Blood Group *"
                                                values={BloodGroup.map((m) => ({
                                                    id: m.id,
                                                    value: m.value,
                                                }))}
                                                name="blood_group"
                                                type="text"
                                                method="switch"
                                                editable={editFamily}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Relation *"
                                                values={[
                                                    {
                                                        id: "Mother",
                                                        value: "Mother",
                                                    },
                                                    {
                                                        id: "Father",
                                                        value: "Father",
                                                    },
                                                    {
                                                        id: "Husband",
                                                        value: "Husband",
                                                    },
                                                    {
                                                        id: "Wife",
                                                        value: "Wife",
                                                    },
                                                    {
                                                        id: "Daughter",
                                                        value: "Daughter",
                                                    },
                                                    {
                                                        id: "Son",
                                                        value: "Son",
                                                    },
                                                ]}
                                                name="relation"
                                                type="text"
                                                method="switch"
                                                editable={editFamily}
                                            />
                                            <div
                                                className={`${styles.inputHolder} ${styles.hidden}`}
                                            ></div>
                                        </div>

                                        <div
                                            className={styles.inputHolder}
                                            style={{
                                                paddingLeft: 10,
                                                paddingBottom: 20,
                                            }}
                                        >
                                            <Checkbox colorScheme="purple">
                                                Address Same As Employee
                                            </Checkbox>
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Copy Address From *"
                                                values={[
                                                    {
                                                        id: "Present Address",
                                                        value: "Present Address",
                                                    },
                                                    {
                                                        id: "Old Address",
                                                        value: "Old Address",
                                                    },
                                                ]}
                                                name="copy_address"
                                                type="text"
                                                method="switch"
                                                editable={editFamily}
                                            />
                                            <div
                                                className={`${styles.inputHolder} ${styles.hidden}`}
                                            ></div>
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Profession *"
                                                name="profession"
                                                type="text"
                                                editable={editFamily}
                                            />
                                            <CustomInput
                                                label="Nationality *"
                                                values={[
                                                    {
                                                        id: "American",
                                                        value: "American",
                                                    },
                                                    {
                                                        id: "Canadian",
                                                        value: "Canadian",
                                                    },
                                                    {
                                                        id: "Chinese",
                                                        value: "Chinese",
                                                    },
                                                    {
                                                        id: "Indian",
                                                        value: "Indian",
                                                    },
                                                ]}
                                                name="nationality"
                                                type="text"
                                                method="switch"
                                                editable={editFamily}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Remarks"
                                                name="remarks"
                                                type="text"
                                                method="TextArea"
                                                editable={editFamily}
                                            />
                                            <div
                                                className={`${styles.inputHolder} ${styles.hidden}`}
                                            ></div>
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

export default withRouter(Family);
