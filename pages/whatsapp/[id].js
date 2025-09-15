//External Dependencies
import React, { Component } from "react";
import { Formik, Form } from "formik";
import { Container, Button, ButtonGroup } from "@chakra-ui/react";
import { toast } from "react-toastify";
// import Dropzone from "react-dropzone-uploader";

import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";
import Dropzone from 'react-dropzone';
//Styles
import styles from "../../styles/whatsapp.module.css";

//Internal Dependencies
// import WhatsappHelper from "../../helper/whatsapp";
import { Category } from "../../constants/values";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import { PaymentSetup } from "../../constants/values";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
// import { WhatsappValidation } from "../../util/validation";
import moment from "moment";

class CreateWhatsapp extends React.Component {
    constructor(props) {
        super(props);
        this.onDrop = (files) => {
            this.setState({files})
        };
        
        this.state = {
            loadingSubmit: false,
            loadingReset: false,
            loadingItem: false,
            editItems: false,
            toggleReset: false,
            files: [],
            imageHolder: [],
        };
    }

    createWhatsapp(values) {
        const { router } = this.props;
        this.setState({ loadingSubmit: true });
        WhatsappHelper.createWhatsapp(values)
            .then((data) => {
                if (data == 200) {
                    toast.success("Successfully Added Whatsapp Order!");
                    // this.setState({ toggleReset: true })
                    router.push("/whatsapp")

                } else {
                    toast.error("Error Adding Whatsapp!");
                    // router.push("/whatsapp")
                    throw `${data.msg}`;
                }
            })
            .catch((err) => console.log(err))
            .finally(() => this.setState({ loadingSubmit: false }));
    }
    updateWhatsapp(values) {
        const { order_id } = this.props.data[0];
        const { router } = this.props;
        this.setState({ loading: true });
        WhatsappHelper.updateVehicle({
            order_id: order_id,
            whatsapp_details: values
        })
            .then((data) => {
                if (data.code === 200) {
                    toast.success("Successfully Updated Whatsapp!");
                    router.push("/whatsapp")
                } else {
                    toast.error("Error Updating Whatsapp!");
                    throw `${data.msg}`;
                }
            })
            .catch((err) => console.log(err))
            .finally(() => this.setState({ loading: false }));
    }
    getImageUploadParams = ({ meta }) => {
		const { imageHolder } = this.state;
		return { url: imageHolder };
	};
    imageChangeStatus = async ({ meta, file }, status) => {
		if (status === "headers_received") {
			try {
				this.setState({ imageHolder: file });
			} catch (err) {
				console.log(err);
			}
		}
	};
    render() {
        const { loadingItem, loadingSubmit, loadingReset, toggleReset, editItems, files } = this.state;
        const file = this.state.files.map(file => (
            <p key={file.name}>
              {file.name}
            </p>
          ));
        //   console.log({files: files})
          const baseStyle = {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            borderWidth: 2,
            borderRadius: 2,
            borderColor: '#eeeeee',
            borderStyle: 'dashed',
            backgroundColor: '#fafafa',
            color: '#bdbdbd',
            outline: 'none',
            transition: 'border .24s ease-in-out'
          };
          
          const focusedStyle = {
            borderColor: '#2196f3'
          };
          
          const acceptStyle = {
            borderColor: '#00e676'
          };
          
          const rejectStyle = {
            borderColor: '#ff1744'
          };
        const dropDownProps = {
			styles: {
				dropzone: {
					overflow: "auto",
					border: "none",
					borderRadius: "10px",
					background: "#EEEEEE",
					marginTop: "10px"
				},
				inputLabelWithFiles: {
					margin: "20px 3%",
				},
				inputLabel: {
					color: "black",
					fontSize: "14px",
				},
			},
			multiple: false,
			maxFiles: 1,
			accept: "image/*",
		};
        const { id } = this.props;
        return (
            <GlobalWrapper title="Create Whatsapp">
                 
                <Formik
                    initialValues={{
                        // order_id: this.props.data[0]?.order_id,
                        first_name: this.props.data[0]?.first_name,
                        last_name: this.props.data[0]?.last_name,
                        primary_address: this.props.data[0]?.primary_address,
                        city: this.props.data[0]?.city,
                        mobile_no: this.props.data[0]?.mobile_no,
                        pin_code: this.props.data[0]?.pin_code,
                        payment_type: this.props.data[0]?.payment_type,
                        order_text: this.props.data[0]?.order_text,
                        attached_image: this.props.data[0]?.attached_image
                    }}
                    // validationSchema={WhatsappValidation}
                    onSubmit={(values) => {
                        id === null ? this.createWhatsapp(values) : this.updateWhatsapp(values);
                    }}
                >
                    {(formikProps) => {
                        const { handleSubmit, resetForm } = formikProps;
                        return (
                            <Form onSubmit={resetForm}>
                                <FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
                                <Container className={styles.container} pb={"40px"} boxShadow="lg">
                                    <p className={styles.buttoninputHolder}>
                                        <div>Add Whatsapp Order</div>
                                    </p>
                                    <div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="First Name *"
                                                name="first_name"
                                                type="text"
                                            />
                                            <CustomInput
                                                label="Last Name *"
                                                name="last_name"
                                                type="text"
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Primary Address"
                                                name="primary_address"
                                                type="text"
                                                method="TextArea"

                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="City"
                                                name="city"
                                                type="text"
                                            />
                                            <CustomInput
                                                label="Mobile Number"
                                                name="mobile_no"
                                                type="number"
                                            />
                                        </div>
                                        <div>
                                              <CustomInput
                                                label="Secondary Address"
                                                name="secondary_address"
                                                type="text"
                                                method="TextArea"

                                            />
                                        </div>
                                      
                                        <div className={styles.inputHolder}>
                                        <CustomInput
                                               label="Pin code"
                                            //    values={}
                                               name="pin_code"
                                               type="text"
                                               method="switch"
                                            />
                                            <CustomInput
                                                label="Payment_type"
                                                values={PaymentSetup.map((m) => ({
                                                    id: m.id,
                                                    value: m.value
                                                }))}
                                                name="payment_type"
                                                type="text"
                                                method="switch"
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                        <CustomInput 
                                              label="Order Text"
                                              name="order_text"
                                              type="text"
                                              method="TextArea"
											  containerStyle={{ marginBottom: 10 }}
                                        />
                                        </div>
                                        <div className={styles.inputHolder}>
                                        <div className={styles.uploadHolder} style={{ marginTop: 30 }}>
										    <label className={styles.uploaderTitle} >
										    	Upload ID *
										    </label>
											{/* <Dropzone getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} /> */}
                                            <Dropzone onDrop={this.onDrop}>
                                              {({getRootProps, getInputProps}) => (
                                                <section>
                                                  <div {...getRootProps({className: styles.baseStyle })}>
                                                    <input {...getInputProps()} />
                                                    {files.length === 0 && (
                                                    <p>Drag and drop some files here, or click to select files</p>
                                                    )}
                                                    {files.length !== 0 && (
                                                    <p style={{marginLeft: "50px", color: "black"}}>{file}</p>
                                                    )}
                                                  </div>
                                                </section>
                                              )}
                                            </Dropzone>
                                            </div>
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
    if (context.query.id !== "create") {
        data = await WhatsappHelper.getWhatsappById(context.query.id);
    }
    const id = context.query.id != "create" ? data[0].order_Id : null;
    return {
        props: { data, id }
    };
}

export default withRouter(CreateWhatsapp);