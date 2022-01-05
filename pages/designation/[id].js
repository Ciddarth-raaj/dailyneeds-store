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
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { DesignationValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";
import DesignationHelper from "../../helper/designation";

//Constants
import { PERMISSIONS } from "../../constants/permissions";


class CreateDesignation extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			checkedItems: false,
			permissions: [],
		};
	}

	createDesignation(values) {
		const { permissions } = this.state;
		const { router } = this.props;
		this.setState({ loading: true });
		DesignationHelper.createDesignation({ ...values, permissions })
			.then((data) => {
				console.log(data);
				if (data.code == 200) {
					toast.success("Successfully Creating Designation!");
					router.push("/designation")
				} else {
					throw `${data.msg}`;
				}
			})
			.catch((err) => {
				console.log(err);
				toast.error("Error Creating Designation!");
			})
			.finally(() => this.setState({ loading: false }));
	}

	updateDesignation(values) {
        const { designation_id } = this.props.data[0];
		const { router } = this.props;
		this.setState({ loading: true });
		DesignationHelper.updateDesignation({
            designation_id: designation_id,
            designation_details: values
        })
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Designation!");
					router.push("/designation")
				} else {
					toast.error("Error Updating Designation!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}

	handleCheckbox(key, checked) {
		let { permissions } = this.state;

		if (permissions.includes(key) && !checked) {
			const index = permissions.findIndex((v) => v == key);
			permissions.splice(index, 1);
		} else {
			permissions.push(key);
		}

		this.setState({ permissions: permissions });
	}

	render() {
		const { loading } = this.state;
		const { id } = this.props;
		return (
			<GlobalWrapper title="Designation">
				<Head />
				<Formik
					initialValues={{
						designation_name: this.props.data[0]?.designation_name,
						status: 1,
						online_portal: this.props.data[0]?.online_portal,
						login_access: this.props.data[0]?.login_access
					}}
					validationSchema={DesignationValidation}
					onSubmit={(values) => {
						id !== null ? this.updateDesignation(values) : this.createDesignation(values);
						
					}}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"40px"} boxShadow="lg">
									{id !== null ? 
									<p>Update Designation</p> :
									<p>Add New Designation</p>}
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
											<CustomInput label="Designation Name" name="designation_name" type="text" />
											{/* <CustomInput
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
											/> */}
										</div>
										<div className={styles.inputHolder}>
											<CustomInput
												label="Online Access"
												name="online_portal"
												values={[
													{
														id: 1,
														value: "Grant Access",
													},
													{
														id: 0,
														value: "Discard Access",
													},
												]}
												type="text"
												method="switch"
											/>
											<CustomInput
												label="Login Access"
												name="login_access"
												values={[
													{
														id: 1,
														value: "Grant Access",
													},
													{
														id: 0,
														value: "Discard Access",
													},
												]}
												type="text"
												method="switch"
											/>
										</div>
										{/* <CheckboxGroup defaultValue={["dashboard"]}> */}
										<CheckboxGroup>
											{/* <Checkbox></Checkbox> */}
											<Grid templateColumns="repeat(3, 1fr)" gap={6}>
												{Object.keys(PERMISSIONS).map((key) => (
													<Checkbox value={key} onChange={(e) => this.handleCheckbox(key, e.target.checked)}>
														{PERMISSIONS[key]}
													</Checkbox>
												))}
											</Grid>
										</CheckboxGroup>

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
	data = await DesignationHelper.getDesignationById(context.query.id);
	}
	const id = context.query.id != "create" ? data[0].designation_id : null;
	return {
		props: { data, id }
	};
}

export default withRouter(CreateDesignation);