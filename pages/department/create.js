//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, ButtonGroup, Button } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";

//Style
import styles from "../../styles/create.module.css";

//Internal Dependencies
import DepartmentHelper from "../../helper/department";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { DepartmentValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";

const initialValue = {
	department_name: "",
	status: "",
};
export default class CreateDepartment extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
		};
	}

	createDepartment(values) {
		this.setState({ loading: true });
		DepartmentHelper.createDepartment(values)
			.then((data) => {
				if (data == 200) {
					toast.success("Successfully Added Department!");
				} else {
					toast.error("Error creating Department!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}

	render() {
		const { loading } = this.state;
		return (
			<GlobalWrapper title="Department">
				<Head />
				<Formik
					initialValues={initialValue}
					validationSchema={DepartmentValidation}
					onSubmit={(values) => {
						this.createDepartment(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
									<p>Add New Department</p>
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
											<CustomInput label="Department Name" name="department_name" type="text" />
											<CustomInput
												label="Status"
												values={[
													{
														id: 1,
														value: "Active",
													},
													{
														id: 0,
														value: "Inactive",
													},
												]}
												name="status"
												type="text"
												method="switch"
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
												Create
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
