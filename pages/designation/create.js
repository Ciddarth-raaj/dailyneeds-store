//External Dependencies
import { Formik, Form } from "formik";
import { Flex, Container, ButtonGroup, Button } from "@chakra-ui/react";

//Styles
import styles from "../../styles/create.module.css";

//Internal Dependencies
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Create } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";

function Designation() {
	const initialValue = {
		designationName: "",
		status: "",
	};

	return (
		<Formik
			initialValues={initialValue}
			onSubmit={(values) => {
				console.log(values);
			}}
			validationSchema={Create}
		>
			<Form>
				<GlobalWrapper title="Designation">
					<Head />
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
										Save
									</Button>
								</ButtonGroup>
							</div>
						</Container>
					</Flex>
				</GlobalWrapper>
			</Form>
		</Formik>
	);
}

export default Designation;
