import React, { Fragment, forwardRef } from "react";
import { ErrorMessage, useField, useFormikContext } from "formik";
import { Input, Textarea, Select } from "@chakra-ui/react";
import DatePicker from "react-datepicker";

import styles from "./customInput.module.css";

const CustomDateTimeInput = forwardRef(({ value, onClick, onChange }, ref) => (
	<Input value={value} onChange={onChange} autoComplete="off" ref={ref} onClick={onClick} />
));

const TextField = ({ label, values, method, selected, onChange, containerStyle, ...props }) => {
	const { setFieldValue } = useFormikContext();
	const [field, meta] = useField(props);

	return (
		<div className={styles.personalInputs} style={containerStyle}>
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
				<Select {...field} placeholder="Select Option">
					{values?.map((m) => (
						<Fragment>
							<option value={m.id}>{m.value}</option>
							<ErrorMessage
								component="div"
								name={field.name}
								className={styles.errorMessage}
							/>
						</Fragment>
					))}
				</Select>
			)}
			{method === "timepicker" && (
				<>
					<DatePicker
						{...field}
						showTimeSelect
						showTimeSelectOnly
						timeCaption="Time"
						dateFormat="hh:mm:ss"
						{...props}
						selected={(field.value && new Date(field.value)) || null}
						onChange={val => {
							setFieldValue(field.name, val);
						}}
						customInput={<CustomDateTimeInput />}
					/>
					{selected === "" && (
						<ErrorMessage
							component="div"
							name={field.name}
							className={styles.errorMessage}
						/>
					)}
				</>
			)}
			{method === "datepicker" && (
				<>
					<DatePicker
						{...field}
						{...props}
						selected={(field.value && new Date(field.value)) || null}
						onChange={val => {
							setFieldValue(field.name, val);
						}}
						customInput={<CustomDateTimeInput />}
					/>
					{selected === "" && (
						<ErrorMessage
							component="div"
							name={field.name}
							className={styles.errorMessage}
						/>
					)}
				</>
			)}
			{method === undefined && (
				<Input {...field} {...props} autoComplete="off" />
			)}
			<ErrorMessage
				component="div"
				name={field.name}
				className={styles.errorMessage}
			/>
		</div>
	);
};
export default TextField;
