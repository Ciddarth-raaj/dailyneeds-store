//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import Dropzone from "react-dropzone-uploader";
import { Container, Flex, ButtonGroup, Button, Center, FormControl, FormLabel, Switch } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";

//Styles
import styles from "../../styles/registration.module.css";

//Helpers
import DocumentHelper from "../../helper/document";
import { BloodGroup, PaymentType } from "../../constants/values";
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
import moment from "moment";

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
	date_of_joining: "",
	date_of_termination: "",
	// id_card_no: "",
	gender: "Male",
	blood_group: "",
	designation_id: "",
	store_id: "",
	shift_id: "",
	department_id: "",
	marital_status: "Married",
	marriage_date: "",
	employee_image: "",

	bank_name: "",
	ifsc: "",
	account_no: "",

	esi: 0,
	esi_number: "",
	pf: 0,
	pf_number: "",
	UAN: "",
	additional_course: "",
	spouse_name: "",
	online_portal: 0,

	payment_type: 0,
	file: [
		{
			id_card: "",
			id_card_no: "",
			file: "",
		},
		{
			id_card: "",
			id_card_no: "",
			file: "",
		},
		{
			id_card: "",
			id_card_no: "",
			file: "",
		}
	],
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
			subUploadId: [],
			idHolder: [],
			subIdHolder: [],
			docType: [],
			imageHolder: [],
			employeeCards: false,
			subIdHolder2: [],
			pfToggle: false,
			esiToggle: false,
		};
	}

	componentDidMount() {
		this.getDesignation();
		this.getDepartment();
		this.getShift();
		this.getDocumentType();
		console.log({ jesus: INITIAL_VALUES })
	}

	getShift() {
		ShiftHelper.getShift()
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
	getDocumentType() {
		DocumentHelper.getDocType()
			.then((data) => {
				this.setState({ docType: data })
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

	CreateEmployee = async (values) => {
		try {
			const Idarray = [];
			Idarray.push(await FilesHelper.upload(
				this.state.idHolder,
				"uploadId",
				"dashboard_file"
			));
			values.file[0].file = Idarray.length > 0 ? Idarray[0].remoteUrl : "";

			if (this.state.subIdHolder !== "") {
				const Subarray = [];
				Subarray.push(await FilesHelper.upload(
					this.state.subIdHolder,
					"subUploadId",
					"dashboard_file"
				));
				values.file[1].file = Subarray.length > 0 ? Subarray[0].remoteUrl : "";
			}

			if (this.state.subIdHolder !== "") {
				const Subarray = [];
				Subarray.push(await FilesHelper.upload(
					this.state.subIdHolder,
					"subUploadId",
					"dashboard_file"
				));
				values.file[2].file = Subarray.length > 0 ? Subarray[0].remoteUrl : "";
			}
			const Imagearray = [];
			Imagearray.push(await FilesHelper.upload(
				this.state.imageHolder,
				"uploadImage",
				"dashboard_file"
			));
			values.employee_image = Imagearray.length > 0 ? Imagearray[0].remoteUrl : "";
		} catch (err) {
			console.log(err);
		}
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
		const { imageHolder } = this.state;
		return { url: imageHolder };
	};

	getIdUploadParams = ({ meta }) => {
		const { idHolder } = this.state;
		return { url: idHolder };
	};

	getSubIdUploadParams = ({ meta }) => {
		const { subIdHolder } = this.state;
		return { url: subIdHolder };
	};
	getNewSubIdUploadParams = ({ meta }) => {
		const { subIdHolder2 } = this.state;
		return { url: subIdHolder2 };
	};
	idHandleChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				this.setState({ idHolder: file });
			} catch (err) {
				console.log(err);
			}
		}
	};

	subIdHandleChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				this.setState({ subIdHolder: file });
			} catch (err) {
				console.log(err);
			}
		}
	};

	NewSubIdHandleChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				this.setState({ subIdHolder2: file });
			} catch (err) {
				console.log(err);
			}
		}
	};
	imageChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				this.setState({ imageHolder: file });
			} catch (err) {
				console.log(err);
			}
		}
	};

	handleSubmit = async (files) => {
		console.log(files);
	};

	render() {
		const { loading, designation, department, shift, employeeCards, docType, pfToggle, esiToggle } = this.state;
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
						const { handleSubmit, values } = formikProps;
						console.log(values);
						return (
							<Form>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Flex>
									<Container p={"0px"}>
										<Container {...containerProps} mb="20px">
											<p>Employee Information</p>

											<div>
												<div className={styles.personalInputHolder}>
													<div className={styles.uploadHolder}>
														<label className={styles.uploaderTitle} for="uploadImage">
															Upload Employee Image *
														</label>
														<Dropzone getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} />
													</div>
													<div className={styles.inputHolder}>
														<CustomInput label="Employee ID *" name="id_number" type="text" />

														<CustomInput label="Name *" name="employee_name" type="text" />
													</div>
												</div>
												<div className={styles.inputHolder}>
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
													<CustomInput label="Email ID" name="email_id" type="text" />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Primary Mobile Number *" name="primary_contact_number" type="text" />
													<CustomInput label="Alternate Mobile Number" name="alternate_contact_number" type="text" />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Date of Joining"
														name="date_of_joining"
														type="text"
													/>
												</div>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p>Personal Details</p>
											<div>
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
													<div className={styles.inputHolder}>
														<CustomInput
															label="Date of Birth *"
															name="dob"
															type="text"
														/>
													</div>
												</div>
												<div className={styles.personalInputHolder}	>
													{values.marital_status === "Married" && (
														<CustomInput
															label="Marriage Date *"
															name="marriage_date"
															type="text"
														/>
													)}
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Permanent Address *" name="permanent_address" type="text" method="TextArea" />
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Residential Address *" name="residential_address" type="text" method="TextArea" />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Father Name *" name="father_name" type="text" />
													{values.marital_status === "Married" &&
														<CustomInput label="Spouse Name *" name="spouse_name" type="text" />
													}
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput
														label="Blood Group"
														values={BloodGroup.map((m) => ({
															id: m.id,
															value: m.value
														}))}
														name="blood_group"
														type="text"
														method="switch"
													/>

												</div>
											</div>
										</Container>

										<Container {...containerProps} mb="20px">
											<p>Current Position</p>

											<div>
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
													</div>
													<div className={styles.inputHolder}>
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
												</div>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p>Education Details</p>
											<div>
												<div className={styles.inputHolder}>
													<CustomInput label="Educational Qualification *" name="qualification" type="text" />
													<CustomInput label="Previous Experience" name="previous_experience" type="text" />
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Additional Courses" name="additional_course" type="text" method="TextArea" />
												</div>
											</div>
										</Container>
									</Container>
									<Container>
										<Container {...containerProps} pb={"20px"} mb={"20px"}>
											<p>Employee Identity</p>

											<div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Payment Type *"
														values={PaymentType.map((m) => ({
															id: m.id,
															value: m.value
														}))}
														name="payment_type"
														type="text"
														method="switch"
													/>
												</div>
												{values.payment_type === "1" && (
													<>
														<div className={styles.inputHolder}>
															<CustomInput label="Bank Name *" name="bank_name" type="text" />
															<CustomInput label="IFSC Code *" name="ifsc" type="text" />
														</div>
														<div className={styles.inputHolder}>
															<CustomInput label="Account Number *" name="account_no" type="text" />
														</div>
													</>
												)}
												<div className={styles.inputHolder} style={{ marginTop: 20, marginBottom: 0 }}>
													<CustomInput label="Unifrom" name="uniform_qty" type="text" containerStyle={{ marginBottom: 30 }} />
												</div>
												<div className={styles.inputHolder} style={{ marginBottom: 0 }}>
													<CustomInput label="New ID Card Type" values={docType.map((d) => ({ id: d.id, value: d.value }))} name="file[2].id_card" type="text" method="switch" containerStyle={{ marginTop: 30, marginBottom: 30 }} />
												</div>
												<br />
												<div className={styles.inputHolder}>
													<CustomInput label="New ID Card No" name="file[2].id_card_no" type="text" containerStyle={{ marginBottom: 0 }} />
												</div>
												<br />
												<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
													<label className={styles.uploaderTitle} for="subUploadID">
														Upload ID *
													</label>
													<Dropzone getUploadParams={this.getNewSubIdUploadParams} onChangeStatus={this.NewSubIdHandleChangeStatus} {...dropDownProps} />
												</div>
												<div className={styles.inputHolder} style={{ marginTop: 20, marginBottom: 20 }} >
													<Button isLoading={loading} loadingText="Generating" colorScheme="purple" onClick={() => this.setState({ employeeCards: !employeeCards })}>
														{employeeCards === true ? "Remove" : "Add"}
													</Button>
												</div>
												{employeeCards === true && (
													<>
														<div className={styles.inputHolder} style={{ marginBottom: 0 }}>
															<CustomInput label="ID Card Type" name="file[0].id_card" values={docType.map((d) => ({ id: d.id, value: d.value }))} type="text" method="switch" containerStyle={{ marginBottom: 30 }} />
														</div>


														<div className={styles.inputHolder}>
															<CustomInput label="ID Card No" name="file[0].id_card_no" type="text" containerStyle={{ marginBottom: 0 }} />
														</div>

														<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
															<label className={styles.uploaderTitle} for="uploadID">
																Upload ID *
															</label>
															<Dropzone getUploadParams={this.getIdUploadParams} onChangeStatus={this.idHandleChangeStatus} {...dropDownProps} />
														</div>
														<div className={styles.inputHolder} style={{ marginBottom: 0 }}>
															<CustomInput label="New ID Card Type" values={docType.map((d) => ({ id: d.id, value: d.value }))} name="file[1].id_card" type="text" method="switch" containerStyle={{ marginTop: 30, marginBottom: 30 }} />
														</div>

														<div className={styles.inputHolder}>
															<CustomInput label="New ID Card No" name="file[1].id_card_no" type="text" containerStyle={{ marginBottom: 0 }} />
														</div>

														<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
															<label className={styles.uploaderTitle} for="subUploadID">
																Upload ID *
															</label>
															<Dropzone getUploadParams={this.getSubIdUploadParams} onChangeStatus={this.subIdHandleChangeStatus} {...dropDownProps} />
														</div>
													</>
												)}
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p>{"PF & ESI"}</p>

											<div>
												<div className={styles.personalInputHolder} >
													<div className={styles.inputHolder}>
														<CustomInput label="PAN No *" name="id_card_no" type="text" />
													</div>
													<div className={styles.switchHolder}>
														<label>PF Number & UAN Number</label>
														<Switch className={styles.switch} id="email-alerts" onChange={() => this.setState({ pfToggle: !pfToggle })} />
													</div>
												</div>
												{pfToggle === true && (
													<div className={styles.inputHolder}>
														<CustomInput label="PF Number *" name="pf_number" type="text" />
														<CustomInput label="UAN Number *" name="UAN" type="text" />
													</div>
												)}
												<div className={styles.switchHolder}>
													<label>ESI Number</label>
													<Switch className={styles.switch} id="email-alerts" onChange={() => this.setState({ esiToggle: !esiToggle })} />
												</div>
												{esiToggle === true && (
													<div className={styles.inputHolder}>
														<CustomInput label="ESI Number *" name="esi_number" type="text" />
													</div>
												)}
											</div>
										</Container>
										<Container {...containerProps} pb={"20px"}>
											<p>Salary Details</p>

											<div className={styles.inputHolder}>
												<CustomInput label="Salary / Month *" name="salary" type="text" containerStyle={{ marginBottom: 0 }} />
											</div>
										</Container>
										<br />
										<Container {...containerProps} pb={"20px"}>
											<p>Others</p>

											<div className={styles.personalInputHolder}>
												<CustomInput
													label="Introducer's Name"
													name="introducer_name"
													type="text"
												/>
											</div>
											<div className={styles.personalInputHolder}>
												<CustomInput
													label="Introducer Details"
													name="introducer_details"
													type="text"
													method="TextArea"
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
