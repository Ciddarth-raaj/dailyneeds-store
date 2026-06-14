//External Dependencies
import { Formik, Form } from "formik";
import { Container, ButtonGroup, Button, CheckboxGroup, Grid, Checkbox } from "@chakra-ui/react";
import React from "react";
import { toast } from "react-toastify";
import Timekeeper from 'react-timekeeper';
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";
//Styles
import styles from "../../styles/create.module.css";

//Internal Dependencies
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { ShiftValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";
import ShiftHelper from "../../helper/shift";
import moment from "moment";

// const initialValue = {
// 	shift_name: "",
// 	status: "",
//     shift_in_time: "",
//     shift_out_time: "",
// };
class CreateShift extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			data: [],
			id: null,
		};
	}

	componentDidMount() {
		this.fetchRecord();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.router.query.id !== this.props.router.query.id) {
			this.fetchRecord();
		}
	}

	fetchRecord() {
		const recordId = this.props.router.query.id;
		if (!recordId || recordId === "create") {
			this.setState({ data: [], id: null });
			return;
		}
		ShiftHelper.getShiftById(recordId)
			.then((data) => {
				this.setState({
					data,
					id: data[0]?.shift_id ?? null,
				});
			})
			.catch((err) => console.log(err));
	}

	createShift(values) {
		const { router } = this.props;
		this.setState({ loading: true });
		values.status = 1;
		values.shift_in_time = values.shift_in_time + ":00"
		values.shift_out_time = values.shift_out_time + ":00"
		ShiftHelper.createShift(values)
			.then((data) => {
				console.log({ data: data });
				if (data.code == 200) {
					toast.success("Successfully Creating Shift!");
					router.push("/shift")
				} else {
					throw `${data.msg}`;
				}
			})
			.catch((err) => {
				console.log(err);
				toast.error("Error Creating Shift!");
			})
			.finally(() => this.setState({ loading: false }),
						   router.push("/shift"));
	}
	updateShift(values) {
		// values.shift_in_time = moment(values.shift_in_time).format("hh:mm:ss");
		// values.shift_out_time = moment(values.shift_out_time).format("hh:mm:ss");
		const { shift_id } = this.state.data[0];
		const { router } = this.props;
		this.setState({ loading: true });
		ShiftHelper.updateShift({
			shift_id: shift_id,
			shift_details: values
		})
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Shift!");
					router.push("/shift")
				} else {
					toast.error("Error Updating Shift!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}
	render() {
		const { loading, shift } = this.state;
		const { id } = this.state;
		return (
			<GlobalWrapper title="Shift">
				 
				<Formik
					enableReinitialize
					initialValues={{
						shift_name: this.state.data[0]?.shift_name,
						shift_in_time: this.state.data[0]?.shift_in_time || null,
						shift_out_time: this.state.data[0]?.shift_out_time || null,
						status: this.state.data[0]?.status,
					}}
					validationSchema={ShiftValidation}
					onSubmit={(values) => {
						id === null ? this.createShift(values) : this.updateShift(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit, values } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"40px"} boxShadow="lg">
									{id !== null ?
										<p>Update Shift</p> :
										<p>Add New Shiftt</p>}
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
											<CustomInput label="Shift Name" name="shift_name" type="text" />
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
												{id === null ? "Create" : "Update"}
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


export default withRouter(CreateShift);