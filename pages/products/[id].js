//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, Button, Badge, Switch } from "@chakra-ui/react";
import { toast } from "react-toastify";
import Dropzone from "react-dropzone-uploader";
import Table from "../../components/table/table";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";
//Styles
import styles from "../../styles/productpage.module.css";

//Internal Dependencies
import ProductHelper from "../../helper/product";
import ImageHelper from "../../helper/image";
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
            editableProductInfo: false,
            editableCustomInfo: false,
            editableGofrugalInfo: false,
            editableDeliumInfo: false,
            documentUploader: false,
            imageHolder: [],
            image: this.props.image,
        };
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
    updateProduct = async (values) => {
        const { router } = this.props;

        delete values.gf_item_name;
        delete values.brand_name;
        delete values.category_name;
        delete values.subcategory_name;
        delete values.gf_manufacturer;
        delete values.gf_food_type;

        delete values.gf_weight_grams;
        delete values.gf_item_product_type;
        delete values.measure;
        delete values.measure_in;

        delete values.gf_tax_id;
        delete values.de_display_name;
        delete values.gf_status;
        delete values.gf_applies_online;
        delete values.packaging_name;
        delete values.cover_name;
        delete values.packaging_name;
        ProductHelper.updateProductDetails({
            product_id: this.props.data[0].product_id,
            product_details: values
        })
            .then((data) => {
                if (data.code == 200) {
                    toast.success("Product details Updated!");
                    router.push("/products")
                } else {
                    throw "error";
                }
            })
            .catch((err) => {
                console.log({ err: err });
                toast.error("Error Updating Product details!");
            })
            .finally(() => this.setState({ loading: false }));
    }
    render() {
        const { loadingItems, editItems, documentUploader, editableCustomInfo, editableGofrugalInfo, editableDeliumInfo, editableProductInfo, image } = this.state;
        const { id } = this.props;
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
                        product_id: this.props.data[0]?.product_id,
                        gf_item_name: this.props.data[0]?.gf_item_name,
                        brand_name: this.props.additionalDetail[0]?.brand_name,
                        category_name: this.props.additionalDetail[0]?.category_name,
                        subcategory_name: this.props.additionalDetail[0]?.subcategory_name,
                        de_distributor: this.props.data[0]?.de_distributor,
                        de_display_name: this.props.data[0]?.de_display_name,
                        keywords: this.props.data[0]?.keywords,
                        gf_manufacturer: this.props.data[0]?.gf_manufacturer,
                        gf_food_type: this.props.data[0]?.gf_food_type,
                        gf_description: this.props.data[0]?.gf_description,
                        gf_detailed_description: this.props.data[0]?.gf_detailed_description,
                        gf_weight_grams: this.props.data[0]?.gf_weight_grams,
                        gf_item_product_type: this.props.data[0]?.gf_item_product_type,
                        measure: this.props.data[0]?.measure,
                        measure_in: this.props.data[0]?.measure_in,
                        packaging_type: this.props.data[0]?.packaging_type,
                        cleaning: this.props.data[0]?.cleaning,
                        sticker: this.props.data[0]?.sticker,
                        grinding: this.props.data[0]?.grinding,
                        cover_type: this.props.data[0]?.cover_type,
                        cover_sizes: this.props.data[0]?.cover_sizes,
                        gf_tax_id: this.props.data[0]?.gf_tax_id,
                        return: this.props.data[0]?.return,
                        gf_status: this.props.data[0]?.gf_status === "1" ? "true" : "false",
                        gf_applies_online: this.props.data[0]?.gf_applies_online === "1" ? "true" : "false",
                        packaging_name: this.props.data[0]?.packaging_type === "1" ? "one" : "two",
                        cover_name: this.props.data[0]?.cover_type === "1" ? "one" : "two"
                    }}
                    // validationSchema={ProductItemsValidation}
                    onSubmit={(values) => {
                        this.updateProduct(values);
                    }}
                >
                    {(formikProps) => {
                        const { handleSubmit, values, setFieldValue } = formikProps;
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
                                    marginBottom="50px"
                                >
                                    <p className={styles.headerInputHolder}>
                                        <div className={styles.productHeader}>
                                            <div className={styles.headerDescription}>{values.brand_name !== "" ? values.brand_name : values.de_display_name} <span>|</span> {values.category_name} <span>|</span> {values.subcategory_name}</div>
                                            <div className={styles.mainTitle}>{values.gf_item_name !== null ? values.gf_item_name : values.de_display_name}</div>
                                            <div>
                                                {values.measure_in !== "" &&
                                                    <Badge
                                                        ml="1"
                                                        fontSize="0.6em"
                                                        variant="subtle"
                                                        style={{ marginRight: "10px" }}
                                                        colorScheme="purple"
                                                    >
                                                        {values.measure + "gms"}
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
                                        {/* <div style={{ width: "30%", display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 10 }}>
                                            <Button
                                                isLoading={loadingItems}
                                                variant="outline"
                                                marginRight="20px"
                                                leftIcon={
                                                    editableProductInfo ? (
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
                                                        editableProductInfo: !editableProductInfo,
                                                    });
                                                    handleSubmit();
                                                }}
                                            >
                                                {editableProductInfo ? "Save" : "Edit"}
                                            </Button>
                                            {editableCustomInfo && <Button
                                                isLoading={loadingItems}
                                                variant="outline"
                                                width="180px"
                                                colorScheme="red"
                                                onClick={() => { editableCustomInfo === true && this.setState({ editableCustomInfo: !editableCustomInfo }) }}
                                            >
                                                {"Cancel"}
                                            </Button>}
                                        </div> */}
                                    </p>
                                    <div className={styles.imageSubHeader}>
                                        <p>Image</p>
                                        <div style={{ display: "flex", alignItems: "center", marginTop: "8px" }}>
                                            <Button
                                                variant="outline"
                                                colorScheme="purple"
                                                onClick={() => this.setState({ documentUploader: !documentUploader })}
                                            >
                                                {documentUploader === true ? "-" : "+"}
                                            </Button>
                                            {documentUploader === true &&
                                                <Dropzone id="upload" getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} />
                                            }
                                        </div>
                                    </div>
                                    <Container>
                                        <SortableList items={image} />
                                    </Container>
                                    <div className={styles.subHeader}>
                                        <p>Branch Details</p>
                                    </div>
                                    <Table heading={table_title} rows={valuesNew} sortCallback={(key, type) => sortCallback(key, type)} />
                                </Container>
                                <Container
                                    className={styles.subContainer}
                                    pb={"40px"}
                                    boxShadow="lg"
                                    marginBottom="50px"
                                >
                                    <div className={styles.subContentHeader}>
                                        <p>Custom</p>
                                        <div style={{ width: "30%", display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 10 }}>
                                            <Button
                                                isLoading={loadingItems}
                                                marginRight="20px"
                                                variant="outline"
                                                leftIcon={
                                                    editableCustomInfo ? (
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
                                                onClick={() => { editableCustomInfo === true && handleSubmit(), this.setState({ editableCustomInfo: !editableCustomInfo }) }}
                                            >
                                                {editableCustomInfo ? "Save" : "Edit"}
                                            </Button>
                                            {editableCustomInfo && <Button
                                                isLoading={loadingItems}
                                                variant="outline"
                                                width="180px"
                                                colorScheme="red"
                                                onClick={() => { editableCustomInfo === true && this.setState({ editableCustomInfo: !editableCustomInfo }) }}
                                            >
                                                {"Cancel"}
                                            </Button>}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: "50px" }}>
                                        <CustomInput
                                            label="Keywords"
                                            name="keywords"
                                            type="text"
                                            method="TextArea"
                                            editable={id !== null ? editableCustomInfo : !editableCustomInfo}
                                        />
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Packaging Type"
                                                values={[
                                                    {
                                                        id: 1,
                                                        value: "One",
                                                    },
                                                    {
                                                        id: 2,
                                                        value: "Two",
                                                    },
                                                ]}
                                                name={editableCustomInfo || id === null ? "packaging_type" : "packaging_name"}
                                                type="text"
                                                method="switch"
                                                editable={id !== null ? editableCustomInfo : !editableCustomInfo}
                                            />
                                            {/* <CustomInput label="Variant Of" editable={id !== null ? editableCustomInfo : !editableCustomInfo} name="variant_of" type="text" /> */}
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Cover Type"
                                                values={[
                                                    {
                                                        id: 1,
                                                        value: "One",
                                                    },
                                                    {
                                                        id: 2,
                                                        value: "Two",
                                                    },
                                                ]}
                                                editable={id !== null ? editableCustomInfo : !editableCustomInfo}
                                                name={editableCustomInfo || id === null ? "cover_type" : "cover_name"}
                                                type="text"
                                                method="switch"
                                            />
                                            <CustomInput
                                                editable={id !== null ? editableCustomInfo : !editableCustomInfo}
                                                label="Cover Sizes"
                                                name="cover_sizes"
                                                values={[
                                                    {
                                                        id: 1,
                                                        value: "One",
                                                    },
                                                    {
                                                        id: 2,
                                                        value: "Two",
                                                    },
                                                ]}
                                                type="text"
                                                method="switch"
                                            />
                                        </div>
                                        <CustomInput
                                            label="Description"
                                            name="gf_description"
                                            type="text"
                                            method="TextArea"
                                            editable={id !== null ? editableCustomInfo : !editableCustomInfo}
                                        />
                                    </div>

                                    <CustomInput
                                        label="Detailed Description"
                                        editable={id !== null ? editableCustomInfo : !editableCustomInfo}
                                        name="gf_detailed_description"
                                        type="text"
                                        method="TextArea"
                                    />
                                    {/* <div className={styles.inputHolder}> */}
                                    {/* <div className={styles.switchHolder}>
                                                <label>Variant</label>
                                                <Switch className={styles.switch} isChecked={values.variant === 1 ? true : false} 
                                                onChange={() => values.variant === 1 ? setFieldValue("variant", 0) : setFieldValue("variant", 1)} id="email-alerts" />
                                            </div> */}
                                    {/* </div> */}
                                    <div className={styles.inputHolder}>
                                        <div className={styles.switchHolder}>
                                            <label>Sticker</label>
                                            <Switch className={styles.switch} isChecked={values.sticker === 1 ? true : false}
                                                onChange={() => values.sticker === 1 ? setFieldValue("sticker", 0) : setFieldValue("sticker", 1)} id="email-alerts" />
                                        </div>
                                        <div className={styles.switchHolder}>
                                            <label>Grinding</label>
                                            <Switch className={styles.switch} isChecked={values.grinding === 1 ? true : false}
                                                onChange={() => values.grinding === 1 ? setFieldValue("grinding", 0) : setFieldValue("grinding", 1)} id="email-alerts" />
                                        </div>
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <div className={styles.switchHolder}>
                                            <label>Return</label>
                                            <Switch className={styles.switch} isChecked={values.return === 1 ? true : false}
                                                onChange={() => values.return === 1 ? setFieldValue("return", 0) : setFieldValue("return", 1)} id="email-alerts" />
                                        </div>
                                        <div className={styles.switchHolder}>
                                            <label>Cleaning</label>
                                            <Switch className={styles.switch} isChecked={values.cleaning === 1 ? true : false}
                                                onChange={() => values.cleaning === 1 ? setFieldValue("cleaning", 0) : setFieldValue("cleaning", 1)} id="email-alerts" />
                                        </div>
                                    </div>
                                </Container>
                                <Container
                                    className={styles.subContainer}
                                    pb={"40px"}
                                    boxShadow="lg"
                                    marginBottom="50px"

                                >
                                    <div className={styles.subContentHeader}>
                                        <p>Gofrugal</p>
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Item Name"
                                            name="gf_item_name"
                                            type="text"
                                            editable={id !== null ? editableGofrugalInfo : !editableGofrugalInfo}
                                            method="disabled"
                                        />
                                        <CustomInput label="Weight Grams" editable={id !== null ? editableGofrugalInfo : !editableGofrugalInfo} name="gf_weight_grams" type="text" method="disabled" />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Apply Online"
                                            name="gf_applies_online"
                                            type="text"
                                            editable={id !== null ? editableGofrugalInfo : !editableGofrugalInfo}
                                            method="disabled"
                                        />
                                        <CustomInput label="Product Type" editable={id !== null ? editableGofrugalInfo : !editableGofrugalInfo} name="gf_item_product_type" type="text" method="disabled" />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Manufacturer"
                                            name="gf_manufacturer"
                                            type="text"
                                            editable={id !== null ? editableGofrugalInfo : !editableGofrugalInfo}
                                            method="disabled"
                                        />
                                        <CustomInput label="Food Type" editable={id !== null ? editableGofrugalInfo : !editableGofrugalInfo} name="gf_food_type" type="text" method="disabled" />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Tax"
                                            name="gf_tax_id"
                                            type="text"
                                            method="disabled"
                                            editable={id !== null ? editableGofrugalInfo : !editableGofrugalInfo}
                                        />
                                        <CustomInput label="Status" editable={id !== null ? editableGofrugalInfo : !editableGofrugalInfo} name={"gf_status"} type="text" method="disabled" />
                                    </div>
                                </Container>
                                <Container
                                    className={styles.subContainer}
                                    pb={"40px"}
                                    boxShadow="lg"
                                    marginBottom="50px"

                                >
                                    <div className={styles.subContentHeader}>
                                        <p>Delium</p>
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Distributer"
                                            name="de_distributor"
                                            type="text"
                                            editable={id !== null ? editableDeliumInfo : !editableDeliumInfo}
                                            method="disabled"
                                        />
                                        <CustomInput label="Brand" editable={id !== null ? editableDeliumInfo : !editableDeliumInfo} name="brand_name" type="text" method="disabled" />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Category Name"
                                            name="category_name"
                                            editable={id !== null ? editableDeliumInfo : !editableDeliumInfo}
                                            type="text"
                                            method="disabled"
                                        />
                                        <CustomInput label="Sub Category Name" editable={id !== null ? editableDeliumInfo : !editableDeliumInfo} name="subcategory_name" type="text" method="disabled" />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Measure"
                                            editable={id !== null ? editableDeliumInfo : !editableDeliumInfo}
                                            name="measure"
                                            type="text"
                                            method="disabled"
                                        />
                                        <CustomInput label="Measure In" editable={id !== null ? editableDeliumInfo : !editableDeliumInfo} name="measure_in" type="text" method="disabled" />
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
    var image = [];
    var additionalDetail = [];
    if (context.query.id !== "create") {
        data = await ProductHelper.getProductById(context.query.id);
        image = await ImageHelper.getImageById(context.query.id);
        additionalDetail = await ProductHelper.getById(context.query.id);
    }
    // console.log({correctdataah: data});
    const id = context.query.id != "create" ? data[0].product_id : null;
    return {
        props: { data, image, id, additionalDetail }
    };
}

export default withRouter(ProductItems);