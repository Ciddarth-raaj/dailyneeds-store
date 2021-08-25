//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import Dropzone from "react-dropzone-uploader";
import { Container, Flex, ButtonGroup, Button, Center } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";

//Styles
import styles from "../../styles/registration.module.css";

//Helpers
import EmployeeHelper from "../../helper/employee";
import DesignationHelper from "../../helper/designation";
import ShiftHelper from "../../helper/shift";
import DepartmentHelper from "../../helper/department";
import FilesHelper from "../../helper/asset";

//Internal Dependencies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";

const INITIAL_VALUES = {
	employee_name: "",
	father_name: "",
	dob: "",
	permanent_address: "",
	residential_address: "",
	primary_contact_number: "",
	alternate_contact_number: "",
	email_id: "",
	qualification: "",
	introducer_name: "",
	introducer_details: "",
	id_number: "",
	salary: "",
	uniform_qty: "",
	previous_experience: "",
	date_of_joining: "0000-00-00",
	date_of_termination: "0000-00-00",
	id_card_no: "",
	gender: "Male",
	blood_group: "",
	designation_id: "",
	store_id: "",
	shift_id: "",
	department_id: "",
	marital_status: "Married",
	employee_image: "",

	card_image: "",
	bank_name: "",
	ifsc: 10000,
	account_no: 10000,
	esi: 0,
	esi_number: 10000,
	pf: 10,
	pf_number: 10000,
	UAN: 10000,
	spouse_name: "",
	online_portal: 0,
};

export default class Create extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			department: [],
			designation: [],
			shift: [],
			uploadImage: [],
			uploadId: [],
		};
	}

	componentDidMount() {
		this.getDesignation();
		this.getDepartment();
		this.getShift();
	}

	getShift() {
		ShiftHelper.get()
			.then((data) => {
				this.setState({ shift: data });
			})
			.catch((err) => console.log(err));
	}

	getDesignation() {
		DesignationHelper.getDesignation()
			.then((data) => {
				this.setState({ designation: data });
			})
			.catch((err) => console.log(err));
	}

	getDepartment() {
		DepartmentHelper.getDepartment()
			.then((data) => {
				this.setState({ department: data });
			})
			.catch((err) => console.log(err));
	}

	CreateEmployee(values) {
		values.employee_image = this.state.uploadImage ? this.state.uploadImage : "";
		values.card_image = this.state.uploadId ? this.state.uploadId : "";
		console.log(values);
		EmployeeHelper.register(values)
			.then((data) => {
				if (data === 200) {
					toast.success("Successfully created Account");
				} else {
					toast.error("Error creating Account");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err));
	}

	getImageUploadParams = ({ meta }) => {
		const { uploadImage } = this.state;
		return { url: uploadImage };
	};

	getIdUploadParams = ({ meta }) => {
		const { uploadId } = this.state;
		return { url: uploadId };
	};

	idHandleChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				const Idarray = [];
				Idarray.push(await FilesHelper.upload(file, "uploadId", "dashboard_file"));
				this.setState({ uploadId: Idarray.length > 0 ? Idarray[0].remoteUrl : "" });
			} catch (err) {
				console.log(err);
			}
		}
	};

	imageChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				const Imagearray = [];
				Imagearray.push(await FilesHelper.upload(file, "uploadImage", "dashboard_file"));
				this.setState({ uploadImage: Imagearray.length > 0 ? Imagearray[0].remoteUrl : "" });
			} catch (err) {
				console.log(err);
				reject(err);
			}
		}
	};

	handleSubmit = async (files) => {
		console.log(files);
	};

	render() {
		const { loading, designation, department, shift } = this.state;
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
					validationSchema={Validation}
					onSubmit={(values) => {
						this.CreateEmployee(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;

						return (
							<Form>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Flex>
									<Container {...containerProps}>
										<p>Personal Details</p>
										<div>
											<div className={styles.personalInputHolder}>
												<div className={styles.inputHolder}>
													<CustomInput label="Name *" name="employee_name" type="text" />

													<CustomInput label="Date of Birth *" name="dob" type="text" />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Father / Spouse Name *" name="father_name" type="text" />

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
													name="marital_status"
													type="text"
													method="switch"
												/>
											</div>
											<div className={styles.personalInputHolder}>
												<CustomInput label="Permanent Address *" name="permanent_address" type="text" method="TextArea" />
											</div>
											<div className={styles.personalInputHolder}>
												<CustomInput label="Residential Address" name="residential_address" type="text" method="TextArea" />
											</div>
											<div className={styles.personalInputHolder}>
												<div className={styles.inputHolder}>
													<CustomInput label="Primary Contact Number *" name="primary_contact_number" type="text" />
													<CustomInput label="Alternate Number" name="alternate_contact_number" type="text" />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Email ID *" name="email_id" type="text" />

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
														name="blood_group"
														type="text"
														method="switch"
													/>
												</div>
											</div>
											<div className={styles.personalInputHolder}>
												<div className={styles.inputHolder}>
													<CustomInput label="Educational Qualification *" name="qualification" type="text" />
													<CustomInput label="Introducer's Name" name="introducer_name" type="text" />
												</div>
											</div>
											<div className={styles.personalInputHolder}>
												<CustomInput label="Introducer Details" name="introducer_details" type="text" method="TextArea" />
											</div>
										</div>
									</Container>
									<Container>
										<Container {...containerProps}>
											<p>Employee Details</p>
											<div>
												<div className={styles.personalInputHolder}>
													<div className={styles.inputHolder}>
														<CustomInput label="Employee ID *" name="id_number" type="text" />
														<CustomInput label="Salary / Month *" name="salary" type="text" />
													</div>
													<div className={styles.inputHolder}>
														<CustomInput label="Previous Experience" name="previous_experience" type="text" />
														<CustomInput label="Unifrom" name="uniform_qty" type="text" />
													</div>
												</div>
												<div className={styles.personalInputHolder}>
													<div className={styles.inputHolder}>
														<CustomInput label="ID Card Type" name="id_card" type="text" />

														<CustomInput
															label="Shift Details"
															values={shift.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name="shift_id"
															type="text"
															method="switch"
														/>
													</div>
													<div className={styles.inputHolder}>
														<CustomInput
															label="Select Designation *"
															values={designation.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name="designation_id"
															type="text"
															method="switch"
														/>
														<CustomInput label="Date of Joining" name="date_of_joining" type="text" />
													</div>
												</div>
												<div className={styles.personalInputHolder}>
													<div className={styles.inputHolder}>
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
															values={department.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name="department_id"
															type="text"
															method="switch"
														/>
													</div>
													<div className={styles.personalInputHolder}>
														<div className={styles.inputHolder}>
															<CustomInput label="Date of Resignation" name="date_of_termination" type="text" />
															<CustomInput label="ID Card No" name="id_card_no" type="text" />
														</div>
													</div>
												</div>
											</div>
										</Container>
										<Container {...containerProps} mt={"20px"} pb={"20px"}>
											<p>File Uploads</p>
											<div className={styles.uploadHolder}>
												<label className={styles.uploaderTitle} for="uploadImage">
													Upload Employee Image *
												</label>
												<Dropzone getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} />
											</div>

											<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
												<label className={styles.uploaderTitle} for="uploadID">
													Upload ID *
												</label>
												<Dropzone getUploadParams={this.getIdUploadParams} onChangeStatus={this.idHandleChangeStatus} {...dropDownProps} />
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
												<Button isLoading={loading} loadingText="Submitting" colorScheme="purple" onClick={() => handleSubmit()}>
													Create
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
