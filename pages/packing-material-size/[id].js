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
		};
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
        const { size_id } = this.props.data[0];
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
        const { id } = this.props;
		return (
			<GlobalWrapper title="Pack Material Size">
				 
				<Formik
					initialValues={{
						material_size: this.props.data[0]?.material_size,
						weight: this.props.data[0]?.weight,
						cost: this.props.data[0]?.cost,
						description: this.props.data[0]?.description,
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

export async function getServerSideProps(context) {
	var data = [];
	if(context.query.id !== "create") {
	data = await MaterialHelper.getMaterialSizeById(context.query.id);
	}
	const id = context.query.id != "create" ? data[0].size_id : null;
	return {
		props: { data, id }
	};
}

export default withRouter(CreatePackingMaterialSize);
