//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Container, Button } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

//Styles
import styles from "../../styles/registration.module.css";

//Internal Dependencies
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
        };
    }

    save() {
        const { editItems } = this.state;
        editItems ? "" : toast.success("Successfully Saved!");
    }

    render() {
        const { loadingItems, editItems } = this.state;

        return (
            <GlobalWrapper title="Products">
                <Head />
                <Formik
                    initialValues={{
                        id: "19",
                        name: "Noodles",
                        display_name: "Maggi",
                        brand_name: "Nestlé",
                        combo_name: "Family Pack",
                        department_name: "Food",
                        category_name: "Noodles",
                        subcategory_name: "Cup Noodles",
                        distributor: "City Supermarket",
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
                        const { handleSubmit } = formikProps;
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
                                    <p className={styles.buttoninputHolder}>
                                        <div>Product Item Details</div>
                                        <div style={{ paddingRight: 10 }}>
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
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Id *"
                                                name="id"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Name *"
                                                name="name"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Display Name *"
                                                name="display_name"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Brand Name *"
                                                name="brand_name"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Combo Name *"
                                                name="combo_name"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Department Name *"
                                                name="department_name"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Category Name *"
                                                name="category_name"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <div className={styles.inputHolder}>
                                                <CustomInput
                                                    label="Sub Category Name *"
                                                    name="subcategory_name"
                                                    type="text"
                                                    editable={editItems}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Distributor *"
                                                name="distributor"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Distributor Name *"
                                                name="distributor_name"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Manufacturer Name *"
                                                name="manufacturer_name"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Flavours *"
                                                name="flavours"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Measure *"
                                                name="measure"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Measure In *"
                                                name="measure_in"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Packaging Type *"
                                                name="packaging_type"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Preparation Type *"
                                                name="preparation_type"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Cleaning *"
                                                name="cleaning"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Packing Type *"
                                                name="packing_type"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Sticker *"
                                                name="sticker"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Grinding *"
                                                name="grinding"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Cover Type *"
                                                name="cover_type"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Cover Size *"
                                                name="cover_size"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Tax Id *"
                                                name="tax_id"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="HSN Code *"
                                                name="hsn_code"
                                                type="text"
                                                editable={editItems}
                                            />
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Status *"
                                                name="status"
                                                type="text"
                                                editable={editItems}
                                            />
                                            {/* <CustomInput
                                                label="Allowed Online *"
                                                name="is_online_allowed"
                                                type="text"
                                                editable={editItems}
                                            /> */}
                                            <CustomInput
                                                label="Allowed Online *"
                                                values={[
                                                    {
                                                        id: "1",
                                                        value: "Yes",
                                                    },
                                                    {
                                                        id: "2",
                                                        value: "No",
                                                    },
                                                ]}
                                                name="is_online_allowed"
                                                type="text"
                                                method="switch"
                                                editable={editItems}
                                            />
                                        </div>
                                        {/* <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Last Updated *"
                                                name="last_updated"
                                                type="text"
                                                method="datepicker"
                                                editable={editItems}
                                            />
                                            <CustomInput
                                                label="Created At *"
                                                name="created_at"
                                                type="text"
                                                method="datepicker"
                                                editable={editItems}
                                            />
                                        </div> */}
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Life Cycle *"
                                                name="life_cycle"
                                                type="text"
                                                editable={editItems}
                                            />
                                            <div
                                                className={`${styles.inputHolder} ${styles.hidden}`}>
                                            </div>
                                        </div>
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
