import React, { Fragment, forwardRef } from "react";
import { ErrorMessage, useField, useFormikContext } from "formik";
import { Input, Textarea, Select } from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import Timekeeper from 'react-timekeeper';
import styles from "./customInput.module.css";
import moment from "moment";

const CustomDateTimeInput = forwardRef(({ value, onClick, onChange }, ref) => (
	<Input value={value} onChange={onChange} autoComplete="off" ref={ref} onClick={onClick} />
));

const TextField = ({ label, values, method, selected, onChange, containerStyle, editable, ...props }) => {
	const { setFieldValue } = useFormikContext();
	const [field, meta] = useField(props);
	return (
		<div className={styles.personalInputs} style={containerStyle}>
			<label htmlFor={field.name} className={`${styles.label} ${!editable ? styles.infoLabel : ""}`}>
				{label}
			</label>
			{
				editable != undefined && !editable ? <p className={styles.infoText}>{field.value}</p> : <>
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
							<Timekeeper
								{...field}
								showTimeSelect
								showTimeSelectOnly
								timeCaption="Time"
								dateFormat="hh:mm:ss"
								{...props}
								selected={(moment(field.value).toISOString() && new Date(field.value)) || null}
								onChange={val => {
									setFieldValue(field.name, val.formattedSimple);
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
					{/* {method === "datepicker" && (
						<>
							<TimeRangePicker
								{...field}
								{...props}
								selected={(field.value && new Date(field.value)) || null}
								onChange={val => {
									setFieldValue(field.name, moment(val).format("MM/DD/YYYY"));
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
					)} */}
					{method === "readonly" && (
						<Input {...field} {...props} isDisabled={true} autoComplete="off" />
					)}
					{method === "disabled" && (
						<Input {...field} {...props} isReadOnly={true} autoComplete="off" />
					)}
					{method === undefined && (
						<Input {...field} {...props} autoComplete="off" />
					)}
				</>

			}
			<ErrorMessage
				component="div"
				name={field.name}
				className={styles.errorMessage}
			/>
		</div>
	);
};
export default TextField;
