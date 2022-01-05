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

export default class PackingMaterialSize extends React.Component {
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
					this.setState({ toggleReset: true })
					
				} else {
					toast.error("Error Adding New Pack Material Size!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loadingSubmit: false }));
	}
	render() {
		const { loadingItem, loadingSubmit, loadingReset, toggleReset, editItems } = this.state;
		return (
			<GlobalWrapper title="Pack Material Size">
				<Head />
				<Formik
					initialValues={{
						material_size: '',
						weight: 0,
						cost: 0,
						description: '',
					}}
					// validationSchema={PackValidation}
					onSubmit={(values) => {
						this.createPackMaterialSize(values);
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
													{"Submit"}
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

