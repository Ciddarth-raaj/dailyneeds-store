import React from "react";

import styles from "./budgetModal.module.css";
import { toast } from "react-toastify";
import { CloseIcon } from "@chakra-ui/icons";
import DesignationHelper from "../../helper/designation";
import { Container, Button, Switch } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import BudgetHelper from "../../helper/budget";
import OutletHelper from "../../helper/outlets";
import { withRouter } from 'next/router';

import CustomInput from "../customInput/customInput";
import {
    Input
} from '@chakra-ui/react';
import { BranchValidation } from "../../util/validation";

export default class BudgetModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            // budgetVisibility: false,
            selectedData: undefined,
            toggle: false,
            isLoading: false,
            designation_data: [],
            store_data: []
        };
    }
    componentDidMount() {
        const { visibility } = this.props;
        if(visibility === true) {
        this.getBudgetStore();
        this.getDesignation();
        }
    }
    getBudgetStore() {
        if (this.props.data?.outlet_id !== undefined) {
            BudgetHelper.getBudgetStoreId(this.props.data?.outlet_id)
                .then((data) => {
                    // console.log({endatabudget: data});
                    this.setState({ store_data: data })
                })
                .catch((err) => console.log(err))
        }
    }
    getDesignation() {
        DesignationHelper.getDesignation()
            .then((data) => {
                this.setState({ designation_data: data })
            })
            .catch((err) => console.log(err));
    }
    createOutlets(values) {
        const { router } = this.props;
        OutletHelper.createOutlet({
            outlet_details: values.outlet_details,
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

    createBudget(values) {
        const { router } = this.props;
        delete values.outlet_details;
        // console.log({valueena: Object.keys(values.budget[0]) })
        BudgetHelper.createBudget(values)
            .then((data) => {
                // console.log({data: data});
                if (data === 200) {
                    toast.success("Successfully updated Branch");
                    window.location = "/branch-details"
                } else {
                    toast.error("Error updating Branch")
                    window.location = "/branch-details"  
                }
            })
            .catch((err) => console.log(err));
    }
    
    render() {
        const { setVisibility, visibility, data } = this.props;
        // console.log({budgetVisibility: visibility})
        let arr = [];
        const { toggle, isLoading, designation_data, store_data } = this.state;
    //    console.log({store_dat: store_data})
    //    console.log({store_datalength: store_data.length})
        return (
            <Formik
                initialValues={{
                    store_id: this.props.data?.outlet_id,
                    outlet_details: this.props.data,
                    budget: [],
                    budget_id: []
                    // correct: "2323"
                }}
                // validationSchema={BranchValidation}
                onSubmit={(values) => {
                    this.props.data.outlet_id === undefined ? this.createOutlets(values) : this.createBudget(values);
                }}
            >
                {(formikProps) => {
                    const { handleSubmit, values } = formikProps;
                    values.budget_id = arr;
                    // console.log({values: values});
                    let final = {};
                    let store = store_data.forEach(datum => final[datum.designation_name] = datum.budget);
                    let id = store_data.map(datum => datum.budget)
                    // console.log({storestore: store});
                    return (
                        <Form onSubmit={formikProps.handleSubmit}>
                            <Container className={styles.mainWrapper}>
                                <div
                                    className={styles.wrapper}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <CloseIcon
                                        className={styles.closeButton}
                                        color="red"
                                        onClick={() => setVisibility(false)}
                                    />

                                    <h3 className={styles.title}>
                                        Store Budget
                                    </h3>
                                    <div className={styles.titleHolder}>
                                        <div style={{ fontWeight: '700' }} >Designation</div>
                                        <div style={{ fontWeight: '700' }}>Budget</div>
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
                                    {/* {values.store_id !== undefined && ( */}
                                    <Button
                                        className={styles.updateButton}
                                        style={{ width: "97%" }}
                                        isLoading={isLoading}
                                        colorScheme="purple"
                                        loadingText="Updating"
                                        onClick={() => handleSubmit()}
                                    >
                                        {this.props.data.outlet_id === undefined ? "Create" : "Update"}
                                    </Button>   
                                    <Button
                                     className={styles.updateButton}
                                     style={{ width: "97%" }}
                                     isLoading={isLoading}
                                     colorScheme="red"
                                     loadingText="Updating"
                                     onClick={() => window.location = "/branch-details"}
                                    >
                                        Cancel
                                    </Button>
                                    {/* )} */}
                                </div>
                            </Container>
                        </Form>
                    );
                }}
            </Formik>
        );
    }
}
