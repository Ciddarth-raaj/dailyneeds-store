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
import DepartmentHelper from "../../helper/department";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { DepartmentValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";


class CreateDepartment extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			data: [],
			id: null,
		};
	}

	componentDidMount() {
		this.fetchRecord();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.router.query.id !== this.props.router.query.id) {
			this.fetchRecord();
		}
	}

	fetchRecord() {
		const recordId = this.props.router.query.id;
		if (!recordId || recordId === "create") {
			this.setState({ data: [], id: null });
			return;
		}
		DepartmentHelper.getDepartmentById(recordId)
			.then((data) => {
				this.setState({
					data,
					id: data[0]?.department_id ?? null,
				});
			})
			.catch((err) => console.log(err));
	}

	createDepartment(values) {
		this.setState({ loading: true });
		const { router } = this.props;
		// Only the name. `POST /department/create` validates with Joi, which
		// rejects unknown keys, and its schema is `{ department_name }` alone -
		// so passing the form's `status` straight through would turn every
		// department creation into a 422. A new department is Active by the
		// column default.
		DepartmentHelper.createDepartment({ department_name: values.department_name })
			.then((data) => {
				if (data == 200) {
					toast.success("Successfully Added Department!");
					router.push("/department")
				} else {
					toast.error("Error creating Department!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}
	updateDepartment(values) {
        const { department_id } = this.state.data[0];
		const { router } = this.props;
		this.setState({ loading: true });
		DepartmentHelper.updateDepartment({
            department_id: department_id,
            department_details: values
        })
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Department!");
					router.push("/department")
				} else {
					toast.error("Error Updating Department!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}
	
	render() {
		const { loading } = this.state;
		const { id } = this.state;
		return (
			<GlobalWrapper title="Department">
				 
				<Formik
					enableReinitialize
					initialValues={{
						department_name: this.state.data[0]?.department_name,
						// Read from the record. The form had no status at all, so this
						// page could rename a department but never retire one - and the
						// backend schema would have rejected a status even if it had sent
						// one. A new department starts Active, matching the column default.
						status:
							this.state.id === null
								? 1
								: Number(this.state.data[0]?.status) === 0
								? 0
								: 1,
					}}
					validationSchema={DepartmentValidation}
					onSubmit={(values) => {
						id === null ? this.createDepartment(values) : this.updateDepartment(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
									{id !== null ? 
									<p>Update Department</p> :
									<p>Add New Department</p>}
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
											<CustomInput label="Department Name" name="department_name" type="text" />	
										</div>
									{/* Only when editing: a department being created is Active by
									    definition, and the create endpoint takes no status. */}
									{id !== null && (
										<div className={styles.inputHolder}>
											<CustomInput
												label="Status"
												name="status"
												values={[
													{ id: 1, value: "Active" },
													{ id: 0, value: "Inactive" },
												]}
												type="text"
												method="switch"
											/>
										</div>
									)}
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

export default withRouter(CreateDepartment);