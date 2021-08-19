
import React from 'react';
import { ErrorMessage, useField } from 'formik';
import { Input, Textarea, Select } from "@chakra-ui/react";

const TextField = ({ label, value1, value2, value3, method, ...props }) => {
  const [field, meta] = useField(props);
  return (
    <div>
      <label htmlFor={field.name}>{label}</label>
      {method === "TextArea" &&
      <Textarea
      {...field}
      {...props}
      width="100%"
      height="73%"
      size="lg"
      />
      }
      {method === "switch" &&
      <Select placeholder="Select option">
      <option value="option1">{value1}</option>
      <option value="option2">{value2}</option>
      <option value="option3">{value3}</option>
      </Select>
      }
      {method === undefined &&
      <Input
        {...field} {...props}
        autoComplete="off"
      />
      }
      <ErrorMessage component="div" name={field.name} className={`errorMessage`} />
    </div>
  )
}
export default TextField