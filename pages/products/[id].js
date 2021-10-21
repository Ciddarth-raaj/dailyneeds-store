//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, Button, Badge } from "@chakra-ui/react";
import { toast } from "react-toastify";
import Dropzone from "react-dropzone-uploader";
import Table from "../../components/table/table";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";
//Styles
import styles from "../../styles/productpage.module.css";

//Internal Dependencies
import SortableList from "../../components/sort/sortableList";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { ProductItemsValidation } from "../../util/validation";

class ProductItems extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loadingItems: false,
            editItems: false,
            documentUploader: false,
            imageHolder: [],
            image: [
                "/assets/stack.png",
                "/assets/6993435.jpg",
                "/assets/6993435.jpg",
            ]
        };
    }

    save() {
        const { editItems } = this.state;
        editItems ? "" : toast.success("Successfully Saved!");
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
        const { loadingItems, editItems, documentUploader, image } = this.state;
        const table_title = {
            branch: "Branch",
            mrp: "MRP",
            sp: "SP",
            stock: "Stock",
            buffer: "Buffer",
            // action: "Action",
        };
        const details = [
            {
                branch: "DN2",
                mrp: <input className={styles.tableInput} value={0.1}></input>,
                sp: <input className={styles.tableInput} value={0.3}></input>,
                stock: <input className={styles.tableInput} value={0.7}></input>,
                buffer: "0"
            },
            {
                branch: "DN1",
                mrp: <input className={styles.tableInput} value={0.4}></input>,
                sp: <input className={styles.tableInput} value={0.1}></input>,
                stock: <input className={styles.tableInput} value={0.9}></input>,
                buffer: "0"
            },
            {
                branch: "DN3",
                mrp: <input className={styles.tableInput} value={0.5}></input>,
                sp: <input className={styles.tableInput} value={0.8}></input>,
                stock: <input className={styles.tableInput} value={0.6}></input>,
                buffer: "1"
            },
            {
                branch: "DN4",
                mrp: <input className={styles.tableInput} value={0.5}></input>,
                sp: <input className={styles.tableInput} value={0.4}></input>,
                stock: <input className={styles.tableInput} value={0.8}></input>,
                buffer: "0"
            },
        ]
        const valuesNew = details.map((m) => (
            {
                branch: m.branch,
                mrp: m.mrp,
                sp: m.sp,
                stock: m.stock,
                buffer: m.buffer,
                // action: image(m.employee_id),
            }
        ));
        const dropDownProps = {
			styles: {
				dropzone: {
					overflow: "auto",
					border: "none",
					borderRadius: "20px",
					background: "#EEEEEE",
					marginTop: "10px",
                    // width: "92%",
                    height: "150px"
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
        return (
            <GlobalWrapper title="Products">
                <Head />
                <Formik
                    initialValues={{
                        id: "19",
                        name: "Noodles",
                        display_name: "Tom Ramen",
                        brand_name: "Nestlé",
                        combo_name: "Family Pack",
                        department_name: "Food",
                        category_name: "Noodles",
                        subcategory_name: "Cup Noodles",
                        distributor: "City Supermarket",
                        keywords: "four, five, six",
                        distributor_name: "Ram",
                        manufacturer_name: "Nestlé",
                        flavours: "Medium Spicy",
                        measure: "",
                        measure_in: "22",
                        packaging_type: "Box, Family Pack, Sachet",
                        preparation_type: "1",
                        cleaning: "",
                        packing_type: "3",
                        sticker: "",
                        grinding: "",
                        cover_type: "",
                        cover_size: "70",
                        tax_id: "",
                        hsn_code: "190230",
                        status: "Available",
                        is_online_allowed: "",
                        life_cycle: "5",
                    }}
                    validationSchema={ProductItemsValidation}
                    onSubmit={() => {
                        this.save();
                    }}
                >
                    {(formikProps) => {
                        const { handleSubmit, values } = formikProps;
                        return (
                            <Form>
                                <FormikErrorFocus
                                    align={"middle"}
                                    ease={"linear"}
                                    duration={200}
                                />
                                <Container
                                    className={styles.container}
                                    pb={"40px"}
                                    boxShadow="lg"
                                >
                                    <p className={styles.headerInputHolder}>
                                        <div className={styles.productHeader}>
                                            <div className={styles.headerDescription}>{values.department_name} <span>|</span> {values.category_name} <span>|</span> {values.subcategory_name}</div>
                                            <div className={styles.mainTitle}>{values.display_name}</div>
                                            <div>
                                                {values.measure_in !== "" && 
                                                <Badge
                                                    ml="1"
                                                    fontSize="0.6em"
                                                    variant="subtle"
                                                    style={{ marginRight: "10px" }}
                                                    colorScheme="purple"
                                                >
                                                    {values.measure_in + "gms"}
                                                </Badge>
                                                }
                                                {values.manufacturer_name !== "" &&
                                                <Badge
                                                    ml="1"
                                                    fontSize="0.6em"
                                                    variant="subtle"
                                                    colorScheme="purple"
                                                >
                                                    {values.manufacturer_name}
                                                </Badge>
                                                }
                                            </div>
                                        </div>
                                        <div style={{ width: "30%", display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 10 }}>
                                            <Button
                                                isLoading={loadingItems}
                                                variant="outline"
                                                leftIcon={
                                                    editItems ? (
                                                        <i
                                                            class="fa fa-floppy-o"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <i
                                                            class="fa fa-pencil"
                                                            aria-hidden="true"
                                                        />
                                                    )
                                                }
                                                width="180px"
                                                colorScheme="purple"
                                                onClick={() => {
                                                    this.setState({
                                                        editItems: !editItems,
                                                    });
                                                    handleSubmit();
                                                }}
                                            >
                                                {editItems ? "Save" : "Edit"}
                                            </Button>
                                        </div>
                                    </p>
                                    <div>
                                        <div className={styles.subHeader}>
                                            <p>Image</p>
                                        </div>
                                        <Container>
                                            <SortableList items={image} />
                                            <div style={{marginTop: "60px", paddingBottom: "30px", width: '100%'}}>
                                                <Button
                                                variant="outline"
                                                colorScheme="purple"
                                                onClick={() => this.setState({ documentUploader: !documentUploader })}
                                                >
                                                    {documentUploader === true ? "Remove" : "Upload New Image"}
                                                </Button>
                                                {documentUploader === true && 
												<Dropzone id="upload" getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} />
                                                }
                                            </div>
                                            
                                        </Container>
                                        <div className={styles.subHeader}>
                                            <p>Branch Details</p>
                                        </div>
								        <Table heading={table_title} rows={valuesNew} sortCallback={(key, type) => sortCallback(key, type)} />
                                        <div className={styles.keySubHeader}>
                                            <p>Keywords</p>
                                        </div>
                                        <CustomInput 
                                        name="keywords" 
                                        type="text" 
                                        method="TextArea"
                                        />
                                         <div className={styles.keySubHeader}>
                                            <p>Description</p>
                                        </div>
                                        <CustomInput 
                                        name="description" 
                                        type="text" 
                                        method="TextArea"
                                        />
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

export default withRouter(ProductItems);
