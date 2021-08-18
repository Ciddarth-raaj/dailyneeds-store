import React from "react";

import Head from "../util/head";
import SideBar from "../components/sideBar/sideBar";
import Header from "../components/header/header";

import styles from "../styles/registration.module.css";

import { Container, Flex, Grid, GridItem, Spacer } from "@chakra-ui/react";
import { Input } from "@chakra-ui/react";
import { Textarea } from "@chakra-ui/react";
import { Select } from "@chakra-ui/react";

import Dropzone from "react-dropzone-uploader";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";

export default class Registration extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			profileImage: undefined,
			name: "",
			fatherName: "",
			dob: "",
			permanentAddress: "",
			residentialAddress: "",
			contactNo: "",
			alternateNo: "",
			email: "",
			educationalQualification: "",
			introducerName: "",
			introducerDetails: "",
			employeeId: "",
			salary: "",
			unifrom: "",
			experience: "",
			joiningDate: "",
			resignationDate: "",
			idNo: "",
		};
	}
	componentDidMount() {}

	registration() {
		RegistrationHelper.insertDet()
			.then((data) => {
				if (data.code == 200) {
					alert("success!");
				}
			})
			.catch((err) => console.log(err));
	}
	async getData() {
		try {
			const {
				profileImage,
				name,
				fatherName,
				dob,
				permanentAddress,
				residentialAddress,
				contactNo,
				alternateNo,
				email,
				educationalQualification,
				introducerName,
				introducerDetails,
				employeeId,
				salary,
				unifrom,
				experience,
				joiningDate,
				resignationDate,
				idNo,
				gender_id,
				marital_id,
				store_id,
				department_id,
				designation_id,
				shift_id,
				card_type_id,
				blood_group_id,
			} = this.state;
			const alertInitText = "";
			let alertText = alertInitText;
			if (name === "") {
				alertText += "• Name\n";
			}

			if (fatherName === "") {
				alertText += "• Father Name\n";
			}
			if (dob === "") {
				alertText += "• Date of Birth\n";
			}
			if (permanentAddress === "") {
				alertText += "• Permanent Address";
			}
			if (residentialAddress === "") {
				alertText += "• Residential Address";
			}
			if (contactNo === "") {
				alertText += "• Contact No";
			}
			if (alternateNo === "") {
				alertText += "• Alternate No";
			}
			if (email === "") {
				alertText += "• Email";
			}
			if (educationalQualification === "") {
				alertText += "• Educational Qualification";
			}
			if (introducerName === "") {
				alertText += "• Introducer Name";
			}
			if (introducerDetails === "") {
				alertText += "• Introducer Details";
			}
			if (salary === "") {
				alertText += "• Salary";
			}
			if (unifrom === "") {
				alertText += "• unifrom";
			}
			if (idNo === "") {
				alertText += "• ID Number";
			}
			if (experience === "") {
				alertText += "• Experience";
			}
			if (joiningDate === "") {
				alertText += "• Joining Date";
			}
			if (resignationDate === "") {
				alertInitText += "• Resignation Date";
			}
			if (employeeId === "") {
				alertText += "• Employee ID";
			}
			if (gender_id === 0) {
				alertText += "• Gender ID";
			}
			if (marital_id === 0) {
				alertText += "• Marital ID";
			}
			if (store_id === 0) {
				alertText += "• Store ID";
			}
			if (department_id === 0) {
				alertText += "• Department ID";
			}
			if (designation_id === 0) {
				alertText += "• Designation ID";
			}
			if (shift_id === 0) {
				alertText += "• Shift ID";
			}
			if (card_type_id === 0) {
				alertText += "• Card Type ID";
			}
			if (blood_group_id === 0) {
				alertText += "• Blood Group ID";
			}
			if (profileImage !== undefined && profileImage != null) {
				if (check("profileImage", brochure))
					this.filesData["profileImage"] = {
						key: "profileImage",
						url: (
							await FilesHelper.upload(
								profileImage,
								"profileImage",
								"/" + name
							)
						).data,
						file: profileImage,
					};
			}

			const data = {
				name: name,
				fatherName: fatherName,
				dob: dob,
				permanentAddress: permanentAddress,
				residentialAddress: residentialAddress,
				contactNo: contactNo,
				alternateNo: alternateNo,
				email: email,
				educationalQualification: educationalQualification,
				introducerName: introducerName,
				introducerDetails: introducerDetails,
				employeeId: employeeId,
				salary: salary,
				unifrom: unifrom,
				experience: experience,
				joiningDate: joiningDate,
				resignationDate: resignationDate,
				idNo: idNo,
				gender_id: gender_id,
				marital_id: marital_id,
				store_id: store_id,
				department_id: department_id,
				designation_id: designation_id,
				shift_id: shift_id,
				card_type_id: card_type_id,
				blood_group_id: blood_group_id,
			};
			if (this.filesData["profileImage"] !== undefined) {
				data.profileImage = this.filesData["profileImage"].url;
			}
		} catch (err) {
			this.logError(err);
		}
	}

	getInputField(key, label, accept) {
		return (
			<div>
				<div className={`${styles.fileInputDiv} inputText`}>
					<label>{label}</label>
					<input
						type="file"
						accept={accept}
						onChange={(e) =>
							this.setState({ [key]: e.target.files[0] })
						}
					/>
				</div>
				{this.state[key] !== undefined && this.state[key] != null && (
					<img
						src={
							typeof this.state[key] == "string"
								? this.state[key]
								: URL.createObjectURL(this.state[key])
						}
						className={styles.imageThumbnail}
					/>
				)}
			</div>
		);
	}
	render() {
		const getUploadParams = ({ meta }) => {
			return { url: "https://httpbin.org/post" };
		};

		const handleChangeStatus = ({ meta, file }, status) => {
			console.log(status, meta, file);
		};

		const handleSubmit = (files) => {
			console.log(files.map((f) => f.meta));
		};
		const {
			name,
			fatherName,
			dob,
			permanentAddress,
			residentialAddress,
			contactNo,
			alternateNo,
			email,
			educationalQualification,
			introducerName,
			introducerDetails,
			employeeId,
			salary,
			unifrom,
			experience,
			joiningDate,
			resignationDate,
			idNo,
			gender_id,
			marital_id,
			store_id,
			department_id,
			designation_id,
			shift_id,
			card_type_id,
			blood_group_id,
		} = this.state;
		return (
			<GlobalWrapper title="New Employee">
				<Head />
				<Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
					<Container className={styles.container}>
						<p>Personal Details</p>
						<div className={styles.personalInputHolder}>
							<div className={styles.inputHolder}>
								<div className={styles.personalInputs}>
									<label for="name">Name</label>
									<Input
										placeholder="Name"
										size="sm"
										id="name"
										width="230px"
										value={name}
										onChange={(e) =>
											this.setState({
												name: e.target.value,
											})
										}
										className={styles.inputField}
									/>
								</div>
								<div className={styles.personalInputs}>
									<label for="fatherName">
										Father/Spouse Name
									</label>
									<Input
										placeholder="Father Name"
										size="sm"
										id="fatherName"
										width="230px"
										className={styles.inputField}
										value={fatherName}
										onChange={(e) =>
											this.setState({
												fatherName: e.target.value,
											})
										}
									/>
								</div>
								<div className={styles.personalInputs}>
									<label for="dob">Date of Birth</label>
									<Input
										placeholder="date of birth"
										size="sm"
										id="dob"
										width="230px"
										className={styles.inputField}
										value={dob}
										onChange={(e) =>
											this.setState({
												dob: e.target.value,
											})
										}
									/>
								</div>
							</div>
							<div className={styles.inputHolder}>
								<div className={styles.personalInputs}>
									<label for="gender">Gender</label>
									<Select
										placeholder="Choose gender"
										for="gender"
										width="230px"
										value={gender_id}
										onChange={(e) =>
											this.setState({
												gender_id: e.target.value,
											})
										}
									>
										<option value="option1">Male</option>
										<option value="option2">Female</option>
										<option value="option3">
											Transgender
										</option>
									</Select>
								</div>
								<div className={styles.personalInputs}>
									<label for="contactNo">
										Primary Contact No
									</label>
									<Input
										placeholder="Contact Number"
										size="sm"
										id="contactNo"
										width="230px"
										className={styles.inputField}
										value={contactNo}
										onChange={(e) =>
											this.setState({
												contactNo: e.target.value,
											})
										}
									/>
								</div>
								<div className={styles.personalInputs}>
									<label for="alternateNo">
										Alternative Contact No
									</label>
									<Input
										placeholder="Alternate Contact Number"
										size="sm"
										id="alternateNo"
										width="230px"
										className={styles.inputField}
										value={alternateNo}
										onChange={(e) =>
											this.setState({
												alternateNo: e.target.value,
											})
										}
									/>
								</div>
							</div>
						</div>
						<div className={styles.inputHolder}>
							<div className={styles.personalInputs}>
								<label for="dob">Permanent Address</label>
								<Textarea
									placeholder="Permanent Address"
									size="sm"
									id="dob"
									height="150px"
									className={styles.textField}
									value={permanentAddress}
									onChange={(e) =>
										this.setState({
											permanentAddress: e.target.value,
										})
									}
								/>
							</div>
							<div className={styles.personalInputs}>
								<label for="residentialAddress">
									Residential Address
								</label>
								<Textarea
									placeholder="Residential Address"
									size="sm"
									id="residentialAddress"
									height="150px"
									className={styles.textField}
									value={residentialAddress}
									onChange={(e) =>
										this.setState({
											residentialAddress: e.target.value,
										})
									}
								/>
							</div>
							<div className={styles.personalInputHolder}>
								<div className={styles.inputHolder}>
									<div className={styles.personalInputs}>
										<label for="email">Email ID</label>
										<Input
											placeholder="Email ID"
											size="sm"
											id="email"
											width="230px"
											className={styles.inputField}
											value={email}
											onChange={(e) =>
												this.setState({
													email: e.target.value,
												})
											}
										/>
									</div>
									<div className={styles.personalInputs}>
										<label for="bloodgroup">
											Blood Group
										</label>
										<Select
											placeholder="Choose gender"
											for="bloodgroup"
											width="230px"
											value={blood_group_id}
											onChange={(e) =>
												this.setState({
													blood_group_id:
														e.target.value,
												})
											}
										>
											<option value="option1">
												Blood group1
											</option>
											<option value="option2">
												Blood group2
											</option>
											<option value="option3">
												blood group3
											</option>
										</Select>
									</div>
									<div className={styles.personalInputs}>
										<label for="qualification">
											Educational Qualification
										</label>
										<Input
											placeholder="Educational Qualification"
											size="sm"
											id="qualification"
											width="230px"
											className={styles.inputField}
											value={educationalQualification}
											onChange={(e) =>
												this.setState({
													educationalQualification:
														e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className={styles.inputHolder}>
									<div className={styles.personalInputs}>
										<label for="introducerName">
											Introducer's Name
										</label>
										<Input
											placeholder="Introducer Name"
											size="sm"
											id="introducerName"
											width="230px"
											className={styles.inputField}
											value={introducerName}
											onChange={(e) =>
												this.setState({
													introducerName:
														e.target.value,
												})
											}
										/>
									</div>
									<div className={styles.personalInputs}>
										<label for="salary">
											Salary / Month
										</label>
										<Input
											placeholder="Salary"
											size="sm"
											id="salary"
											width="230px"
											className={styles.inputField}
											value={salary}
											onChange={(e) =>
												this.setState({
													salary: e.target.value,
												})
											}
										/>
									</div>
									<div className={styles.personalInputs}>
										<label for="maritalStatus">
											Marital Status
										</label>
										<Select
											placeholder="Marital Status"
											for="maritalStatus"
											width="230px"
											value={marital_id}
											onChange={(e) =>
												this.setState({
													marital_id: e.target.value,
												})
											}
										>
											<option value="option1">
												Single
											</option>
											<option value="option2">
												Married
											</option>
											<option value="option3">
												Divorced
											</option>
										</Select>
									</div>
								</div>
							</div>
							<div className={styles.personalInputs}>
								<label for="introducerDetails">
									Introducer Details
								</label>
								<Textarea
									placeholder="Introducer Details"
									size="sm"
									id="introducerDetails"
									height="150px"
									className={styles.textField}
									value={introducerDetails}
									onChange={(e) =>
										this.setState({
											introducerDetails: e.target.value,
										})
									}
								/>
							</div>
						</div>
					</Container>

					<Container>
						<Container className={styles.container}>
							<p>Employee Details</p>
							<div className={styles.employeeHolder}>
								<div className={styles.employeeInputHolder}>
									<div className={styles.personalInputs}>
										<label for="employeeId">
											Employee ID{" "}
										</label>
										<Input
											placeholder="Employee Id"
											size="sm"
											id="employeeId"
											width="255px"
											className={styles.inputField}
											value={employeeId}
											onChange={(e) =>
												this.setState({
													employeeId: e.target.value,
												})
											}
										/>
									</div>

									<div className={styles.personalInputs}>
										<label for="experience">
											Previous Experience
										</label>
										<Input
											placeholder="Experience"
											size="sm"
											id="experience"
											width="255px"
											className={styles.inputField}
											value={experience}
											onChange={(e) =>
												this.setState({
													experience: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className={styles.employeeInputHolder}>
									<div className={styles.personalInputs}>
										<label for="unifrom">Unifrom</label>
										<Input
											placeholder="Unifrom"
											size="sm"
											id="unifrom"
											width="255px"
											className={styles.inputField}
											value={unifrom}
											onChange={(e) =>
												this.setState({
													unifrom: e.target.value,
												})
											}
										/>
									</div>
									<div className={styles.personalInputs}>
										<label for="cardType">
											ID Card Type
										</label>
										<Select
											placeholder="ID Card Type"
											for="cardType"
											width="255px"
											value={card_type_id}
											onChange={(e) =>
												this.setState({
													card_type_id:
														e.target.value,
												})
											}
										>
											<option value="option1">
												card1
											</option>
											<option value="option2">
												card2
											</option>
											<option value="option3">
												card3
											</option>
										</Select>
									</div>
								</div>
								<div className={styles.employeeInputHolder}>
									<div className={styles.personalInputs}>
										<label for="shiftDetails">
											Shift Details
										</label>
										<Select
											placeholder="Shift Details"
											for="shiftDetails"
											width="255px"
											value={shift_id}
											onChange={(e) =>
												this.setState({
													shift_id: e.target.value,
												})
											}
										>
											<option value="option1">
												card1
											</option>
											<option value="option2">
												card2
											</option>
											<option value="option3">
												card3
											</option>
										</Select>
									</div>
									<div className={styles.personalInputs}>
										<label for="designation">
											Select Designation
										</label>
										<Select
											placeholder="Select Designation Details"
											for="designation"
											width="255px"
											value={designation_id}
											onChange={(e) =>
												this.setState({
													designation_id:
														e.target.value,
												})
											}
										>
											<option value="option1">
												Designation1
											</option>
											<option value="option2">
												Designation2
											</option>
											<option value="option3">
												Designation3
											</option>
										</Select>
									</div>
								</div>
								<div className={styles.employeeInputHolder}>
									<div className={styles.personalInputs}>
										<label for="joining">
											Date of Joining
										</label>
										<Input
											placeholder="DD/MM/YYYY"
											size="sm"
											id="joining"
											width="255px"
											className={styles.inputField}
											value={joiningDate}
											onChange={(e) =>
												this.setState({
													joiningDate: e.target.value,
												})
											}
										/>
									</div>
									<div className={styles.personalInputs}>
										<label for="resignationDate">
											Date of Resignation
										</label>
										<Input
											placeholder="DD/MM/YYYY"
											size="sm"
											id="resignationDate"
											width="255px"
											className={styles.inputField}
											value={resignationDate}
											onChange={(e) =>
												this.setState({
													resignationDate:
														e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className={styles.employeeInputHolder}>
									<div className={styles.personalInputs}>
										<label for="cardNo">ID Card No</label>
										<Input
											placeholder="ID Card No"
											size="sm"
											id="cardNo"
											width="255px"
											className={styles.inputField}
											value={idNo}
											onChange={(e) =>
												this.setState({
													idNo: e.target.value,
												})
											}
										/>
									</div>
									<div className={styles.personalInputs}>
										<label for="store">Select Store</label>
										<Select
											placeholder="Select Store"
											for="store"
											width="255px"
											value={store_id}
											onChange={(e) =>
												this.setState({
													store_id: e.target.value,
												})
											}
										>
											<option value="option1">
												Store1
											</option>
											<option value="option2">
												Store2
											</option>
											<option value="option3">
												Store3
											</option>
										</Select>
									</div>
								</div>
								<div className={styles.employeeInputHolder}>
									<div className={styles.personalInputs}>
										<label for="department">
											Select Department
										</label>
										<Select
											placeholder="Select Department"
											for="department"
											width="255px"
											value={department_id}
											onChange={(e) =>
												this.setState({
													department_id:
														e.target.value,
												})
											}
										>
											<option value="option1">
												department1
											</option>
											<option value="option2">
												department2
											</option>
											<option value="option3">
												department3
											</option>
										</Select>
									</div>
								</div>
							</div>
						</Container>

						<Container className={styles.container}>
							<div className={styles.uploadHolder}>
								<label
									className={styles.uploaderTitle}
									for="uploadImage"
								>
									Upload Image :
								</label>
								<Dropzone
									getUploadParams={getUploadParams}
									onChangeStatus={handleChangeStatus}
									onSubmit={handleSubmit}
									accept="image/*,audio/*,video/*"
									id="uploadImage"
								/>
							</div>

							<div className={styles.uploadHolder}>
								<label
									className={styles.uploaderTitle}
									for="uploadID"
								>
									Upload ID :
								</label>
								<Dropzone
									getUploadParams={getUploadParams}
									onChangeStatus={handleChangeStatus}
									onSubmit={handleSubmit}
									accept="image/*,audio/*,video/*"
									id="uploadID"
								/>
							</div>
							<button
								onClick={() => this.getData()}
								className={`button ${styles.button}`}
							>
								{"Submit"}
							</button>
						</Container>
					</Container>
				</Flex>
			</GlobalWrapper>
		);
	}
}
