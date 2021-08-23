//External Dependencies
import { Formik, Form } from "formik";
import {
	Flex,
	Container,
	ButtonGroup,
	Button,
	CheckboxGroup,
	Grid,
	Checkbox,
} from "@chakra-ui/react";
import React from "react";
import { toast } from "react-toastify";

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

const initialValue = {
	designation_name: "",
	status: "",
};
export default class CreateDesignation extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
		}
	}

	createDesignation(values) {
		this.setState({ loading: true });
		DesignationHelper.createDesignation(values)
			.then((data) => {
				if (data.code == 200) {
					toast.success("Successfully Creating Designation!");
				} else {
					throw `${data.msg}`
				}
			})
			.catch((err) => {
				console.log(err);
				toast.error("Error Creating Designation!");
			})
			.finally(() => this.setState({ loading: false }));
	}

	render() {
		const { loading } = this.state;

		return <GlobalWrapper title="Designation">
			<Head />
			<Formik
				initialValues={initialValue}
				validationSchema={DesignationValidation}
				onSubmit={(values) => {
					this.createDesignation(values);
				}}
			>
				{(formikProps) => {
					const { handleSubmit } = formikProps;
					return <Form onSubmit={formikProps.handleSubmit}>
						<Container
							maxW="container.xl"
							className={styles.container}
							pb={"40px"}
							boxShadow="lg"
						>
							<p>Add New Designation</p>
							<div className={styles.wrapper}>
								<div className={styles.inputHolder}>
									<CustomInput
										label="Designation Name"
										name="designation_name"
										type="text"
									/>
									<CustomInput
										label="Status"
										values={[
											{
												id: 1,
												value: "Active"
											},
											{
												id: 2,
												value: "Inactive"
											},
										]}
										name="status"
										type="text"
										method="switch"
									/>
								</div>
								<div className={styles.inputHolder}>
									<CustomInput
										label="Online Access"
										name="online_portal"
										values={[
											{
												id: 1,
												value: "Grant Access"
											},
											{
												id: 2,
												value: "Discard Access"
											},
										]}
										type="text"
										method="switch"
									/>
								</div>
								<CheckboxGroup
									defaultValue={["dashboard"]}
								>
									<Grid
										templateColumns="repeat(3, 1fr)"
										gap={6}
									>
										{Object.keys(PERMISSIONS).map(
											(key) => (
												<Checkbox value={key}>
													{PERMISSIONS[key]}
												</Checkbox>
											)
										)}
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
									<Button
										isLoading={loading}
										loadingText="Submitting"
										colorScheme="purple"
										onClick={() => handleSubmit()}
									>
										Create
									</Button>
								</ButtonGroup>
							</div>
						</Container>
					</Form>
				}}
			</Formik>
		</GlobalWrapper>
	}
}

