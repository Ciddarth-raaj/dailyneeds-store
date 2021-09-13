//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, ButtonGroup, Button } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from 'next/router';

//Style
import styles from "../../styles/create.module.css";

//Internal Dependencies
import DesignationHelper from "../../helper/designation";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { DesignationValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";


class UpdateDesignation extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
		};
	}

	updateDesignation(values) {
        const { designation_id } = this.props.data[0];
		this.setState({ loading: true });
		DesignationHelper.updateDesignation({
            designation_id: designation_id,
            designation_details: values
        })
			.then((data) => {
				if (data.code === 200) {
					toast.success("Successfully Updated Designation!");
				} else {
					toast.error("Error Updating Designation!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}

	render() {
		const { loading } = this.state;
		return (
			<GlobalWrapper title="Update Designation">
				<Head />
				<Formik
					initialValues={{
                        designation_name: this.props.data[0].designation_name,
	                    status: this.props.data[0].status,
                    }}
					onSubmit={(values) => {
						this.updateDesignation(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
									<p>Update Designation</p>
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
											<CustomInput label="Designation Name" name="designation_name" type="text" />
											<CustomInput
												label="Status"
												values={[
													{
														id: 1,
														value: "Active",
													},
													{
														id: 0,
														value: "Inactive",
													},
												]}
												name="status"
												type="text"
												method="switch"
											/>
										</div>
										<ButtonGroup
											spacing="6"
											mt={10}
											style={{
												width: "100%",
												justifyContent: "flex-end",
											}}
											type="submit"
										>
											<Button>Cancel</Button>
											<Button isLoading={loading} loadingText="Submitting" colorScheme="purple" onClick={() => handleSubmit()}>
												Update
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
	const data = await DesignationHelper.getDesignationById(context.query.id);
	return {
		props: { data }
	};
}

export default withRouter(UpdateDesignation);