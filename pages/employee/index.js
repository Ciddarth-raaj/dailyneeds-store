import { Formik, Form } from "formik";
import { Container, Flex } from "@chakra-ui/react";

import styles from "../../styles/admin.module.css";

import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import IconButton from "../../components/iconButton/iconButton";

function Registration() {
	const initialValue = {
		dob_1: "",
		dob_2: "",
	};
	const details = [
		{
			id: "1",
			name: "KEERTHI",
			store: "ssss",
			designation: "Manager",
			join: "12.10/1996",
			resign: "12/10/2000",
			status: "Active",
		},
		{
			id: "2",
			name: "Sindhu HI",
			store: "gh",
			designation: "Manager",
			join: "12.10/1996",
			resign: "12/10/2000",
			status: "Active",
		},
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

								<table className={styles.table}>
									<thead>
										<tr>
											<th>
												Employee ID
												<IconButton />{" "}
											</th>
											<th>
												Name
												<IconButton />
											</th>
											<th>
												Store Name
												<IconButton />
											</th>
											<th>
												Designation
												<IconButton />
											</th>
											<th>
												Joining Date
												<IconButton />
											</th>
											<th>
												Resignation Date
												<IconButton />
											</th>
											<th>
												Seen Status
												<IconButton />
											</th>
											<th>
												Action
												<IconButton />
											</th>
										</tr>
									</thead>
									<tbody>
										{details.map((m) => (
											<tr>
												<td>{m.id}</td>
												<td>{m.name}</td>
												<td>{m.store}</td>
												<td>{m.designation}</td>
												<td>{m.join}</td>
												<td>{m.resign}</td>
												<td>{m.status}</td>
												<td>
													<img
														src={"/assets/edit.png"}
														className={styles.icon}
													/>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Container>
					</Flex>
				</GlobalWrapper>
			</Form>
		</Formik>
	);
}

export default Registration;
