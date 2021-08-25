//External Dependencies
import { Formik, Form } from "formik";
import { Container, ButtonGroup, Button, CheckboxGroup, Grid, Checkbox } from "@chakra-ui/react";
import React from "react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";

//Styles
import styles from "../../styles/create.module.css";

//Internal Dependencies
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { ShiftValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";
import ShiftHelper from "../../helper/shift";
import moment from "moment";

const initialValue = {
	shift_name: "",
	status: "",
    shift_in_time: "",
    shift_out_time: "",
};
export default class CreateShift extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
            shift: [],
            shift_in_time: "",
            shift_out_time: "",
		};
	}
    componentDidMount() {
        this.getShift();
    }
    getShift() {
        ShiftHelper.getShift()
            .then((data) => {
                this.setState({shift: data});
            })
            .catch((err) => console.log(err));
    }
	createShift(values) {
        values.shift_in_time = moment(values.shift_in_time).format("hh:mm:ss");
        values.shift_out_time = moment(values.shift_out_time).format("hh:mm:ss");
		this.setState({ loading: true });
		ShiftHelper.createShift(values)
			.then((data) => {
				if (data.code == 200) {
					toast.success("Successfully Creating Shift!");
				} else {
					throw `${data.msg}`;
				}
			})
			.catch((err) => {
				console.log(err);
				toast.error("Error Creating Shift!");
			})
			.finally(() => this.setState({ loading: false }));
	}

	render() {
		const { loading, shift } = this.state;
        console.log(shift);
		return (
			<GlobalWrapper title="Shift">
				<Head />
				<Formik
					initialValues={initialValue}
					validationSchema={ShiftValidation}
					onSubmit={(values) => {
						this.createShift(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"40px"} boxShadow="lg">
									<p>Add New Shift</p>
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
											<CustomInput label="Shift Name" name="shift_name" type="text" />
											<CustomInput
												label="Status"
												values={[
													{
														id: 1,
														value: "Active",
													},
													{
														id: 2,
														value: "Inactive",
													},
												]}
												name="status"
												type="text"
												method="switch"
											/>
										</div>
                                        <div className={styles.dateHolder}>
											<CustomInput
												label="Shift start time"
												name="shift_in_time"
                                                method="timepicker"
											/>
											<CustomInput
												label="Shift end time"
                                                name="shift_out_time"
                                                method="timepicker"
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
											<Button isLoading={loading} loadingText="Submitting" colorScheme="purple" onClick={() => handleSubmit()}>
												Create
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
