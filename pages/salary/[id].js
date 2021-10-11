//External Dependencies
import { Formik, Form } from "formik";
import { Flex, Container, ButtonGroup, Button, CheckboxGroup, Grid, Checkbox } from "@chakra-ui/react";
import React from "react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../../styles/create.module.css";

//Internal Dependencies
import SalaryHelper from "../../helper/salary";
import Head from "../../util/head";
import EmployeeHelper from "../../helper/employee";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { SalaryValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";
import DesignationHelper from "../../helper/designation";

//Constants


class CreateSalary extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
            employeeDet: [],
            hoverElement: false,
            employee_name: "",
            name: ''
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
	
	createSalary(values) {
		const { employee_name } = this.state;
		this.setState({ loading: true });
		const { router } = this.props;
		values.status = 0;
		values.employee = employee_name;
		SalaryHelper.createSalary(values)
		.then((data) => {
			if (data == 200) {
				toast.success("Successfully Added Salary Advance!");
				router.push("/salary")
			} else {
				toast.error("Error creating Salary Advance!");
				throw `${data.msg}`;
			}
		})
		.catch((err) => console.log(err))
		.finally(() => this.setState({ loading: false }));
	}

	updateSalary(values) {
		const { payment_id } = this.props.data[0];
		const { router } = this.props;
		this.setState({ loading: true });
		SalaryHelper.updateSalary({
            payment_id: payment_id,
            payment_details: values
        })
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Salary Advance!");
					router.push("/salary")
				} else {
					toast.error("Error Updating Salary Advance!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}

	render() {
		const { loading,  employeeDet, hoverElement, employee_name, name } = this.state;
		const { id } = this.props;
		return (
			<GlobalWrapper title="Salary">
				<Head />
				<Formik
					initialValues={{
						employee: this.props.data[0]?.employee_name,
						loan_amount: this.props.data[0]?.loan_amount,
						installment_duration: this.props.data[0]?.installment,
					}}
					validationSchema={SalaryValidation}
					onSubmit={(values) => {
						id !== null ? this.updateSalary(values) : this.createSalary(values);
						
					}}
				>
					{(formikProps) => {
						const { handleSubmit, values } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"40px"} boxShadow="lg">
									{id !== null ? 
									<p>Update Salary</p> :
									<p>Add New Salary</p>}
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
                                            <div className={styles.dropdown}>
                                                <label htmlFor="id" className={styles.employeeNameLabel}>Employee Name *</label>
                                                <input type="text"onChange={(e) => this.setState({ name: e.target.value  })} value={employee_name === "" ? values.employee_name : `${employee_name}`} onMouseEnter={() => this.setState({hoverElement: false})} 
                                                 className={styles.dropbtn} />
                                                <div className={styles.dropdowncontent} style={hoverElement === false ? {color: "black"} : {display: "none"}}>
                                                    {employeeDet.filter(({employee_name}) => employee_name.indexOf(name.toLowerCase()) > -1).map((m) => (
                                                    <a onClick={() => (this.setState({ employee_name: m.employee_name, hoverElement: true}))}>
                                                        <img src={m.employee_image} width="30" height="25" className={styles.dropdownImg} />{m.employee_name}<br/>{`# ${m.employee_id}`}</a>
                                                    ))}
                                                </div>
                                            </div>
											<CustomInput
												label="Loan Amount"
												name="loan_amount"
												type="text"
                                                style={{marginTop: 4}}
											/>
										</div>
										<div className={styles.inputHolder}>
                                            <CustomInput
												label="Installment Duration"
												name="installment_duration"
												type="text"
											/>
										</div>
										<ButtonGroup
											spacing="6"
											style={{
												width: "100%",
												justifyContent: "flex-end",
											}}
										>
											<Button>Cancel</Button>
											<Button isLoading={loading} loadingText="Submitting" colorScheme="purple" onClick={() => handleSubmit()}>
												{id !== null ? "Update" : "Create"}
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
	if(context.query.id !== "create") {
	data = await SalaryHelper.getSalaryById(context.query.id);
	}
	const id = context.query.id != "create" ? data[0].payment_id : null;
	return {
		props: { data, id }
	};
}

export default withRouter(CreateSalary);