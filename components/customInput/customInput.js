import React, { Fragment } from "react";
import { ErrorMessage, useField } from "formik";
import { Input, Textarea, Select } from "@chakra-ui/react";

import styles from "./customInput.module.css";

const TextField = ({ label, values, method, ...props }) => {
	const [field, meta] = useField(props);
	return (
		<div className={styles.personalInputs}>
			<label htmlFor={field.name} className={styles.label}>
				{label}
			</label>
			{method === "TextArea" && (
				<Textarea
					{...field}
					{...props}
					width="100%"
					// height="73%"
					size="lg"
				/>
			)}
			{method === "switch" && (
				<Select {...field} placeholder="Select option">
					{values?.map((m) => (
						<Fragment>
							<option value={m.id}>{m.value}</option>
							<ErrorMessage
								component="div"
								name={field.name}
								className={`errorMessage`}
							/>
						</Fragment>
					))}
				</Select>
			)}
			{method === undefined && (
				<Input {...field} {...props} autoComplete="off" />
			)}
			<ErrorMessage
				component="div"
				name={field.name}
				className={`errorMessage`}
			/>
		</div>
	);
};
export default TextField;
