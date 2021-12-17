import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Switch, Badge } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import EmployeeHelper from "../../helper/employee";
import DesignationHelper from "../../helper/designation";
import OutletsHelper from "../../helper/outlets";
import StoreHelper from "../../helper/store";

import React, { useState, useEffect } from "react";

import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import { toast } from "react-toastify";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

function Registration() {
	const initialValue = {
		dob_1: "",
		dob_2: "",
	};
	// const image = (m) => (
	// 	<div style={{ display: "flex", justifyContent: "center" }}>
	// 		<img src={"/assets/edit.png"} onClick={() => window.location = `/employee/${m}`} className={styles.icon} />
	// 	</div>
	// );
	const table_title = {
		employee_id: "Employee Id",
		name: "Name",
		// store_name: "Store Name",
		designation: "Designation",
		status: "Status",
		// action: "Action",
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
		OutletsHelper.getOutlet()
			.then((data) => {
				setStoreData({ store: data });
			})
			.catch((err) => console.log(err));
	}
	const onClick = (m) => (
        <Link href={`/employee/${m.id}`}>{m.value}</Link>
	)
	const [
        status,
        setStatus
    ] = useState({
        id: 0,
        status: ''
    })
    useEffect(() => updateStatus(), [status])
	const badge = (m) => (
        <Switch className={styles.switch} id="email-alerts" defaultChecked={m.value === 1} onChange={() => { setStatus({ status: m.value === 1 ? 0 : 1, id: m.id})}} />
    )
	function updateStatus() {
		if(status.status !== '' ) {
			EmployeeHelper.updateStatus({
				employee_id: status.id,
				status: status.status
			})
				.then((data) => {
				   if(data.code === 200) {
					   toast.success("Successfully updated Status");
				   } else {
					   toast.error("Not Updated")
				   }
				})
				.catch((err) => console.log(err));
			} else {
				console.log('clear');
			}
		}
	function designationName(n) {
		var name = "";
		designationData.designation.map((m) => {
			if (m.id == n.value) {
				name = m.value;
			}
		})
		return <Link href={`/employee/${n.id}`}>{name}</Link>;
	}
	function storeName(n) {
		var storeName = "";
		storeData.store.map((m) => {
			if (m.outlet_id == n.value) {
				storeName = m.value;
			}
		})
		return  <Link href={`/employee/${n.id}`}>{storeName}</Link> ;
	}
	const valuesNew = data.employee.map((m) => (
		{
			id: m.employee_id,
			name: onClick({value: m.employee_name, id: m.employee_id}),
			// store_name: storeName({value: m.store_id, id: m.employee_id}),
			designation: designationName({value: m.designation_id, id: m.employee_id}),
			status: badge({value: m.status, id: m.employee_id}),
			// action: image(m.employee_id),
		}
	));

	const sortCallback = (key, type) => {
		console.log(key, type);
	};

	const getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
			id: "Employee Id",
			name: "Name",
			store_name: "Store Name",
			designation: "Designation",
			status: "Status",
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.employee_id,
                name: d.employee_name,
                store_name: d.store_id,
				designation: d.designation_id,
				status: d.status
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "employee_details" + moment().format("DD-MMY-YYYY")
        );
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
								<div style={{ paddingRight: 10 }}>
									<Link href="/employee/create">
										<Button colorScheme="purple">
											{"Add"}
										</Button>
									</Link>
								</div>
							</p>
							<div>
								<Table heading={table_title} rows={valuesNew} sortCallback={(key, type) => sortCallback(key, type)} />
								<ButtonGroup
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        paddingBottom: 15,
                                    }}
                                >
                                    <Button
                                        colorScheme="purple"
                                        onClick={() => getExportFile()}
                                    >
                                        {"Export"}
                                    </Button>
                                </ButtonGroup>
							</div>
						</Container>
					</Flex>
				</GlobalWrapper>
			</Form>
		</Formik>
	);
}

export default Registration;
