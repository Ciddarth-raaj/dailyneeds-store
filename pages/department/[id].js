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

class UpdateDepartment extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
		};
	}

	updateDepartment(values) {
        const { department_id } = this.props.data[0];
		this.setState({ loading: true });
		DepartmentHelper.updateDepartment({
            department_id: department_id,
            department_details: values
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
		const { loading } = this.state;
		return (
			<GlobalWrapper title="Update Department">
				<Head />
				<Formik
					initialValues={{
                        department_name: this.props.data[0].department_name,
	                    status: this.props.data[0].status,
                    }}
					validationSchema={DepartmentValidation}
					onSubmit={(values) => {
						this.updateDepartment(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
									<p>Update Department</p>
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
												Update
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
	const data = await DepartmentHelper.getDepartmentById(context.query.id);
	return {
		props: { data }
	};
}

export default withRouter(UpdateDepartment);