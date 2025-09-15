//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, Button, ButtonGroup } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../../styles/registration.module.css";

//Internal Dependencies
import VehicleHelper from "../../helper/vehicle";
import { Category } from "../../constants/values";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { VehicleValidation } from "../../util/validation";
import moment from "moment";

class CreateVehicle extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loadingSubmit: false,
			loadingReset: false,
			loadingItem: false,
			editItems: false,
			toggleReset: false,
		};
	}

	createVehicle(values) {
		const { router } = this.props;
		this.setState({ loadingSubmit: true });
        values.fc_validity = moment(values.fc_validity).format("YYYY-MM-DD");
        values.insurance_validity = moment(values.insurance_validity).format("YYYY-MM-DD");
		VehicleHelper.createVehicle(values)
			.then((data) => {
				if (data == 200) {
					toast.success("Successfully Added Vehicle!");
					// this.setState({ toggleReset: true })
					router.push("/vehicle")
					
				} else {
					toast.error("Error Adding Vehicle!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loadingSubmit: false }));
	}
    updateVehicle(values) {
        const { vehicle_id } = this.props.data[0];
		const { router } = this.props;
        delete values.vehicle_id;
        values.fc_validity = moment(values.fc_validity).format("YYYY-MM-DD");
        values.insurance_validity = moment(values.insurance_validity).format("YYYY-MM-DD");
		this.setState({ loading: true });
		VehicleHelper.updateVehicle({
            vehicle_id: vehicle_id,
            vehicle_details: values
        })
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Vehicle!");
					router.push("/vehicle")
				} else {
					toast.error("Error Updating Vehicle!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}
	render() {
		const { loadingItem, loadingSubmit, loadingReset, toggleReset, editItems } = this.state;
        const { id } = this.props;
		return (
			<GlobalWrapper title="Vehicle">
				 
				<Formik
					initialValues={{
                        vehicle_id: this.props.data[0]?.vehicle_id,
                        vehicle_name: this.props.data[0]?.vehicle_name,
			            vehicle_number: this.props.data[0]?.vehicle_number,
			            chasis_number: this.props.data[0]?.chasis_number,
			            engine_number: this.props.data[0]?.engine_number,
			            fc_validity: moment(this.props.data[0]?.fc_validity).format("YYYY-MM-DD"),
			            insurance_validity: moment(this.props.data[0]?.insurance_validity).format("YYYY-MM-DD"),
					}}
					validationSchema={VehicleValidation}
					onSubmit={(values) => {
                        id === null ? this.createVehicle(values) : this.updateVehicle(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit, resetForm } = formikProps;
						return (
							<Form onSubmit={resetForm}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container className={styles.container} pb={"40px"} boxShadow="lg">
									<p className={styles.buttoninputHolder}>
										<div>Add Vehicle</div>
									</p>
									<div>
										<div className={styles.inputHolder}>
											<CustomInput 
                                            label="Vehicle Name *" 
                                            name="vehicle_name" 
                                            type="text" 
                                            />
											<CustomInput 
                                            label="Vehicle Number *" 
                                            name="vehicle_number" 
                                            type="text" 
                                            />
										</div>
                                        <div className={styles.inputHolder}>
											<CustomInput 
                                            label="FC Validity" 
                                            name="fc_validity" 
                                            type="text" 
											method="datepicker"

                                            />
											<CustomInput 
                                            label="Insurance Validity" 
                                            name="insurance_validity" 
                                            type="text" 
											method="datepicker"

                                            />
										</div>
                                        <div className={styles.inputHolder}>
											<CustomInput 
                                            label="Chasis Number"
                                            name="chasis_number" 
                                            type="text"
                                            />
											<CustomInput 
                                            label="Engine Number"
                                            name="engine_number" 
                                            type="text" 
                                            />
										</div>
											<ButtonGroup
												spacing="6"
												style={{
													display: "flex",
													// width: "100%",
													justifyContent: "flex-end",
												}}
											>
												<Button isLoading={loadingSubmit} loadingText="Submitting" colorScheme="purple" onClick={() => handleSubmit()}>
												    {id === null ? "Create" : "Update"}
												</Button>
												<Button isLoading={loadingReset} loadingText="Resetting">
													Reset
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
	data = await VehicleHelper.getVehicleById(context.query.id);
	}
	const id = context.query.id != "create" ? data[0].vehicle_id : null;
	return {
		props: { data, id }
	};
}

export default withRouter(CreateVehicle);