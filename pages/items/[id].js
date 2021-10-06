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
import MaterialHelper from "../../helper/material";
import { Category } from "../../constants/values";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { ItemsValidation } from "../../util/validation";

class CreateItems extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loadingSubmit: false,
			loadingReset: false,
			loadingItem: false,
			editItems: false,
		};
	}

	createMaterial(values) {
		this.setState({ loadingSubmit: true });
		const { router } = this.props;
		MaterialHelper.createMaterial(values)
			.then((data) => {
				if (data == 200) {
					toast.success("Successfully Added New Family Member!");
				} else {
					toast.error("Error Adding Member!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loadingSubmit: false }), router.push("/items"));
	}
	updateMaterial(values) {
		const { material_id } = this.props.data[0];
		const { router } = this.props;
		this.setState({ loadingSubmit: true });
		MaterialHelper.updateMaterial({
			material_id: material_id,
			material_details: values,
		})
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Material Details!");
				} else {
					toast.error("Error Updating Material Details!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loadingSubmit: false }), router.push("/items"));
	}
	render() {
		const { loadingItem, loadingSubmit, loadingReset, editItems } = this.state;
		const { id } = this.props;
		console.log({ prop: this.props });
		return (
			<GlobalWrapper title="Items">
				<Head />
				<Formik
					initialValues={{
						material_name: this.props.data[0]?.material_name,
						description: this.props.data[0]?.description,
						material_category: this.props.data[0]?.material_category,
					}}
					validationSchema={ItemsValidation}
					onSubmit={(values) => {
						id !== null ? this.updateMaterial(values) : this.createMaterial(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container className={styles.container} pb={"40px"} boxShadow="lg">
									<p className={styles.buttoninputHolder}>
										<div>Add Items</div>
										<div style={{ paddingRight: 10 }}>
											{id !== null ? (
												<Button
													isLoading={loadingItem}
													variant="outline"
													leftIcon={editItems ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														editItems === true && handleSubmit(),
															this.setState({
																editItems: !editItems,
															});
													}}
												>
													{editItems ? "Save" : "Edit"}
												</Button>
											) : (
												<div></div>
											)}
										</div>
									</p>
									<div>
										<div className={styles.inputHolder}>
											<CustomInput label="Material Name *" name="material_name" type="text" editable={id !== null ? editItems : !editItems} />
											<CustomInput
												label="Category *"
												values={Category.map((m) => ({
													id: m.id,
													value: m.value,
												}))}
												name="material_category"
												type="text"
												method="switch"
												editable={id !== null ? editItems : !editItems}
											/>
										</div>

										<div className={styles.inputHolder}>
											<CustomInput label="Description" name="description" type="text" method="TextArea" editable={id !== null ? editItems : !editItems} />
										</div>
										{id === null && (
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
										)}
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
	data = await MaterialHelper.getMaterialById(context.query.id);
	}
	const id = context.query.id != "create" ? data[0].material_id : null;
	return {
		props: { data, id },
	};
}
export default withRouter(CreateItems);
