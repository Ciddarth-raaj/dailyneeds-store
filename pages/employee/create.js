//External Dependencies
import React from "react";
import { Formik, Form, FieldArray } from "formik";
import Dropzone from "react-dropzone-uploader";
import { Container, Flex, ButtonGroup, Button, Switch } from "@chakra-ui/react";
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
	employee_name: "Ciddarth Raaj",
	father_name: "Jeyakumar",
	dob: "08/11/2000",
	permanent_address: "2.177-3, first main road, madurai",
	residential_address: "2.177-3, first main road, madurai",
	primary_contact_number: "9003945219",
	alternate_contact_number: "9003945219",
	email_id: "ciddarth@luxgenic.com",
	qualification: "Btech",
	introducer_name: "Akhil",
	introducer_details: "Bad Guy",
	salary: "10000",
	uniform_qty: "2",
	previous_experience: "2 Years",
	date_of_joining: "08/11/2020",
	gender: "Male",
	blood_group: "b+ve",
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
	pan_no: "",
	payment_type: 0,
	files: [
		{
			id_card: "",
			id_card_no: "",
			id_card_name: "",
			expiry_date: "",
			file: "",
		},
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
			licenseHolder: [],
			adhaarHolder: [],
			voterHolder: [],
			subIdHolder: [],
			docType: [],
			imageHolder: [],
			employeeCards: false,
			subIdHolder2: [],
			pfToggle: false,
			esiToggle: false,

			editableEmpInfo: false,
			editablePerInfo: false,
			editablePosiInfo: false,
			editableEducaInfo: false,
			editableIdenInfo: false,
			editablePFInfo: false,
			editableSalInfo: false,
			editableOtherInfo: false,

			loadingEmpInfo: false,
			loadingPerInfo: false,
			loadingPosiInfo: false,
			loadingEducaInfo: false,
			loadingIdenInfo: false,
			loadingPFInfo: false,
			loadingSalInfo: false,
			loadingOtherInfo: false,
		};
	}

	componentDidMount() {
		this.getDesignation();
		this.getDepartment();
		this.getShift();
		this.getDocumentType();
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

			const Imagearray = [];
			Imagearray.push(await FilesHelper.upload(
				this.state.imageHolder,
				"uploadImage",
				"dashboard_file"
			));
			values.employee_image = Imagearray.length > 0 ? Imagearray[0].remoteUrl : "";

			const Idarray = [];
			Idarray.push(await FilesHelper.upload(
				this.state.licenseHolder,
				"licenseUpload",
				"dashboard_file"
			));
			for (let i = 0; i < values.files.length; i++) {
				if (values.files[i].id_card === "2") {
					values.files[i].file = Idarray.length > 0 ? Idarray[0].remoteUrl : "";
				}
			}

			if (this.state.voterHolder !== "") {
				const Subarray = [];
				Subarray.push(await FilesHelper.upload(
					this.state.voterHolder,
					"voterIdUpload",
					"dashboard_file"
				));
				for (let i = 0; i < values.files.length; i++) {
					if (values.files[i].id_card === "3") {
						values.files[i].file = Subarray.length > 0 ? Subarray[0].remoteUrl : "";
					}
				}
			}

			if (this.state.adhaarHolder !== "") {
				const Subarray = [];
				Subarray.push(await FilesHelper.upload(
					this.state.adhaarHolder,
					"adhaarUpload",
					"dashboard_file"
				));
				for (let i = 0; i <= values.files.length; i++) {
					if (values.files[i].id_card === "1") {
						values.files[i].file = Subarray.length > 0 ? Subarray[0].remoteUrl : "";
					}
				}
			}
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

	licenseUploadParams = ({ meta }) => {
		const { licenseHolder } = this.state;
		return { url: licenseHolder };
	};

	licenseChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				this.setState({ licenseHolder: file });
			} catch (err) {
				console.log(err);
			}
		}
	};

	adhaarUploadParams = ({ meta }) => {
		const { adhaarHolder } = this.state;
		return { url: adhaarHolder };
	};

	adhaarChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				this.setState({ adhaarHolder: file });
			} catch (err) {
				console.log(err);
			}
		}
	};
	voterIdUploadParams = ({ meta }) => {
		const { voterHolder } = this.state;
		return { url: voterHolder };
	};

	voterIdChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				this.setState({ voterHolder: file });
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
		const { 
			loading,
			designation,
			department,
			shift,
			employeeCards,
			docType,
			pfToggle,
			esiToggle,
			editableEmpInfo,
			editablePerInfo,
			editablePosiInfo,
			editableEducaInfo,
			editableIdenInfo,
			editablePFInfo,
			editableSalInfo,
			editableOtherInfo,
			loadingEmpInfo,
			loadingPerInfo,
			loadingPosiInfo,
			loadingEducaInfo,
			loadingIdenInfo,
			loadingPFInfo,
			loadingSalInfo,
			loadingOtherInfo,
		} = this.state;
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
						const handleEvent = () => {
							this.setState([...values.files, { id_card: "", id_card_no: "", file: "" }])
						}
						return (
							<Form>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Flex>
									<Container p={"0px"}>
										<Container {...containerProps} mb="20px">
											<p className={styles.title}>
												<div>Employee Information</div>
													<Button isLoading={loadingEmpInfo} variant="outline"
														leftIcon={editableEmpInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />} 
														colorScheme="purple" 
														onClick={() => this.setState({editableEmpInfo: !editableEmpInfo})}
													>
														{editableEmpInfo ? "Save": "Edit"}
													</Button>
											</p>

											<div>
												<div className={styles.personalInputHolder}>
													<div className={styles.uploadHolder}>
														<label className={styles.uploaderTitle} for="uploadImage">
															Upload Employee Image *
														</label>
														<Dropzone getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} />
													</div>
													<div className={styles.inputHolder}>
														<CustomInput label="Name *" name="employee_name" type="text" editable={editableEmpInfo} />
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
														editable={editableEmpInfo}
													/>
													<CustomInput label="Email ID" name="email_id" type="text" editable={editableEmpInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Primary Mobile Number *" name="primary_contact_number" type="text" editable={editableEmpInfo} />
													<CustomInput label="Alternate Mobile Number" name="alternate_contact_number" type="text" editable={editableEmpInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Date of Joining"
														name="date_of_joining"
														type="text"
														editable={editableEmpInfo}
													/>
												</div>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>Personal Details</div>
													<Button isLoading={loadingPerInfo} variant="outline"
														leftIcon={editablePerInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple"
														onClick={() => this.setState({editablePerInfo: !editablePerInfo})}
													>
														{editablePerInfo ? "Save" : "Edit"}
													</Button>
											</p>
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
														editable={editablePerInfo}
													/>
													<div className={styles.inputHolder}>
														<CustomInput
															label="Date of Birth *"
															name="dob"
															type="text"
															editable={editablePerInfo}
														/>
													</div>
												</div>
												<div className={styles.personalInputHolder}	>
													{values.marital_status === "Married" && (
														<CustomInput
															label="Marriage Date"
															name="marriage_date"
															type="text"
															editable={editablePerInfo}
														/>
													)}
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Permanent Address *" name="permanent_address" type="text" method="TextArea" editable={editablePerInfo} />
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Residential Address *" name="residential_address" type="text" method="TextArea" editable={editablePerInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Father Name *" name="father_name" type="text" editable={editablePerInfo} />
													{values.marital_status === "Married" &&
														<CustomInput label="Spouse Name" name="spouse_name" type="text" editable={editablePerInfo} />
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
														editable={editablePerInfo}
													/>

												</div>
											</div>
										</Container>

										<Container {...containerProps} mb="20px">
											<p className={styles.title}>
												<div>Current Position</div>
													<Button isLoading={loadingPosiInfo} variant="outline"
														leftIcon={editablePosiInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />} 
														colorScheme="purple" 
														onClick={() => this.setState({editablePosiInfo: !editablePosiInfo})}
													>
														{editablePosiInfo ? "Save" : "Edit"}
													</Button>
											</p>

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
															editable={editablePosiInfo}
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
															editable={editablePosiInfo}
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
															editable={editablePosiInfo}
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
															editable={editablePosiInfo}
														/>
													</div>
												</div>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>Education Details</div>
													<Button isLoading={loadingEducaInfo} variant="outline"
														leftIcon={editableEducaInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />} 
														colorScheme="purple" 
														onClick={() => this.setState({editableEducaInfo: !editableEducaInfo})}
													>
														{editableEducaInfo ? "Save" : "Edit"}
													</Button>
											</p>
											<div>
												<div className={styles.inputHolder}>
													<CustomInput label="Educational Qualification *" name="qualification" type="text" editable={editableEducaInfo} />
													<CustomInput label="Previous Experience" name="previous_experience" type="text" editable={editableEducaInfo} />
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Additional Courses" name="additional_course" type="text" method="TextArea" editable={editableEducaInfo} />
												</div>
											</div>
										</Container>
									</Container>
									<Container>
										<Container {...containerProps} pb={"20px"} mb={"20px"}>
											<p className={styles.title}>
												<div>Employee Identity</div>
													<Button isLoading={loadingIdenInfo } variant="outline"
														leftIcon={editableIdenInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />} 
														colorScheme="purple" 
														onClick={() => this.setState({editableIdenInfo: !editableIdenInfo})}
													>
														{editableIdenInfo ? "Save" : "Edit"}
													</Button>
											</p>

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
														editable={editableIdenInfo}
													/>
												</div>
												{values.payment_type === "1" && (
													<>
														<div className={styles.inputHolder}>
															<CustomInput label="Bank Name *" name="bank_name" type="text" editable={editableIdenInfo} />
															<CustomInput label="IFSC Code *" name="ifsc" type="text" editable={editableIdenInfo} />
														</div>
														<div className={styles.inputHolder}>
															<CustomInput label="Account Number *" name="account_no" type="text" editable={editableIdenInfo} />
														</div>
													</>
												)}
												<FieldArray name="files">
													{fieldArrayProps => {
														const { push, remove, form } = fieldArrayProps
														const { values } = form
														const { files } = values;
														return <div>
															{files.map((file, index) => (
																<>
																	<div className={styles.inputHolder} key={index} style={{ marginBottom: 0 }}>
																		<CustomInput label="New ID Card Type" values={docType.map((d) => ({ id: d.id, value: d.value }))} name={`files[${index}].id_card`} type="text" method="switch" containerStyle={{ marginTop: 30, marginBottom: 30 }} editable={editableIdenInfo} />
																	</div>
																	{files[0].id_card && files[index].id_card === "1" && (
																		<>
																			<div className={styles.inputHolder} key={index}>
																				<CustomInput label="Adhaar Card Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<CustomInput label="Name in Adhaar Card" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<br />
																			</div>
																			<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
																				<label className={styles.uploaderTitle} for="subUploadID">
																					Upload ID *
																				</label>
																				<Dropzone getUploadParams={this.adhaarUploadParams} onChangeStatus={this.adhaarChangeStatus} {...dropDownProps} />
																			</div>
																		</>
																	)}
																	{files[0].id_card && files[index].id_card === "2" && (
																		<>
																			<div className={styles.inputHolder} key={index}>
																				<CustomInput label="Driving license Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<CustomInput label="Name in Driving License" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<CustomInput label="Expiry Date" name={`files[${index}].expiry_date`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<br />
																			</div>
																			<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
																				<label className={styles.uploaderTitle} for="subUploadID">
																					Upload ID *
																				</label>
																				<Dropzone getUploadParams={this.licenseUploadParams} onChangeStatus={this.licenseChangeStatus} {...dropDownProps} />
																			</div>
																		</>
																	)}
																	{files[0].id_card && files[index].id_card === "3" && (
																		<>
																			<div className={styles.inputHolder} key={index}>
																				<CustomInput label="Voter Id Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<CustomInput label="Name in Voter Id" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<br />
																			</div>
																			<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
																				<label className={styles.uploaderTitle} for="subUploadID">
																					Upload ID *
																				</label>
																				<Dropzone getUploadParams={this.voterIdUploadParams} onChangeStatus={this.voterIdChangeStatus} {...dropDownProps} />
																			</div>
																		</>
																	)}
																	<br />
																	{index > 0 && (
																		<Button className={styles.button} isLoading={loading} loadingText="Generating" colorScheme="red" onClick={() => remove(index)}>
																			{"Remove"}
																		</Button>
																	)}
																	<Button isLoading={loading} loadingText="Generating" colorScheme="purple" onClick={() => push('')}>
																		{"Add"}
																	</Button>
																</>
															))}
														</div>
													}}
												</FieldArray>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>PF & ESI</div>
													<Button isLoading={loadingPFInfo} variant="outline"
														leftIcon={editablePFInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />} 
														colorScheme="purple" 
														onClick={() => this.setState({editablePFInfo: !editablePFInfo})}
													>
														{editablePFInfo ? "Save" : "Edit"}
													</Button>
											</p>

											<div>
												<div className={styles.personalInputHolder} >
													<div className={styles.inputHolder}>
														<CustomInput label="PAN No *" name="pan_no" type="text" editable={editablePFInfo} />
													</div>
													<div className={styles.switchHolder}>
														<label>PF Number & UAN Number</label>
														<Switch className={styles.switch} id="email-alerts" onChange={() => this.setState({ pfToggle: !pfToggle })} />
													</div>
												</div>
												{pfToggle === true && (
													<div className={styles.inputHolder}>
														<CustomInput label="PF Number *" name="pf_number" type="text" editable={editablePFInfo} />
														<CustomInput label="UAN Number *" name="UAN" type="text" editable={editablePFInfo} />
													</div>
												)}
												<div className={styles.switchHolder}>
													<label>ESI Number</label>
													<Switch className={styles.switch} id="email-alerts" onChange={() => this.setState({ esiToggle: !esiToggle })} />
												</div>
												{esiToggle === true && (
													<div className={styles.inputHolder}>
														<CustomInput label="ESI Number *" name="esi_number" type="text" editable={editablePFInfo} />
													</div>
												)}
											</div>
										</Container>
										<Container {...containerProps} pb={"20px"}>
											<p className={styles.title}>
												<div>Salary Details</div>
													<Button isLoading={loadingSalInfo} variant="outline"
														leftIcon={editableSalInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />} 
														colorScheme="purple" 
														onClick={() => this.setState({editableSalInfo: !editableSalInfo})}
													>
														{editableSalInfo ? "Save" : "Edit"}
													</Button>
											</p>

											<div className={styles.inputHolder}>
												<CustomInput label="Salary / Month *" name="salary" type="text" containerStyle={{ marginBottom: 0 }} editable={editableSalInfo} />
											</div>
										</Container>
										<br />
										<Container {...containerProps} pb={"20px"}>
										<p className={styles.title}>
												<div>Others</div>
													<Button isLoading={loadingOtherInfo} variant="outline"
														leftIcon={editableOtherInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />} 
														colorScheme="purple" 
														onClick={() => this.setState({editableOtherInfo: !editableOtherInfo})}
													>
														{editableOtherInfo ? "Save" : "Edit"}
													</Button>
											</p>

											<div className={styles.inputHolder} style={{ marginTop: 20, marginBottom: 0 }}>
												<CustomInput label="Unifrom" name="uniform_qty" type="text" containerStyle={{ marginBottom: 30 }} editable={editableOtherInfo} />
											</div>

											<div className={styles.personalInputHolder}>
												<CustomInput
													label="Introducer's Name"
													name="introducer_name"
													type="text"
													editable={editableOtherInfo}
												/>
											</div>
											<div className={styles.personalInputHolder}>
												<CustomInput
													label="Introducer Details"
													name="introducer_details"
													type="text"
													method="TextArea"
													containerStyle={{ marginBottom: 10 }}
													editable={editableOtherInfo}
												/>
											</div>

											<ButtonGroup
												spacing="6"
												mt={10}
												style={{
													display: "flex",
													// width: "100%",
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
