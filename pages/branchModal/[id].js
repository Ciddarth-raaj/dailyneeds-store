import React from "react";

import styles from "./branchModal.module.css";
import { toast } from "react-toastify";
import BudgetModal from "../../components/budgetModal/budgetModal";
import { CloseIcon } from "@chakra-ui/icons";
import { Container, Button, Switch, Input, ButtonGroup } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import { withRouter } from 'next/router';
import Head from "../../util/head";
import DesignationHelper from "../../helper/designation";
import FormikErrorFocus from "formik-error-focus";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";

import OutletHelper from "../../helper/outlets";
import CustomInput from "../../components/customInput/customInput";
import BranchHelper from "../../helper/outlets";
import { BranchValidation } from "../../util/validation";
import BudgetHelper from "../../helper/budget";

class BranchModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            budget_trigger: false,
            budgetVisibility: false,
            selectedData: undefined,
            store_data: [],
            designation_data: [],
            toggle: false,
            isLoading: false,
            store_id: undefined,
        };
    }
    componentDidMount() {
        this.getBudgetStore();
        this.getBudgetStoreId();
        this.getDesignation();
    }
    getBudgetStoreId() {
        if (this.props.data[0]?.outlet_id !== undefined) {
            BudgetHelper.getBudgetStoreId(this.props.data[0]?.outlet_id)
                .then((data) => {
                    // console.log({endatabudget: data});
                    this.setState({ store_data: data })
                })
                .catch((err) => console.log(err))
        }
    }
    getBudgetStore() {
        BudgetHelper.getBudgetStore(this.props.data[0]?.outlet_id)
        .then((data) => {
            // console.log({enadatabudget: data});
            this.setState({ store_id: data[0] })
        })
        .catch((err) => console.log(err))
    }
    getDesignation() {
        DesignationHelper.getDesignation()
            .then((data) => {
                this.setState({ designation_data: data })
            })
            .catch((err) => console.log(err));
    }
    updateOutlet(values) {
        delete values.budget;
        delete values.budget_id;
		const { router } = this.props;
		OutletHelper.updateOutlet({
			outlet_id: this.props.data[0].outlet_id,
            outlet_details: values
		})
			.then((data) => {
			   if(data.code === 200) {
				   toast.success("Successfully updated Branch");
                //    router.push("/branch-details")
			   } else {
				   toast.error("Error updating Branch")
                   router.push("/branch-details")
			   }
			})
			.catch((err) => console.log(err));
	}
    createBudget(values) {
        const { router } = this.props;
        delete values.outlet_name;
        delete values.outlet_nickname;
        delete values.outlet_phone;
        delete values.phone;
        delete values.outlet_address;

        delete values.outlet_details;
        // console.log({valueena: Object.keys(values.budget[0]) })
        BudgetHelper.createBudget(values)
            .then((data) => {
                // console.log({data: data});
                if (data === 200) {
                    toast.success("Successfully updated Branch");
                    router.push("/branch-details")
                } else {
                    toast.error("Error updating Branch")
                    router.push("/branch-details")  
                }
            })
            .catch((err) => console.log(err));
    }
    createOutlets(values) {
        delete values.store_id;
        delete values.budget_id;

        const { router } = this.props;
        OutletHelper.createOutlet({
            outlet_details: { 
                outlet_name: values.outlet_name,
                outlet_nickname: values.outlet_nickname,
                outlet_phone: values.outlet_phone,
                phone: values.phone,
                outlet_address: values.outlet_address
            },
            budget: values.budget
        })
            .then((data) => {
                if (data == 200) {
                    toast.success("Successfully Added Store")
                    window.location = "/branch-details"
                } else {
                    toast.error("Error Adding Store!");
                    throw `${data.msg}`;
                }
            })
            .catch((err) => console.log(err))
    }
    render() {
        const { setVisibility, id } = this.props;
        const { toggle, isLoading, store_data, designation_data, budgetVisibility, selectedData, store_id } = this.state;
        return (
            <GlobalWrapper title="Branch Modal">
            <Head />
            <Formik
                initialValues={{
                    outlet_name: this.props.data[0]?.outlet_name,
                    outlet_nickname: this.props.data[0]?.outlet_nickname,
                    outlet_phone: this.props.data[0]?.outlet_phone,
                    phone: this.props.data[0]?.phone,
                    outlet_address: this.props.data[0]?.outlet_address,
                    store_id: this.props.data[0]?.outlet_id,
                    budget: [],
                    budget_id: []
                }}
                validationSchema={BranchValidation}
                onSubmit={(values) => {
                    if(this.state.budget_trigger === false) {
                    id !== null ? this.updateOutlet(values) : this.createOutlets(values);
                    } else {
                        this.createBudget(values);   
                    }
                }}
            >
                {(formikProps) => {
                    const { handleSubmit, values } = formikProps;
                    let final = {};
                    let store = store_data.forEach(datum => final[datum.designation_name] = datum.budget);
                    let id = store_data.map(datum => datum.budget)
                    // console.log({final: final});
                    return (
                        <Form onSubmit={formikProps.handleSubmit}>
                            <FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
                              {budgetVisibility && (
                            <BudgetModal
                                data={selectedData}
                                visibility={budgetVisibility}
                                setVisibility={(v) =>
                                    this.setState({ budgetVisibility: v })
                                }
                            />
                        )}
                            <Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
                                {this.props.id !== null ?
                                <p>Update Branch Modal</p> : 
                                <p>Create Branch Modal</p>
                                }
                            <div className={styles.wrapper}>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Brand Name"
                                            name="outlet_name"
                                            type="text"
                                        />
                                         <CustomInput
                                            label="Brand Nickname"
                                            name="outlet_nickname"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Contact Number"
                                            name="outlet_phone"
                                            type="text"
                                        />
                                         <CustomInput
                                            label="Phone Numbers (Separated by ,)"
                                            name="phone"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Address"
                                            name="outlet_address"
                                            type="text"
                                            method="TextArea"
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
                                    {/* {store_id === undefined && ( */}
                                    {/* <Button
                                        // className={styles.budgetButton}
                                        // style={{width: "97%"}}
                                        isLoading={isLoading}
                                        colorScheme="purple"
                                        variant='outline'
                                        loadingText="Updating"
                                        onClick={() => id !== null ? this.setState({ budgetVisibility: true, selectedData: this.props.data[0]}) : ( handleSubmit() )}
                                    >
                                        Add Budget
                                    </Button> */}
                                    {/* )} */}
                                    
                                    {this.props.id !== null && (
                                    <Button
                                        // className={styles.updateButton}
                                        // style={{width: "97%"}}
                                        isLoading={isLoading}
                                        colorScheme="purple"
                                        loadingText="Updating"
                                        onClick={() => handleSubmit()}
                                    >
                                        Update
                                    </Button>
                                    )}
                                    </ButtonGroup>
                                </div>
                            </Container>
                            <Container maxW="container.xl" className={styles.container} mt={"20px"} pb={"20px"} boxShadow="lg">
                            <p>Store Budget</p>  
                            <div className={styles.titleHolder}>
                                        <div style={{ fontWeight: '700', fontSize: '17px' }} >Designation</div>
                                        <div style={{ fontWeight: '700', fontSize: '17px' }}>Budget</div>
                                    </div>
                                    {store_data.length > 0 ? (
                                    <div className={styles.contentHolder}>
                                        {designation_data.map((m, i) => (
                                            <div className={styles.inputHolder}>
                                                <div style={{ height: "70%", width: "50%" }}>
                                                    <Input value={m.value} isReadOnly={true} autoComplete='off' />
                                                </div>
                                                <div style={{ width: "50%", height: "70%" }}>
                                                    {/* {store_data.map((n) => ( */}
                                                    <CustomInput
                                                        placeholder="0"
                                                        children="Budget"
                                                        defaultValue={final[m.value] ? final[m.value] : ""}
                                                        name={`budget[${i}].${m.value}`}
                                                        type="text"
                                                        method="numberinput"
                                                    />
                                                     {/* ))}    */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    ) : (
                                    <div className={styles.contentHolder}>    
                                        {designation_data.map((m, i) => (
                                            <div className={styles.inputHolder}>
                                                <div style={{ height: "70%", width: "50%" }}>
                                                    <Input value={m.value} isReadOnly={true} autoComplete='off' />
                                                </div>
                                                <div style={{ width: "50%", height: "70%" }}>
                                                    <CustomInput
                                                        placeholder="0"
                                                        children="Budget"
                                                        name={`budget[${i}].${m.value}`}
                                                        type="text"
                                                        method="numberinput"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    )}
                                      <Button
                                        className={styles.updateButton}
                                        style={{ width: "97%" }}
                                        isLoading={isLoading}
                                        colorScheme="purple"
                                        loadingText="Updating"
                                        onClick={() => { if(this.props.data[0]?.outlet_id !== undefined) { this.setState({budget_trigger: true}) } handleSubmit() }}
                                    >
                                        {this.props.data[0]?.outlet_id === undefined ? "Create" : "Update"}
                                    </Button>   
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
	data = await BranchHelper.getOutletByOutletId(context.query.id);
    // console.log({dataaaaaaaaaaaaa: data});
	}
	const id = context.query.id != "create" ? data[0].outlet_id : null;
	return {
		props: { data, id }
	};
}

export default withRouter(BranchModal);