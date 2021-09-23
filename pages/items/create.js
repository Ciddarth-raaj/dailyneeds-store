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
    createItems(values) {
        toast.success("Successfully Added New Item");
    }

    render() {
        const { loadingItem, loadingSubmit, loadingReset, editItems } =
            this.state;
        const { id } = this.props;
        return (
            <GlobalWrapper title="Items">
                <Head />
                <Formik
                    initialValues={{}}
                    validationSchema={ItemsValidation}
                    onSubmit={(values) => {
                        this.createItems(values);
                    }}
                >
                    {(formikProps) => {
                        const { handleSubmit } = formikProps;
                        return (
                            <Form onSubmit={formikProps.handleSubmit}>
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
                                        <div>Add Items</div>
                                        <div style={{ paddingRight: 10 }}>
                                            <Button
                                                isLoading={loadingItem}
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
                                                    editItems === true &&
                                                        handleSubmit(),
                                                        this.setState({
                                                            editItems:
                                                                !editItems,
                                                        });
                                                }}
                                            >
                                                {editItems ? "Save" : "Edit"}
                                            </Button>
                                        </div>
                                    </p>

                                    <div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Material Name *"
                                                name="name"
                                                type="text"
                                                editable={
                                                    id !== null
                                                        ? editItems
                                                        : !editItems
                                                }
                                            />
                                            <CustomInput
                                                label="Status *"
                                                values={[
                                                    {
                                                        id: "Available",
                                                        value: "Available",
                                                    },
                                                    {
                                                        id: "UnAvailable",
                                                        value: "UnAvailable",
                                                    },
                                                ]}
                                                name="status"
                                                type="text"
                                                method="switch"
                                                editable={
                                                    id !== null
                                                        ? editItems
                                                        : !editItems
                                                }
                                            />
                                        </div>

                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Description *"
                                                name="description"
                                                type="text"
                                                method="TextArea"
                                                editable={
                                                    id !== null
                                                        ? editItems
                                                        : !editItems
                                                }
                                            />
                                            <CustomInput
                                                label="Category *"
                                                values={[
                                                    {
                                                        id: "Stationary",
                                                        value: "Stationary",
                                                    },
                                                    {
                                                        id: "Food",
                                                        value: "Food",
                                                    },
                                                    {
                                                        id: "Clothes",
                                                        value: "Clothes",
                                                    },
                                                ]}
                                                name="category"
                                                type="text"
                                                method="switch"
                                                editable={
                                                    id !== null
                                                        ? editItems
                                                        : !editItems
                                                }
                                            />
                                        </div>

                                        <ButtonGroup
                                            spacing="6"
                                            style={{
                                                display: "flex",
                                                // width: "100%",
                                                justifyContent: "flex-end",
                                            }}
                                        >
                                            <Button
                                                isLoading={loadingSubmit}
                                                loadingText="Submitting"
                                                colorScheme="purple"
                                            >
                                                {"Submit"}
                                            </Button>
                                            <Button
                                                isLoading={loadingReset}
                                                loadingText="Resetting"
                                            >
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

// export async function getServerSideProps(context) {
// 	const data = await FamilyHelper.getFamilyById(context.query.id);
// 	const id = context.query.id != "create" ? data[0].family_id : null;
// 	return {
// 		props: { data, id }
// 	};
// }
export default withRouter(CreateItems);
