import React, { Fragment, forwardRef, useCallback } from "react";
import { ErrorMessage, useField, useFormikContext } from "formik";

import {
  Input,
  Textarea,
  Select,
  InputGroup,
  InputRightElement,
  Button,
  InputLeftAddon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormErrorMessage,
} from "@chakra-ui/react";
import { useState } from "react";
import DatePicker from "react-datepicker";
import Datetime from "react-datetime";
import Timekeeper from "react-timekeeper";
import styles from "./customInput.module.css";
import moment from "moment";
import { range } from "react-big-calendar/lib/utils/dates";
import { useDropzone } from "react-dropzone";

export const CustomDateTimeInput = forwardRef(
  ({ value, onClick, onChange, variant = "outline", style, disabled }, ref) => (
    <Input
      value={value ? moment(value).format("DD/MM/YYYY") : value}
      onChange={onChange}
      autoComplete="off"
      ref={ref}
      onClick={onClick}
      variant={variant}
      style={style}
      disabled={disabled}
    />
  )
);
CustomDateTimeInput.displayName = "CustomDateTimeInput";

const TextField = ({
  label,
  values,
  children,
  defaultValue,
  method,
  onClick,
  selected,
  onChange,
  containerStyle,
  editable,
  accept,
  maxSize = 5242880,
  floatingLabel = false,
  position = "top",
  labelWidth = "min-width",
  ...props
}) => {
  const { setFieldValue } = useFormikContext();
  const [field, meta] = useField(props);
  const [startDate, setStartDate] = useState(new Date());
  let start = 1950;
  let end = new Date().getFullYear();
  let endexpiry = 2050;
  let arr = [];
  let expiryarr = [];
  for (let i = start; i <= end; i++) {
    arr.push(i);
  }

  for (let i = start; i <= endexpiry; i++) {
    expiryarr.push(i);
  }
  const years = arr;
  const expiryyear = expiryarr;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Add file upload handling
  const onDrop = useCallback(
    (acceptedFiles) => {
      setFieldValue(field.name, acceptedFiles[0]);
    },
    [field.name, setFieldValue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const getStaticLabelStyles = () => {
    const positions = {
      top: { display: "block", marginBottom: "4px", width: labelWidth },
      bottom: { display: "block", marginTop: "4px", width: labelWidth },
      left: { display: "inline-block", marginRight: "8px", width: labelWidth },
      right: { display: "inline-block", marginLeft: "8px", width: labelWidth },
    };
    return positions[position] || positions.top;
  };

  const getDisplayValue = (value) => {
    if (!value && value !== 0 && value !== "0") {
      return "N/A";
    }

    if (method === "datepicker") {
      return moment(value).format("DD/MM/YYYY");
    }

    if (method === "switch") {
      return values.find((item) => item.id === value)?.value ?? "N/A";
    }

    return value;
  };

  return (
    <div className={styles.personalInputs} style={containerStyle}>
      {editable != undefined && !editable ? (
        <div
          style={{
            display: "flex",
            flexDirection:
              position === "left" || position === "right" ? "row" : "column",
            alignItems:
              position === "left" || position === "right"
                ? "center"
                : "flex-start",
          }}
        >
          <label
            className={styles.uneditableLabel}
            style={getStaticLabelStyles()}
          >
            {label.replace("*", "")}
          </label>
          <p className={styles.infoText}>{getDisplayValue(field.value)}</p>
        </div>
      ) : (
        <>
          {[
            "TextArea",
            "number",
            "expiry-datepicker",
            "switch",
            "timepicker",
            "datepicker",
            "password",
            "readonly",
            "disabled",
            "numberinput",
            undefined,
          ].includes(method) && (
            <FormControl variant={floatingLabel ? "floating" : "default"}>
              <div
                style={{
                  display: "flex",
                  flexDirection:
                    position === "left" || position === "right"
                      ? "row"
                      : "column",
                  alignItems:
                    position === "left" || position === "right"
                      ? "center"
                      : "flex-start",
                }}
              >
                {!floatingLabel && (
                  <label
                    className={styles.label}
                    style={getStaticLabelStyles()}
                  >
                    {label}
                  </label>
                )}
                {method === "TextArea" && (
                  <Textarea
                    {...field}
                    {...props}
                    width="100%"
                    placeholder={floatingLabel ? " " : props.placeholder}
                  />
                )}
                {method === "number" && (
                  <NumberInput
                    {...field}
                    {...props}
                    size="sm"
                    max={9000000000}
                    keepWithinRange={false}
                    clampValueOnBlur={false}
                  >
                    <NumberInputField
                      focusBorderColor="blue.200"
                      borderRadius={"5px"}
                      height={"40px"}
                      placeholder={floatingLabel ? " " : props.placeholder}
                    />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                )}
                {method === "switch" && (
                  <Select {...field} {...props} placeholder="Select Option">
                    {values?.map((m) => (
                      <Fragment key={m.id}>
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

                {method === undefined && (
                  <Input
                    {...field}
                    {...props}
                    autoComplete="off"
                    placeholder={floatingLabel ? " " : props.placeholder}
                  />
                )}
                {floatingLabel && <FormLabel>{label}</FormLabel>}
              </div>
              <FormErrorMessage>
                <ErrorMessage name={field.name} />
              </FormErrorMessage>
            </FormControl>
          )}
          {method === "expiry-datepicker" && (
            <>
              <DatePicker
                {...field}
                {...props}
                selected={(field.value && new Date(field.value)) || null}
                customInput={<CustomDateTimeInput />}
                renderCustomHeader={({
                  val,
                  changeYear,
                  changeMonth,
                  decreaseMonth,
                  increaseMonth,
                  prevMonthButtonDisabled,
                  nextMonthButtonDisabled,
                }) => (
                  <div
                    style={{
                      margin: 10,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      onClick={decreaseMonth}
                      disabled={prevMonthButtonDisabled}
                    >
                      {"<"}
                    </button>
                    <select
                      value={val}
                      onChange={({ target: { value } }) => changeYear(value)}
                    >
                      {expiryyear.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <select
                      value={months[moment(val).month()]}
                      onChange={({ target: { value } }) =>
                        changeMonth(months.indexOf(value))
                      }
                    >
                      {months.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={increaseMonth}
                      disabled={nextMonthButtonDisabled}
                    >
                      {">"}
                    </button>
                  </div>
                )}
                onChange={(val) => {
                  setFieldValue(field.name, moment(val).format("YYYY-MM-DD"));
                }}
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
          {method === "timepicker" && (
            <>
              <Timekeeper
                {...field}
                showTimeSelect
                showTimeSelectOnly
                timeCaption="Time"
                dateFormat="hh:mm:ss"
                {...props}
                switchToMinuteOnHourSelect={true}
                selected={
                  (moment(field.value).toISOString() &&
                    new Date(field.value)) ||
                  null
                }
                onChange={(val) => {
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
          {method === "datepicker" && (
            <>
              <DatePicker
                {...field}
                {...props}
                selected={(field.value && new Date(field.value)) || null}
                customInput={<CustomDateTimeInput disabled={props.disabled} />}
                onChange={(val) => {
                  setFieldValue(field.name, moment(val).format("YYYY-MM-DD"));
                }}
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
          {method === "password" && (
            <InputGroup size="md">
              <Input pr="4.5rem" {...field} {...props} />
              <InputRightElement width="3.5rem">
                <img
                  src="/assets/password.png"
                  onClick={onClick}
                  style={{ height: "35px", width: "35px", cursor: "pointer" }}
                />
              </InputRightElement>
            </InputGroup>
          )}
          {method === "readonly" && (
            <Input {...field} {...props} isDisabled={true} autoComplete="off" />
          )}
          {method === "disabled" && (
            <Input {...field} {...props} isReadOnly={true} autoComplete="off" />
          )}
          {method === "numberinput" && (
            <InputGroup>
              <InputLeftAddon>{children}</InputLeftAddon>
              <Input defaultValue={defaultValue} {...field} {...props} />
            </InputGroup>
          )}
          {method === "singlevalue" && (
            <Input value={props.selected} isDisabled={true} isReadOnly={true} />
          )}
          {method === "file" && (
            <div className={styles.fileUpload}>
              <div
                {...getRootProps()}
                className={`${styles.dropzone} ${
                  isDragActive ? styles.dragActive : ""
                }`}
              >
                <input {...getInputProps()} />
                {field.value ? (
                  <div className={styles.fileInfo}>
                    <i className="fa fa-file" />
                    <span className={styles.fileNameStyle}>
                      {field.value.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFieldValue(field.name, null);
                      }}
                      className={styles.removeFile}
                    >
                      <i className="fa fa-times" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.placeholder}>
                    <i className="fa fa-cloud-upload" />
                    <p
                      className={styles.fileNameStyle}
                      style={{ textAlign: "center" }}
                    >
                      {isDragActive
                        ? "Drop the file here"
                        : "Drag & drop a file here, or click to select"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
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
