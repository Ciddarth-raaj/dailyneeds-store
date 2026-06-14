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
import MaterialHelper from "../../helper/materialsize";
import { Category } from "../../constants/values";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
// import { PackValidation } from "../../util/validation";

class CreatePackingMaterialSize extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loadingSubmit: false,
			loadingReset: false,
			loadingItem: false,
			editItems: false,
			toggleReset: false,
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
		MaterialHelper.getMaterialSizeById(recordId)
			.then((data) => {
				this.setState({
					data,
					id: data[0]?.size_id ?? null,
				});
			})
			.catch((err) => console.log(err));
	}

	createPackMaterialSize(values) {
		this.setState({ loadingSubmit: true });
		MaterialHelper.createMaterialSize(values)
			.then((data) => {
				if (data == 200) {
					toast.success("Successfully Added New Pack Material Size!");
					// this.setState({ toggleReset: true })
					router.push("/packing-material-size")

					
				} else {
					toast.error("Error Adding New Pack Material Size!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loadingSubmit: false }));
	}
    updatePackMaterialSize(values) {
        const { size_id } = this.state.data[0];
		const { router } = this.props;
		this.setState({ loading: true });
		MaterialHelper.updatePackMaterialSize({
            size_id: size_id,
            material_details: values
        })
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Pack Material Size!");
					router.push("/packing-material-size")
				} else {
					toast.error("Error Updating Pack Material Size!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}
	render() {
		const { loadingItem, loadingSubmit, loadingReset, toggleReset, editItems } = this.state;
        const { id } = this.state;
		return (
			<GlobalWrapper title="Pack Material Size">
				 
				<Formik
					enableReinitialize
					initialValues={{
						material_size: this.state.data[0]?.material_size,
						weight: this.state.data[0]?.weight,
						cost: this.state.data[0]?.cost,
						description: this.state.data[0]?.description,
					}}
					// validationSchema={PackValidation}
					onSubmit={(values) => {
						id === null ? this.createPackMaterialSize(values) : this.updatePackMaterialSize(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit, resetForm } = formikProps;
						return (
							<Form onSubmit={resetForm}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container className={styles.container} pb={"40px"} boxShadow="lg">
									<p className={styles.buttoninputHolder}>
										<div>Add Pack Material Size</div>
									</p>
									<div>
										<div className={styles.inputHolder}>
											<CustomInput
												label="Material Size *"
												name="material_size"
												type="text"
											/>
										</div>
										<div className={styles.inputHolder}>
											<CustomInput
                                                    placeholder="0"
                                                    name="weight"
                                                    type="tel"
                                                    children="Weight"
                                                    method="numberinput"
                                                />
											 <CustomInput
                                                    placeholder="0"
                                                    name="cost"
                                                    type="tel"
                                                    children="Cost"
                                                    method="numberinput"
                                                />
										</div>
										<div className={styles.inputHolder}>
											<CustomInput label="Description" name="description" type="text" method="TextArea" />
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

export default withRouter(CreatePackingMaterialSize);
