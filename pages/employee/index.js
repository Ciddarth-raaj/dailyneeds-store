import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import EmployeeHelper from "../../helper/employee";
import DesignationHelper from "../../helper/designation";
import StoreHelper from "../../helper/store";

import React, { useState, useEffect } from "react";

import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";

function Registration() {
	const initialValue = {
		dob_1: "",
		dob_2: "",
	};

	const table_title = {
		employee_id: "Employee Id",
		name: "Name",
		store_name: "Store Name",
		designation: "Designation",
		status: "Status",
	};
	const [
        data,
        setData
    ] = useState({
        employee: []
    })
	const [
        designationData,
        setDesignationData
    ] = useState({
		designation: []
    })
	const [
        storeData,
        setStoreData
    ] = useState({
		store: []
    })
    // useEffect(() => getEmployeeData(), getDesignationData(), [])
	useEffect(() => {
		getEmployeeData();
		getDesignationData();
		getStoreData();
	}, [])

    function getEmployeeData() {
        EmployeeHelper.getEmployee()
            .then((data) => {
                setData({ employee: data });
            })
            .catch((err) => console.log(err));
    }

	function getDesignationData() {
        DesignationHelper.getDesignation()
            .then((data) => {
                setDesignationData({ designation: data });
            })
            .catch((err) => console.log(err));
    }
	function getStoreData() {
		StoreHelper.getStore()
			.then((data) => {
				setStoreData({ store: data});
			})
			.catch((err) => console.log(err));
	}
	function designationName(id) {
		var name = "";
			designationData.designation.map((m) => {
			if(m.id == id) {
				name = m.value;
			}
		})
		return name;
	} 
	function storeName(id) {
		var storeName = "";
		storeData.store.map((m) => {
			if(m.id == id) {
				storeName = m.value;
			}
		})		
		return storeName
	}
	const valuesNew = data.employee.map((m) => (
		{
			id: m.employee_id,
			name: m.employee_name,
			store_name: storeName(m.store_id),
			designation: designationName(m.designation_id),
			status: m.status ? "Active" : "In Active",
		}
	));

	const sortCallback = (key, type) => {
		console.log(key, type);
	};

	return (
		<Formik
			initialValues={initialValue}
			onSubmit={(values) => {
				console.log(values);
			}}
			validationSchema={Validation}
		>
			<Form>
				<GlobalWrapper title="Employee Details">
					<Head />
					<Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
						<Container className={styles.container} boxShadow="lg">
							<p className={styles.buttoninputHolder} >
								<div>Employee</div>
								<div style={{paddingRight: 10}}>
									<Button colorScheme="purple">
										<Link href="/employee/create">
											{"Add"}
										</Link>
									</Button>
								</div>
							</p>
							<div>
								<div className={styles.personalInputHolder}>
									{/* <CustomInput label="Store" name="stores" type="text" method="switch" />
									<CustomInput label="Designation" name="designation" type="text" method="switch" /> */}
									{/* <CustomInput label="Joining Date" name="dob_1" type="text" /> */}
									{/* <CustomInput label="Resignation Date" name="dob_2" type="text" /> */}
									{/* <CustomInput label="Current Employees" name="employee" type="text" method="switch" /> */}
								</div>

								{/* <div className={styles.searchButton}>
									<CustomInput name="search" type="text" />
									<button>{"Search"}</button>
								</div> */}
								<Table heading={table_title} rows={valuesNew} sortCallback={(key, type) => sortCallback(key, type)} />
							</div>
						</Container>
					</Flex>
				</GlobalWrapper>
			</Form>
		</Formik>
	);
}

export default Registration;
