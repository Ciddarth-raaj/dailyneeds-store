import React, { Fragment, forwardRef, useCallback } from "react";
import { ErrorMessage, useField, useFormikContext } from "formik";
import {
  Input,
  Textarea,
  Select,
  InputGroup,
  InputRightElement,
  InputLeftAddon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Switch,
  Flex,
  Text,
  Button,
} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import Timekeeper from "react-timekeeper";
import styles from "./customInput.module.css";
import moment from "moment";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import SearchableDropdown from "./SearchableDropdown";

export const CustomDateTimeInput = forwardRef(
  (
    {
      value,
      onClick,
      onChange,
      variant = "outline",
      style,
      disabled,
      placeholder,
    },
    ref
  ) => (
    <Input
      value={value ? moment(value).format("DD/MM/YYYY") : value}
      onChange={onChange}
      autoComplete="off"
      ref={ref}
      onClick={onClick}
      variant={variant}
      size="sm"
      height="40px"
      borderRadius="6px"
      focusBorderColor="purple.400"
      fontSize="sm"
      style={style}
      disabled={disabled}
      placeholder={placeholder}
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
  labelWidth = "unset",
  multiple = false,
  renderer,
  ignoreMarginBottom = false,
  ...props
}) => {
  const { setFieldValue } = useFormikContext();
  const [field] = useField(props);
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
  const FORM_CONTROL_METHODS = [
    "TextArea",
    "number",
    "expiry-datepicker",
    "switch",
    "searchable-dropdown",
    "timepicker",
    "datepicker",
    "password",
    "readonly",
    "disabled",
    "numberinput",
    "switch_toggle",
    "file",
    undefined,
  ];
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
      if (multiple) {
        // For multiple files, set as array
        const currentFiles = Array.isArray(field.value) ? field.value : [];
        setFieldValue(field.name, [...currentFiles, ...acceptedFiles]);
      } else {
        // For single file, set as single file
        setFieldValue(field.name, acceptedFiles[0]);
      }
    },
    [field.name, field.value, setFieldValue, multiple]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: multiple,
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
    if (props.value || props.value == 0) return props.value;
    if (!value && value !== 0 && value !== "0") return "N/A";

    switch (method) {
      case "datepicker":
        return moment(value).format("DD/MM/YYYY");
      case "switch":
      case "searchable-dropdown": {
        const option = values.find((item) => String(item.id) === String(value));
        if (option) return option.value;
        return value != null && value !== "" ? String(value) : "N/A";
      }
      case "file":
        if (Array.isArray(value) && value.length > 0) {
          return (
            <Flex flexDirection="column" gap="16px" mt="4px">
              {value.map((item, index) => (
                <Flex key={index} gap="12px" alignItems="center">
                  <Text fontSize="sm" noOfLines={1} maxW={"250px"}>
                    {item.replace(
                      "https://dailyneeds-assets-dev.s3.ap-south-1.amazonaws.com/",
                      ""
                    )}
                  </Text>
                  <Link href={item} passHref>
                    <a target="_blank" rel="noopener noreferrer">
                      <Button size="xs" variant="link" colorScheme="purple">
                        Open File
                      </Button>
                    </a>
                  </Link>
                </Flex>
              ))}
            </Flex>
          );
        }
        return (
          <Flex>
            <Text>{value}</Text>
          </Flex>
        );
      default:
        return value;
    }
  };

  return (
    <div className={styles.personalInputs} style={{ ...containerStyle, marginBottom: ignoreMarginBottom ? 0 : "22px" }}>
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
            {label?.replace("*", "")}
          </label>
          {renderer ? (
            renderer(field.value)
          ) : (
            <p className={styles.infoText}>{getDisplayValue(field.value)}</p>
          )}
        </div>
      ) : (
        <>
          {FORM_CONTROL_METHODS.includes(method) && (
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
                  <Flex w="100%">
                    <label
                      className={styles.label}
                      style={getStaticLabelStyles()}
                    >
                      {label}
                    </label>

                    <ErrorMessage
                      component="div"
                      name={field.name}
                      className={styles.errorMessage}
                    />
                  </Flex>
                )}
                {(() => {
                  switch (method) {
                    case "TextArea":
                      return (
                        <Textarea
                          {...field}
                          {...props}
                          width="100%"
                          size="sm"
                          minHeight="40px"
                          borderRadius="6px"
                          focusBorderColor="purple.400"
                          fontSize="sm"
                          placeholder={floatingLabel ? " " : props.placeholder}
                          onWheel={(e) => e.target.blur()}
                        />
                      );
                    case "switch_toggle":
                      return (
                        <Flex align="center" gap={2}>
                          <Switch
                            id={field.name}
                            isChecked={!!field.value}
                            onChange={onChange}
                            isDisabled={props.isDisabled || !editable}
                            colorScheme="purple"
                            {...props}
                          />
                          <Text
                            fontSize="sm"
                            color={field.value ? "green.500" : "gray.400"}
                          >
                            {field.value ? "Active" : "Inactive"}
                          </Text>
                        </Flex>
                      );
                    case "number":
                      return (
                        <NumberInput
                          {...field}
                          {...props}
                          size="sm"
                          max={9000000000}
                          keepWithinRange={false}
                          clampValueOnBlur={false}
                          onWheel={(e) => e.target.blur()}
                        >
                          <NumberInputField
                            focusBorderColor="purple.400"
                            borderRadius="6px"
                            height="40px"
                            fontSize="sm"
                            placeholder={floatingLabel ? " " : props.placeholder}
                          />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      );
                    case "switch":
                      return (
                        <Select
                          {...field}
                          {...props}
                          size="sm"
                          height="40px"
                          borderRadius="6px"
                          focusBorderColor="purple.400"
                          fontSize="sm"
                          placeholder="Select Option"
                        >
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
                      );
                    case "searchable-dropdown":
                      return (
                        <SearchableDropdown
                          name={field.name}
                          options={values ?? []}
                          value={field.value}
                          onChange={(id) => setFieldValue(field.name, id)}
                          placeholder={props.placeholder ?? "Search or select..."}
                          isDisabled={!editable}
                          size="sm"
                        />
                      );
                    case undefined:
                      return (
                        <Input
                          {...field}
                          {...props}
                          size="sm"
                          height="40px"
                          borderRadius="6px"
                          focusBorderColor="purple.400"
                          fontSize="sm"
                          autoComplete="off"
                          placeholder={floatingLabel ? " " : props.placeholder}
                          onWheel={(e) => e.target.blur()}
                          onChange={(val) => {
                            setFieldValue(field.name, val.target.value);
                            onChange && onChange(val.target.value);
                          }}
                          bg="white"
                        />
                      );
                    default:
                      return null;
                  }
                })()}
                {floatingLabel && <FormLabel>{label}</FormLabel>}
              </div>
              <FormErrorMessage>
                <ErrorMessage name={field.name} />
              </FormErrorMessage>
            </FormControl>
          )}
          {(() => {
            switch (method) {
              case "expiry-datepicker":
                return (
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
                );
              case "timepicker":
                return (
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
                );
              case "datepicker":
                return (
                  <>
                    <DatePicker
                      {...field}
                      {...props}
                      selected={(field.value && new Date(field.value)) || null}
                      customInput={
                        <CustomDateTimeInput
                          disabled={props.disabled}
                          placeholder={props.placeholder}
                        />
                      }
                      onChange={(val) => {
                        onChange && onChange(val);
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
                );
              case "password":
                return (
                  <InputGroup size="sm">
                    <Input
                      pr="4.5rem"
                      size="sm"
                      height="40px"
                      borderRadius="6px"
                      focusBorderColor="purple.400"
                      fontSize="sm"
                      bg="white"
                      {...field}
                      {...props}
                      onWheel={(e) => e.target.blur()}
                    />
                    <InputRightElement width="3.5rem">
                      <i
                        className="fa fa-eye"
                        onClick={onClick}
                        style={{
                          cursor: "pointer",
                          color: "var(--chakra-colors-purple-500)",
                        }}
                      />
                    </InputRightElement>
                  </InputGroup>
                );
              case "readonly":
                return (
                  <Input
                    size="sm"
                    height="40px"
                    borderRadius="6px"
                    fontSize="sm"
                    {...field}
                    {...props}
                    isDisabled={true}
                    autoComplete="off"
                    onWheel={(e) => e.target.blur()}
                  />
                );
              case "disabled":
                return (
                  <Input
                    size="sm"
                    height="40px"
                    borderRadius="6px"
                    fontSize="sm"
                    bg="white"
                    {...field}
                    {...props}
                    isReadOnly={true}
                    autoComplete="off"
                    onWheel={(e) => e.target.blur()}
                  />
                );
              case "numberinput":
                return (
                  <InputGroup size="sm">
                    <InputLeftAddon borderRadius="6px" fontSize="sm" height="40px">{children}</InputLeftAddon>
                    <Input
                      size="sm"
                      height="40px"
                      borderRadius="6px"
                      focusBorderColor="purple.400"
                      fontSize="sm"
                      bg="white"
                      defaultValue={defaultValue}
                      {...field}
                      {...props}
                      onWheel={(e) => e.target.blur()}
                    />
                  </InputGroup>
                );
              case "singlevalue":
                return (
                  <Input
                    size="sm"
                    height="40px"
                    borderRadius="6px"
                    fontSize="sm"
                    bg="white"
                    value={props.selected}
                    isDisabled={true}
                    isReadOnly={true}
                    onWheel={(e) => e.target.blur()}
                  />
                );
              case "file":
                return (
                  <div className={styles.fileUpload}>
                    <div
                      {...getRootProps()}
                      className={`${styles.dropzone} ${isDragActive ? styles.dragActive : ""
                        }`}
                    >
                      <input {...getInputProps()} />
                      {multiple ? (
                        <>
                          {Array.isArray(field.value) && field.value.length > 0 ? (
                            <div className={styles.fileList}>
                              {field.value.map((file, index) => (
                                <div key={index} className={styles.fileInfo}>
                                  <i className="fa fa-file" />
                                  <span className={styles.fileNameStyle}>
                                    {(file.name ?? file)?.replace(
                                      "https://dailyneeds-assets-dev.s3.ap-south-1.amazonaws.com/",
                                      ""
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updatedFiles = field.value.filter(
                                        (_, i) => i !== index
                                      );
                                      setFieldValue(
                                        field.name,
                                        updatedFiles.length > 0 ? updatedFiles : null
                                      );
                                    }}
                                    className={styles.removeFile}
                                  >
                                    <i className="fa fa-times" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.placeholder}>
                              <i className="fa fa-cloud-upload" />
                              <p
                                className={styles.fileNameStyle}
                                style={{ textAlign: "center" }}
                              >
                                {isDragActive
                                  ? "Drop the files here"
                                  : "Drag & drop files here, or click to select"}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                );
              default:
                return null;
            }
          })()}
        </>
      )}
      {/* <ErrorMessage
        component="div"
        name={field.name}
        className={styles.errorMessage}
      /> */}
    </div>
  );
};
/**
 * Standalone input (no Formik). Use for inline editing with value/onChange.
 * Supports: text, number, and method="switch" (dropdown).
 */
export function CustomInputStandalone({
  label,
  value,
  onChange,
  type = "text",
  method,
  values = [],
  editable = true,
  placeholder,
  size = "sm",
  ...rest
}) {
  const handleChange = (e) => {
    const v = e?.target?.value;
    if (method === "switch" || type === "text") onChange(v);
    else if (type === "number") onChange(v !== "" ? Number(v) : null);
  };

  const displayValue =
    method === "switch" && values?.length
      ? values.find((item) => String(item.id) === String(value))?.value ?? ""
      : value;

  if (!editable) {
    return (
      <div>
        {label && (
          <label className={styles.label} style={{ display: "block", marginBottom: "4px" }}>
            {label}
          </label>
        )}
        <p className={styles.infoText}>{displayValue ?? "N/A"}</p>
      </div>
    );
  }

  const renderInput = () => {
    switch (method) {
      case "switch":
        return (
          <Select
            size={size}
            height="40px"
            borderRadius="6px"
            focusBorderColor="purple.400"
            fontSize="sm"
            value={value ?? ""}
            onChange={handleChange}
            placeholder={placeholder}
            {...rest}
          >
            {values.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.value}
              </option>
            ))}
          </Select>
        );
      default:
        switch (type) {
          case "number":
            return (
              <NumberInput
                size={size}
                value={value ?? ""}
                onChange={(_, val) => onChange(val !== "" ? Number(val) : null)}
                min={0}
                {...rest}
              >
                <NumberInputField placeholder={placeholder} />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            );
          default:
            return (
              <Input
                size={size}
                height="40px"
                borderRadius="6px"
                focusBorderColor="purple.400"
                fontSize="sm"
                value={value ?? ""}
                onChange={handleChange}
                placeholder={placeholder}
                type={type}
                {...rest}
              />
            );
        }
    }
  };

  return (
    <FormControl size={size}>
      {label && (
        <FormLabel fontSize="sm" mb={1}>
          {label}
        </FormLabel>
      )}
      {renderInput()}
    </FormControl>
  );
}

export default TextField;
