//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import Dropzone from "react-dropzone-uploader";
import { Container, Flex, ButtonGroup, Button, Center } from "@chakra-ui/react";

//Styles
import styles from "../../styles/registration.module.css";

//Internal Dependencies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";

const INITIAL_VALUES = {
	name: null,
	fatherName: null,
	dob: null,
	permanentAddress: null,
	residentialAddress: null,
	contactNo: null,
	alternateNo: null,
	email: null,
	educationalQualification: null,
	introducerName: null,
	introducerDetails: null,
	employeeId: null,
	salary: null,
	unifrom: null,
	experience: null,
	joiningDate: null,
	resignationDate: null,
	idNo: null,
	gender: "Male",
	blood_group_id: null,
	designation_id: null,
	store_id: null,
	department_id: null,
	maritalStatus: "Married",
};

export default class Create extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
		};
	}

	getUploadParams = ({ meta }) => {
		return { url: "https://httpbin.org/post" };
	};

	handleChangeStatus = ({ meta, file }, status) => {
		console.log(status);
		console.log(meta);
		console.log(file);
	};

	handleSubmit = (files) => {
		console.log(files.map((f) => f.meta));
	};

	render() {
		const { loading } = this.state;

		const dropDownProps = {
			styles: {
				dropzone: {
					overflow: "auto",
					border: "none",
					borderRadius: "10px",
					background: "#EEEEEE",
				},
				inputLabelWithFiles: {
					margin: "20px 3%",
				},
				inputLabel: {
					color: "black",
					fontSize: "14px",
				},
			},
			multiple: false,
			maxFiles: 1,
			accept: "image/*",
		};

		const containerProps = {
			className: styles.container,
			boxShadow: "lg",
			minW: "600px",
		};

		return (
			<GlobalWrapper title="New Employee">
				<Head />
				<Formik
					initialValues={INITIAL_VALUES}
					onSubmit={(values) => {
						console.log(values);
					}}
					validationSchema={Validation}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;

						return (
							<Form>
								<Flex>
									<Container {...containerProps}>
										<p>Personal Details</p>
										<div>
											<div
												className={
													styles.personalInputHolder
												}
											>
												<div
													className={
														styles.inputHolder
													}
												>
													<CustomInput
														label="Name *"
														name="name"
														type="text"
													/>

													<CustomInput
														label="Date of Birth *"
														name="dob"
														type="text"
													/>
												</div>
												<div
													className={
														styles.inputHolder
													}
												>
													<CustomInput
														label="Father / Spouse Name *"
														name="fatherName"
														type="text"
													/>

													<CustomInput
														label="Gender *"
														values={[
															{
																id: "Male",
																value: "Male",
															},
															{
																id: "Female",
																value: "Female",
															},
															{
																id: "Transgendar",
																value: "Transgendar",
															},
														]}
														name="gender"
														type="text"
														method="switch"
													/>
												</div>
											</div>
											<div className={styles.inputHolder}>
												<CustomInput
													label="Marital Status *"
													values={[
														{
															id: "Married",
															value: "Married",
														},
														{
															id: "Widowed",
															value: "Widowed",
														},
														{
															id: "Divorced",
															value: "Divorced",
														},
														{
															id: "Separated",
															value: "Separated",
														},
													]}
													name="maritalStatus"
													type="text"
													method="switch"
												/>
											</div>
											<div
												className={
													styles.personalInputHolder
												}
											>
												<CustomInput
													label="Permanent Address *"
													name="permanentAddress"
													type="text"
													method="TextArea"
												/>
											</div>
											<div
												className={
													styles.personalInputHolder
												}
											>
												<CustomInput
													label="Residential Address"
													name="residentialAddress"
													type="text"
													method="TextArea"
												/>
											</div>
											<div
												className={
													styles.personalInputHolder
												}
											>
												<div
													className={
														styles.inputHolder
													}
												>
													<CustomInput
														label="Primary Contact Number *"
														name="contactNo"
														type="text"
													/>
													<CustomInput
														label="Alternate Number"
														name="alternateNo"
														type="text"
													/>
												</div>
												<div
													className={
														styles.inputHolder
													}
												>
													<CustomInput
														label="Email ID *"
														name="email"
														type="text"
													/>

													<CustomInput
														label="Blood Group *"
														values={[
															{
																id: 1,
																value: "Blood group A",
															},
															{
																id: 2,
																value: "Blood group B",
															},
															{
																id: 3,
																value: "Blood group O",
															},
														]}
														name="blood_group_id"
														type="text"
														method="switch"
													/>
												</div>
											</div>
											<div
												className={
													styles.personalInputHolder
												}
											>
												<CustomInput
													label="Educational Qualification *"
													name="educationalQualification"
													type="text"
												/>
												<CustomInput
													label="Introducer's Name"
													name="introducerName"
													type="text"
												/>
											</div>
											<div
												className={
													styles.personalInputHolder
												}
											>
												<CustomInput
													label="Introducer Details"
													name="introducerDetails"
													type="text"
													method="TextArea"
												/>
											</div>
										</div>
									</Container>
									<Container>
										<Container {...containerProps}>
											<p>Employee Details</p>
											<div>
												<div
													className={
														styles.personalInputHolder
													}
												>
													<CustomInput
														label="Employee ID *"
														name="employeeId"
														type="text"
													/>
													<CustomInput
														label="Salary / Month *"
														name="salary"
														type="text"
													/>
												</div>
												<div
													className={
														styles.personalInputHolder
													}
												>
													<div
														className={
															styles.inputHolder
														}
													>
														<CustomInput
															label="Previous Experience"
															name="experience"
															type="text"
														/>
														<CustomInput
															label="Unifrom"
															name="unifrom"
															type="text"
														/>
													</div>
													<div
														className={
															styles.inputHolder
														}
													>
														<CustomInput
															label="ID Card Type"
															name="card_type_id"
															type="text"
														/>

														<CustomInput
															label="Shift Details"
															name="shiftDetails"
															type="text"
														/>
													</div>
												</div>
												<div
													className={
														styles.personalInputHolder
													}
												>
													<div
														className={
															styles.inputHolder
														}
													>
														<CustomInput
															label="Select Designation *"
															values={[
																{
																	id: 1,
																	value: "designation1",
																},
																{
																	id: 2,
																	value: "designation2",
																},
																{
																	id: 3,
																	value: "designation3",
																},
															]}
															name="designation_id"
															type="text"
															method="switch"
														/>
														<CustomInput
															label="Date of Joining"
															name="joiningDate"
															type="text"
														/>
													</div>
													<div
														className={
															styles.inputHolder
														}
													>
														<CustomInput
															label="Select Store *"
															values={[
																{
																	id: 1,
																	value: "Store1",
																},
																{
																	id: 2,
																	value: "Store2",
																},
																{
																	id: 3,
																	value: "Store3",
																},
															]}
															name="store_id"
															type="text"
															method="switch"
														/>
														<CustomInput
															label="Select Department *"
															values={[
																{
																	id: 1,
																	value: "Department1",
																},
																{
																	id: 2,
																	value: "Department2",
																},
																{
																	id: 3,
																	value: "Department3",
																},
															]}
															name="department_id"
															type="text"
															method="switch"
														/>
													</div>
												</div>
												<div
													className={
														styles.personalInputHolder
													}
												>
													<CustomInput
														label="Date of Resignation"
														name="resignationDate"
														type="text"
													/>
													<CustomInput
														label="ID Card No"
														name="idNo"
														type="text"
													/>
												</div>
											</div>
										</Container>
										<Container
											{...containerProps}
											mt={"20px"}
											pb={"20px"}
										>
											<p>File Uploads</p>
											<div
												className={styles.uploadHolder}
											>
												<label
													className={
														styles.uploaderTitle
													}
													for="uploadImage"
												>
													Upload Image
												</label>
												<Dropzone
													getUploadParams={
														this.getUploadParams
													}
													onChangeStatus={
														this.handleChangeStatus
													}
													{...dropDownProps}
												/>
											</div>

											<div
												className={styles.uploadHolder}
												style={{ marginTop: 30 }}
											>
												<label
													className={
														styles.uploaderTitle
													}
													for="uploadID"
												>
													Upload ID
												</label>
												<Dropzone
													getUploadParams={
														this.getUploadParams
													}
													onChangeStatus={
														this.handleChangeStatus
													}
													{...dropDownProps}
												/>
											</div>
											<ButtonGroup
												spacing="6"
												mt={10}
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
													onClick={() =>
														handleSubmit()
													}
												>
													Save
												</Button>
											</ButtonGroup>
										</Container>
									</Container>
								</Flex>
							</Form>
						);
					}}
				</Formik>
			</GlobalWrapper>
		);
	}
}
