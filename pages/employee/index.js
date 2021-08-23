import { Formik, Form } from "formik";
import { Container, Flex } from "@chakra-ui/react";

import styles from "../../styles/admin.module.css";

import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";

function Registration() {
	const initialValue = {
		dob_1: "",
		dob_2: "",
	};

	const table_title = {
		employee_id: 'Employee Id',
		name: 'Name',
		store_name: 'Store Name',
		designation: 'Designation',
		joining_date: 'Joining Date',
		resignation_date: 'Resignation Date',
		status: 'Status',
		action: 'Action'
	}

	const valuesNew = [
		{
			id: "1",
			name: "Ciddarth",
			store_name: "Store 1",
			designation: "Manager",
			joining_date: "21/08/22",
			resignation_date: "22/08/22",
			status: "Active"
		}
	]

	const values = [
		[
			'1',
			'KEERTHI',
			'Saravana',
			'Manager',
			'12.10/1996',
			'12/10/2000',
			'Active',
			<img src={"/assets/edit.png"} className={styles.icon} />
		],
		[
			'2',
			'NAME 1',
			'Krishna Sweets',
			'Manager',
			'12.10/1996',
			'12/10/2000',
			'Active',
			<img src={"/assets/edit.png"} className={styles.icon} />
		],
	];
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
							<p>Employee</p>
							<div>
								<div className={styles.personalInputHolder}>
									<div className={styles.inputHolder}>
										<CustomInput
											label="All Stores"
											name="stores"
											type="text"
											method="switch"
										/>
										<CustomInput
											label="Joining Date"
											name="dob_1"
											type="text"
										/>
									</div>
									<div className={styles.inputHolder}>
										<CustomInput
											label="All Designation"
											name="designation"
											type="text"
											method="switch"
										/>
										<CustomInput
											label="Resignation Date"
											name="dob_2"
											type="text"
										/>
									</div>
									<div className={styles.inputHolder}>
										<CustomInput
											label="Current Employees"
											name="employee"
											type="text"
											method="switch"
										/>
									</div>
								</div>

								<div className={styles.searchButton}>
									<CustomInput name="search" type="text" />
									<button>{"Search"}</button>
								</div>
								<Table heading={table_title} rows={valuesNew} />
							</div>
						</Container>
					</Flex>
				</GlobalWrapper>
			</Form>
		</Formik>
	);
}

export default Registration;
