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

//Styles
import styles from "../../styles/create.module.css";

//Internal Dependencies
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Create } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";

//Constants
import { PERMISSIONS } from "../../constants/permissions";

function Designation() {
	const initialValue = {
		designationName: "",
		status: "",
	};

	return (
		<GlobalWrapper title="Designation">
			<Head />
			<Formik
				initialValues={initialValue}
				onSubmit={(values) => {
					console.log(values);
				}}
				validationSchema={Create}
			>
				{(formikProps) => {
					const { handleSubmit } = formikProps;
					return (
						<Form>
							<Flex>
								<Container
									maxW="container.xl"
									className={styles.container}
									pb={"40px"}
								>
									<p>Add New Designation</p>
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
											<CustomInput
												label="Designation Name"
												name="designationName"
												type="text"
											/>
											<CustomInput
												label="Status"
												values={[
													{
														id: 1,
														value: "Status 1",
													},
													{
														id: 2,
														value: "Status 2",
													},
													{
														id: 3,
														value: "Status 3",
													},
												]}
												name="status"
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
												// isLoading
												loadingText="Submitting"
												colorScheme="purple"
												onClick={() => handleSubmit()}
											>
												Create
											</Button>
										</ButtonGroup>
									</div>
								</Container>
							</Flex>
						</Form>
					);
				}}
			</Formik>
		</GlobalWrapper>
	);
}

export default Designation;
