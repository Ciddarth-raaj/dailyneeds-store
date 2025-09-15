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
import MaterialHelper from "../../helper/materialtype";
import { Category } from "../../constants/values";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
// import { PackValidation } from "../../util/validation";

class CreatePackingMaterialType extends React.Component {
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

	createPackMaterialType(values) {
		this.setState({ loadingSubmit: true });
		MaterialHelper.createMaterialType(values)
			.then((data) => {
				if (data == 200) {
					toast.success("Successfully Added New Pack Material Type!");
					// this.setState({ toggleReset: true })
					router.push("/packing-material-type")
					
				} else {
					toast.error("Error Adding New Pack Material Type!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loadingSubmit: false }));
	}
    updatePackMaterialType(values) {
        const { type_id } = this.props.data[0];
		const { router } = this.props;
		this.setState({ loading: true });
		MaterialHelper.updatePackMaterialType({
            type_id: type_id,
            material_type_details: values
        })
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Pack Material Type!");
					router.push("/packing-material-type")
				} else {
					toast.error("Error Updating Pack Material Type!");
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
			<GlobalWrapper title="Pack Material Type">
				 
				<Formik
					initialValues={{
                        material_type: this.props.data[0]?.material_type,
                        description: this.props.data[0]?.description
					}}
					// validationSchema={PackValidation}
					onSubmit={(values) => {
                        id === null ? this.createPackMaterialType(values) : this.updatePackMaterialType(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit, resetForm } = formikProps;
						return (
							<Form onSubmit={resetForm}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container className={styles.container} pb={"40px"} boxShadow="lg">
									<p className={styles.buttoninputHolder}>
										<div>Add Pack Material Type</div>
									</p>
									<div>
										<div className={styles.inputHolder}>
											<CustomInput label="Material Type *" name="material_type" type="text" />
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
	data = await MaterialHelper.getMaterialTypeById(context.query.id);
	}
	const id = context.query.id != "create" ? data[0].type_id : null;
	return {
		props: { data, id }
	};
}

export default withRouter(CreatePackingMaterialType);