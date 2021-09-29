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
import DocumentHelper from "../../helper/document";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { DepartmentValidation } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";


class ApproveDocument extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
		};
	}

	ApproveDocument(values) {
        const { document_id } = this.props.data[0];
		this.setState({ loading: true });
		DocumentHelper.approveDocument({
            document_id: document_id, 
            is_verified: values.is_verified
        })
			.then((data) => {
				if (data.code == 200) {
                    if(values.status === 1) {
					toast.success("Successfully Approved Document!");
                    } else {
					toast.success("Successfully Declined Document!");
                    }
				} else {
					toast.error("Error Approving Document!");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}
	
	render() {
		const { loading } = this.state;
		const { id } = this.props;
		return (
			<GlobalWrapper title="Document">
				<Head />
				<Formik
					initialValues={{
						card_name: this.props.data[0]?.card_name,
	                    card_no: this.props.data[0]?.card_no,
	                    file: this.props.data[0]?.file,
                        is_verified: this.props.data[0]?.is_verified,
					}}
					onSubmit={(values) => {
						this.ApproveDocument(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit, values, setFieldValue } = formikProps;
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
									<p>Approve Document</p>
									<div className={styles.wrapper}>
										<div className={styles.inputHolder}>
											<CustomInput label="Card Name" name="card_name" type="text" method="disabled" />
                                            <CustomInput label="Card Number" name="card_no" type="text" method="disabled" />
										</div>
                                        <div className={styles.personalInputHolder}>
                                            <img src={values.file} className={styles.employee_image} />
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
                                            <Button isLoading={loading} loadingText="Submitting" colorScheme="red" onClick={() => {setFieldValue("is_verified", -1), handleSubmit()}}>
												{"Decline"}
											</Button>
											<Button isLoading={loading} loadingText="Submitting" colorScheme="purple" onClick={() => {setFieldValue("is_verified", 1), handleSubmit()}}>
												{"Approve"}
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
	const data = await DocumentHelper.getDocumentById(context.query.id);
	return {
		props: { data }
	};
}

export default withRouter(ApproveDocument);