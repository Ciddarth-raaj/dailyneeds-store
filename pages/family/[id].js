//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, Button, Checkbox, ButtonGroup} from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../../styles/registration.module.css";

//Helper
import { BloodGroup, Gender, Nationality, Relation } from "../../constants/values";

//Internal Dependencies
import FamilyHelper from "../../helper/family";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { EmployeeFamilyValidation } from "../../util/validation";
import moment from "moment";

class Family extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loadingFamily: false,
            editFamily: false,
        };
    }
    createFamily(values) {
		this.setState({ loadingFamily: true });
        values.dob = moment(values.dob).format("YYYY-MM-DD");
		FamilyHelper.createFamily(values)
			.then((data) => {
				if (data == 200) {
					toast.success("Successfully Added New Family Member!");
				} else {
					toast.error("Error Adding Member!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loadingFamily: false }));
	}
    updateFamily(values) {
        const { family_id } = this.props.data[0];
		this.setState({ loading: true });
		FamilyHelper.updateFamily({
            family_id: family_id,
            family_details: values
        })
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Department!");
				} else {
					toast.error("Error Updating Department!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}

    render() {
        const { loadingFamily, editFamily } = this.state;
        const { id } = this.props;
        return (
            <GlobalWrapper title="Family">
                <Head />
                <Formik
                    initialValues={{
                        name: this.props.data[0]?.name,
                        dob: moment(this.props.data[0]?.dob).format("MM/DD/YYYY"),
                        gender: this.props.data[0]?.gender,
                        blood_group: this.props.data[0]?.blood_group,
                        relation: this.props.data[0]?.relation,
                        address: this.props.data[0]?.address,
                        profession: this.props.data[0]?.profession,
                        nationality: this.props.data[0]?.nationality,
                        remarks: this.props.data[0]?.remarks,
                    }}
                    validationSchema={EmployeeFamilyValidation}
                    onSubmit={(values) => {
                        id !== null ? this.updateFamily(values) : this.createFamily(values);
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
                                        <div>Family Details</div>
                                        {id !== null && (
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
                                                    editFamily === true && handleSubmit(),
                                                    this.setState({
                                                        editFamily: !editFamily,
                                                    })
                                                }}
                                            >
                                                {editFamily ? "Save" : "Edit"}
                                            </Button>
                                        </div>
                                        )}
                                    </p>

                                    <div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Name *"
                                                name="name"
                                                type="text"
                                                editable={id !== null ? editFamily : !editFamily}
                                            />
                                            <CustomInput
                                                label="DOB *"
                                                name="dob"
                                                type="text"
                                                method="datepicker"
                                                editable={id !== null ? editFamily : !editFamily}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Gender *"
                                                values={Gender.map((m) => ({
                                                    id: m.id,
                                                    value: m.value
                                                }))}
                                                name="gender"
                                                type="text"
                                                method="switch"
                                                editable={id !== null ? editFamily : !editFamily}
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
                                                editable={id !== null ? editFamily : !editFamily}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Relation *"
                                                values={Relation.map((m) => ({
                                                    id: m.id,
                                                    value: m.value
                                                }))}
                                                name="relation"
                                                type="text"
                                                method="switch"
                                                editable={id !== null ? editFamily : !editFamily}
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
                                                name="address"
                                                type="text"
                                                method="switch"
                                                editable={id !== null ? editFamily : !editFamily}
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
                                                editable={id !== null ? editFamily : !editFamily}
                                            />
                                            <CustomInput
                                                label="Nationality *"
                                                values={Nationality.map((m) => ({
                                                    id: m.id,
                                                    value: m.value
                                                }))}
                                                name="nationality"
                                                type="text"
                                                method="switch"
                                                editable={id !== null ? editFamily : !editFamily}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Remarks"
                                                name="remarks"
                                                type="text"
                                                method="TextArea"
                                                editable={id !== null ? editFamily : !editFamily}
                                            />
                                            <div
                                                className={`${styles.inputHolder} ${styles.hidden}`}
                                            ></div>
                                        </div>
                                        {id === null && (
												<ButtonGroup
													spacing="6"
													mt={10}
													style={{
														display: "flex",
														// width: "100%",
														justifyContent: "flex-end",
													}}
												>
													<Button>Cancel</Button>
													<Button isLoading={loadingFamily} loadingText="Submitting" colorScheme="purple" onClick={() => handleSubmit()}>
														{"Create"}
													</Button>
												</ButtonGroup>
											)}
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

export async function getServerSideProps(context) {
	const data = await FamilyHelper.getFamilyById(context.query.id);
	const id = context.query.id != "create" ? data[0].family_id : null;
	return {
		props: { data, id }
	};
}
export default withRouter(Family);
