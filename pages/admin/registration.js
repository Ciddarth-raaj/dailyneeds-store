import React from "react";
import Head from "../../util/head";
import SideBar from "../../components/sideBar/sideBar";
import Header from "../../components/header/header";
import styles from "../../styles/registration.module.css"
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
            gender_array: [
                {
                    gender_id: 1,
                    title: "Male",
                },
                {
                    gender_id: 2,
                    title: "Female",
                },
                {
                    gender_id: 3,
                    title: "Transgender"
                },
            ],
            marital_array: [
                {
                    marital_id: 1,
                    title: "Single",
                },
                {
                    marital_id: 2,
                    title: "Married"
                },
                {
                    marital_id: 3,
                    title: "Divorced"
                }
            ],
            store_array: [
                {
                    store_id: 1,
                    title: "store1"
                },
                {
                    store_id: 2,
                    title: "store2"
                },
                {
                    store_id: 3,
                    title: "store3"
                }
            ],
            department_array: [
                {
                    department_id: 1,
                    title: "department1"
                },
                {
                    department_id: 2,
                    title: "department2"
                },
                {
                    department_id: 3,
                    title: "department3"
                }
            ],
            designation_array: [
                {
                    designation_id: 1,
                    title: "designation1"
                },
                {
                    designation_id: 2,
                    title: "designation2"
                },
                {
                    designation_id: 3,
                    title: "designation3"
                }
            ],
            shift_array: [
                {
                    shift_id: 1,
                    title: "shift1"
                },
                {
                    shift_id: 2,
                    title: "shift2"
                },
                {
                    shift_id: 3,
                    title: "shift3"
                }
            ],
            card_array: [
                {
                    card_type_id: 1,
                    title: "card1"
                },
                {
                    card_type_id: 2,
                    title: "card2"
                },  
                {
                    card_type_id: 3,
                    title: "card3"
                }  
            ],
            blood_array: [
                {
                    blood_group_id: 1,
                    title: "blood group1"
                },
                {
                    blood_group_id: 2,
                    title: "blood group2"
                },
                {
                    blood_group_id: 3,
                    title: "blood group3"
                }
            ],
        };
    }
    componentDidMount() {
    }

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
            if(name === "") {
                alertText += "• Name\n";
            }

            if(fatherName === "") {
                alertText += "• Father Name\n";
            }
            if(dob === "") {
                alertText += "• Date of Birth\n";
            }
            if(permanentAddress === "") {
                alertText += "• Permanent Address"
            }
            if(residentialAddress === "") {
                alertText += "• Residential Address"
            }
            if(contactNo === "") {
                alertText += "• Contact No"
            }
            if(alternateNo === "") {
                alertText += "• Alternate No"
            }
            if(email === "") {
                alertText += "• Email"
            }
            if(educationalQualification === "") {
                alertText += "• Educational Qualification"
            }
            if(introducerName === "") {
                alertText += "• Introducer Name"
            }
            if(introducerDetails === "") {
                alertText += "• Introducer Details"
            }
            if(salary === "") {
                alertText += "• Salary"
            }
            if(unifrom === "") {
                alertText += "• unifrom"
            }
            if(idNo === "") {
                alertText += "• ID Number"
            }
            if(experience === "") {
                alertText += "• Experience"
            }
            if(joiningDate === "") {
                alertText += "• Joining Date"
            }
            if(resignationDate === "") {
                alertInitText += "• Resignation Date"
            }
            if(employeeId === "") {
                alertText += "• Employee ID"
            }
            if(gender_id === 0) {
                alertText += "• Gender ID"
            }
            if(marital_id === 0) {
                alertText += "• Marital ID"
            }
            if(store_id === 0) {
                alertText += "• Store ID"
            }
            if(department_id === 0) {
                alertText += "• Department ID"
            }
            if(designation_id === 0) {
                alertText += "• Designation ID"
            }
            if(shift_id === 0) {
                alertText += "• Shift ID"
            }
            if(card_type_id === 0) {
                alertText += "• Card Type ID"
            }
            if(blood_group_id === 0) {
                alertText += "• Blood Group ID"
            }
            if (profileImage !== undefined && profileImage != null) {
				if (check("profileImage", brochure))
					this.filesData["profileImage"] = {
						key: "profileImage",
						url: (
							await FilesHelper.upload(
								profileImage,
								"profileImage",
								"/" +
								name
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
                {this.state[key] !== undefined &&
                    this.state[key] != null && (
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
            gender_array,
            department_array,
            designation_array,
            blood_array,
            card_array,
            marital_array,
            store_array,
            shift_array
        } = this.state;
        return (
            <div>
                <Head />
                <SideBar />
                <Header />
                <div className={styles.mainWrapper}>
                    <h2 className={styles.heading}>New Employee</h2>
                    <div className={styles.wrapper}>
                        <div className={styles.inputDiv}>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    id="name"
                                    value={name}
                                    className={`inputText ${styles.inputText}`}
                                    style={{ textTransform: "capitalize" }}
                                />
                                <label for="name">Name</label>
                            </div>

                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="fatherName"
                                    value={fatherName}
                                />
                                <label for="fatherName">Father/Spouse Name</label>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="dob"
                                    value={dob}
                                />
                                <label for="dob">Date Of Birth</label>
                            </div>
                            <div className={styles.inputGroup1}>
                                <select
                                    className={`select ${styles.inputText}`}
                                    value={gender_id}
                                    onChange={(e) =>
                                        this.setState({
                                            gender_id: e.target.value,
                                        })
                                    }
                                >
                                    <option value={0} disabled selected>
                                        Gender
                                    </option>
                                    {gender_array.map((m) => (
										<option value={m.gender_id}>
											{m.title}
										</option>
									))}
                                </select>
                            </div>

                            <div className={styles.inputGroup1}>
                                <select
                                    className={`select ${styles.inputText}`}
                                    value={marital_id}
                                    onChange={(e) =>
                                        this.setState({
                                            marital_id: e.target.value,
                                        })
                                    }
                                >
                                    <option value={0} disabled selected>
                                        Marital Status
                                    </option>
                                    {marital_array.map((m) => (
										<option value={m.marital_id}>
											{m.title}
										</option>
									))}
                                </select>
                            </div>
                            <div className={styles.inputGroup1}>
                                <textarea
                                    type="text"
                                    placeholder="Permanent Address"
                                    className={`inputText ${styles.inputText}`}
                                    style={{ height: 100 }}
                                    id="permenantAddress"
                                    value={permanentAddress}
                                />
                            </div>
                            <div className={styles.inputGroup1}>
                                <textarea
                                    type="text"
                                    placeholder="Residential Address"
                                    className={`inputText ${styles.inputText}`}
                                    style={{ height: 100 }}
                                    id="residentialAddress"
                                    value={residentialAddress}
                                />
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="contactNo"
                                    value={contactNo}
                                />
                                <label for="contactNo">Primary Contact No.</label>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="altContact"
                                    value={alternateNo}
                                />
                                <label for="altContact">Alternative Contact No.</label>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="email"
                                    value={email}
                                />
                                <label for="email">Email ID</label>
                            </div>
                            <div className={styles.inputGroup1}>
                                <select
                                    className={`select ${styles.inputText}`}
                                    value={blood_group_id}
                                    onChange={(e) =>
                                        this.setState({
                                            blood_group_id: e.target.value,
                                        })
                                    }
                                >
                                    <option value={0} disabled selected>
                                        Blood Group
                                    </option>
                                    {blood_array.map((m) => (
										<option value={m.blood_group_id}>
											{m.title}
										</option>
									))}
                                </select>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="educationQual"
                                    value={educationalQualification}
                                />
                                <label for="educationQual">Educational Qualification</label>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="introducerName"
                                    value={introducerName}
                                />
                                <label for="introducerName">Introducer's Name</label>
                            </div>
                            <div className={styles.inputGroup1}>
                                <textarea
                                    type="text"
                                    placeholder="Introducer Details"
                                    className={`inputText ${styles.inputText}`}
                                    id="introducerDetails"
                                    value={introducerDetails}
                                />
                            </div>
                        </div>
                        <div className={styles.inputDiv}>
                            {this.getInputField(
                                "profileImage",
                                "Upload Image :",
                                "image/*"
                            )}
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="employeeId"
                                    value={employeeId}
                                />
                                <label for="employeeId">Employee ID</label>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="salary"
                                    value={salary}
                                />
                                <label for="salary">Salary / Month</label>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="unifrom"
                                    value={unifrom}
                                />
                                <label for="unifrom">Unifrom</label>
                            </div>
                            <div className={styles.inputGroup1}>
                                <select
                                    className={`select ${styles.inputText}`}
                                    onChange={(e) =>
                                	this.setState({
                                        store_id: e.target.value,
                                	})
                                    }
                                    value={store_id}
                                >
                                    <option value={0} disabled selected>
                                        Select Store
                                    </option>
                                    {store_array.map((m) => (
										<option value={m.store_id}>
											{m.title}
										</option>
									))}
                                </select>
                            </div>
                            <div className={styles.inputGroup1}>
                                <select
                                    className={`select ${styles.inputText}`}
                                    value={department_id}
                                    onChange={(e) =>
                                        this.setState({
                                            department_id: e.target.value,
                                        })
                                    }
                                >
                                    <option value={0} disabled selected>
                                        Select Department
                                    </option>
                                    {department_array.map((m) => (
										<option value={m.department_id}>
											{m.title}
										</option>
									))}
                                </select>
                            </div>
                            <div className={styles.inputGroup1}>
                                <select
                                    className={`select ${styles.inputText}`}
                                    value={designation_id}
                                    onChange={(e) =>
                                        this.setState({
                                            designation_id: e.target.value,
                                        })
                                    }
                                >
                                    <option value={0} disabled selected>
                                        Select Designation
                                    </option>
                                    {designation_array.map((m) => (
										<option value={m.designation_id}>
											{m.title}
										</option>
									))}
                                </select>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="experience"
                                    value={experience}
                                />
                                <label for="experience">Previous Experience</label>
                            </div>
                            <div className={styles.inputGroup1}>
                                <select
                                    className={`select ${styles.inputText}`}
                                    value={shift_id}
                                    onChange={(e) =>
                                    	this.setState({
                                            shift_id: e.target.value,
                                    	})
                                    }
                                >
                                    <option value={0} disabled selected>
                                        Shift Details
                                    </option>
                                    {shift_array.map((m) => (
										<option value={m.shift_id}>
											{m.title}
										</option>
									))}
                                </select>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="joining"
                                    value={joiningDate}
                                />
                                <label for="joining">Date of Joining</label>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="resignationDate"
                                    value={resignationDate}
                                />
                                <label for="resignationDate">Date of Resignation</label>
                            </div>
                            <div className={styles.inputGroup1}>
                                <select
                                    className={`select ${styles.inputText}`}
                                    value={card_type_id}
                                    onChange={(e) =>
                                    	this.setState({
                                            card_type_id: e.target.value,
                                    	})
                                    }
                                >
                                    <option value={0} disabled selected>
                                        ID Card Type
                                    </option>
                                    {card_array.map((m) => (
										<option value={m.card_type_id}>
											{m.title}
										</option>
									))}
                                </select>
                            </div>
                            <div className={`inputGroup`}>
                                <input
                                    type="text"
                                    placeholder=" "
                                    maxLength="50"
                                    className={`inputText ${styles.inputText}`}
                                    id="cardNo"
                                    value={idNo}
                                />
                                <label for="cardNo">ID Card No</label>
                            </div>
                            {this.getInputField(
                                "ProfileID",
                                "Upload ID :",
                                "image/*"
                            )}
                            <button
								onClick={() => this.getData()}
								className={`button ${styles.button}`}
							>
								{"Submit"}
							</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}