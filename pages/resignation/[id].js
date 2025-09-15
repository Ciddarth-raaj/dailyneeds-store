//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, ButtonGroup, Button } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from 'next/router';

//Style
import styles from "../../styles/create.module.css";

//Internal Dependencies
import ResignationHelper from "../../helper/resignation";
import { Reason } from "../../constants/values";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { ResignationValidation } from "../../util/validation";
import EmployeeHelper from "../../helper/employee";
import CustomInput from "../../components/customInput/customInput";


class CreateResignation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            employeeDet: [],
            employee_name: "",
            // value: "",
            name: '',
            hoverElement: false,
        };
    }
    componentDidMount() {
        this.getEmployeeDet();
    }
    getEmployeeDet() {
        EmployeeHelper.getFamilyDet()
            .then((data) => {
                this.setState({ employeeDet: data })
            })
            .catch((err) => console.log(err))
    }
    updateResignation(values) {
        this.setState({ loading: true });
        const { router } = this.props;
        ResignationHelper.updateResignation({
            resignation_id: this.props.data[0].resignation_id,
            resignation_details: values
        })
            .then((data) => {
                if (data.code === 200) {
                    toast.success("Successfully Updated Resignation Details!");
                    router.push("/resignation")
                } else {
                    toast.error("Error Updating Resignation Details!");
                    throw `${data.msg}`;
                }
            })
            .catch((err) => console.log(err))
            .finally(() => this.setState({ loading: false }));
    }

    createResignation(values) {
        this.setState({ loading: true });
        const { router } = this.props;
        ResignationHelper.createResignation(values)
            .then((data) => {
                if (data == 200) {
                    toast.success("Successfully Resigned User!");
                    router.push("/resignation")
                } else {
                    toast.error("Error Resigning User!");
                    throw `${data.msg}`;
                }
            })
            .catch((err) => console.log(err))
            .finally(() => this.setState({ loading: false }));
    }
    render() {
        const { loading, employeeDet, employee_name, hoverElement, name } = this.state;
        const { id, data, value } = this.props;
        return (
            <GlobalWrapper title="Resignation">
                 
                <Formik
                    initialValues={{
                        employee_name: this.props.data[0]?.employee_name,
                        reason_type: this.props.data[0]?.reason_type,
                        reason: this.props.data[0]?.reason,
                        resignation_date: this.props.data[0]?.resignation_date
                    }}
                    validationSchema={ResignationValidation}
                    onSubmit={(values) => {
                        id === null ? this.createResignation(values) : this.updateResignation(values);
                    }}
                >
                    {(formikProps) => {
                        const { handleSubmit, setFieldValue, values } = formikProps;
                        // console.log({state: value});
                        return (
                            <Form onSubmit={formikProps.handleSubmit}>
                                <FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
                                <Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
                                    <p>Add Resignation</p>
                                    <div className={styles.wrapper}>
                                        <div className={styles.inputHolder}>
                                            <div className={styles.dropdown}>
                                                <label htmlFor="id" className={styles.employeeNameLabel}>Employee Name *</label>
                                                <input type="text" onChange={(e) => this.setState({ name: e.target.value })} value={employee_name === "" ? value : employee_name} onMouseEnter={() => this.setState({ hoverElement: false })}
                                                    className={styles.dropbtn} />
                                                <div className={styles.dropdowncontent} style={hoverElement === false ? { color: "black" } : { display: "none" }}>
                                                    {employeeDet.filter(({ employee_name }) => employee_name.indexOf(name.toLowerCase()) > -1).map((m) => (
                                                        <a onClick={() => (this.setState({ hoverElement: true, employee_name: m.employee_name }), setFieldValue("employee_name", m.employee_name ))}>
                                                            <img src={m.employee_image} width="30" height="25" className={styles.dropdownImg} />{m.employee_name}<br />{`# ${m.employee_id}`}</a>
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={{ width: "100%", marginTop: "3px"}}>
                                            <CustomInput
														label="Reason Type *"
														values={Reason.map((m) => ({
															id: m.id,
															value: m.value
														}))}
														name="reason_type"
														type="text"
														method="switch"
											/>
                                            </div>
                                        </div>
                                        <div className={styles.dateHolder}>
                                        <CustomInput
												label="Resignation Date"
												name="resignation_date"
												method="datepicker"
										/>
                                        </div>
                                        <div className={styles.inputHolder}>
                                        <CustomInput 
                                                label="Reason *" 
                                                name="reason" 
                                                type="text" 
                                                method="TextArea"
                                        />
                                        </div>
                                        <ButtonGroup
                                            spacing="6"
                                            mt={10}
                                            style={{
                                                width: "100%",
                                                justifyContent: "flex-end",
                                            }}
                                            type="submit"
                                        >
                                            <Button>Cancel</Button>
                                            <Button isLoading={loading} loadingText="Submitting" colorScheme="purple" onClick={() => handleSubmit()}>
                                                {id === null ? "Create" : "Update"}
                                            </Button>
                                        </ButtonGroup>
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
    var data = [];
    var value = "",
    data = await ResignationHelper.getResignationById(context.query.id);
	const id = context.query.id != "create" ? data[0].resignation_id : null;
    if(id !== null) {
        value = data[0].employee_name
    }
	return {
		props: { data, id, value }
	};
}

export default withRouter(CreateResignation);