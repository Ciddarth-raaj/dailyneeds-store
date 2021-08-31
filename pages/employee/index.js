import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";

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
		joining_date: "Joining Date",
		resignation_date: "Resignation Date",
		status: "Status",
	};

	const valuesNew = [
		{
			id: <span>{"1"}</span>,
			name: <span>{"Ciddarth"}</span>,
			store_name: <span>{"Store 1"}</span>,
			designation: <span>{"Manager"}</span>,
			joining_date: <span>{"21/08/22"}</span>,
			resignation_date: <span>{"22/08/22"}</span>,
			status: <span>{"Active"}</span>,
		},
	];

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
									<CustomInput label="Store" name="stores" type="text" method="switch" />
									<CustomInput label="Designation" name="designation" type="text" method="switch" />
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
