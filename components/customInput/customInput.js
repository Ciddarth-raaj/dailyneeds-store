import React, { Fragment, forwardRef } from 'react'
import { ErrorMessage, useField, useFormikContext } from 'formik'
import "react-datetime/css/react-datetime.css";

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
} from '@chakra-ui/react'
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import Datetime from 'react-datetime';
import Timekeeper from 'react-timekeeper'
import styles from './customInput.module.css'
import moment from 'moment'
import { range } from 'react-big-calendar/lib/utils/dates';

const CustomDateTimeInput = forwardRef(({ value, onClick, onChange }, ref) => (
  <Input
    value={value ? moment(value).format('DD/MM/YYYY') : value}
    onChange={onChange}
    autoComplete='off'
    ref={ref}
    onClick={onClick}
  />
))

const TextField = ({
  label,
  values,
  children,
  method,
  onClick,
  selected,
  onChange,
  containerStyle,
  editable,
  ...props
}) => {
  const { setFieldValue } = useFormikContext()
  const [field, meta] = useField(props)
  const [startDate, setStartDate] = useState(new Date());
  let start = 1950;
  let end = new Date().getFullYear();
  let arr = [];
  for(let i = start; i<=end; i++) {
    arr.push(i);
  }

  const years = arr;
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
  return (
    <div className={styles.personalInputs} style={containerStyle}>
      <label
        htmlFor={field.name}
        className={`${styles.label} ${!editable ? styles.infoLabel : ''}`}
      >
        {label}
      </label>
      {editable != undefined && !editable ? (
        <p className={styles.infoText}>{field.value}</p>
      ) : (
        <>
          {method === 'TextArea' && (
            <Textarea
              {...field}
              {...props}
              width='100%'
              // height="73%"
              size='lg'
            />
          )}
          {method === 'number' && (
            <NumberInput
              {...field}
              {...props}
              size='sm'
              max={9000000000}
              keepWithinRange={false}
              clampValueOnBlur={false}
            >
              <NumberInputField
                focusBorderColor='blue.200'
                borderRadius={'5px'}
                height={'40px'}
              />
              {field.name > 9000000000 && (
                <ErrorMessage
                  component='div'
                  name='three'
                  className={styles.errorMessage}
                />
              )}
            </NumberInput>
          )}
          {method === 'switch' && (
            <Select {...field} placeholder='Select Option'>
              {values?.map(m => (
                <Fragment>
                  <option value={m.id}>{m.value}</option>
                  <ErrorMessage
                    component='div'
                    name={field.name}
                    className={styles.errorMessage}
                  />
                </Fragment>
              ))}
            </Select>
          )}
          {method === 'timepicker' && (
            <>
              <Timekeeper
                {...field}
                showTimeSelect
                showTimeSelectOnly
                timeCaption='Time'
                dateFormat='hh:mm:ss'
                {...props}
                switchToMinuteOnHourSelect={true}
                selected={
                  (moment(field.value).toISOString() &&
                    new Date(field.value)) ||
                  null
                }
                onChange={val => {
                  setFieldValue(field.name, val.formattedSimple)
                }}
                customInput={<CustomDateTimeInput />}
              />
              {selected === '' && (
                <ErrorMessage
                  component='div'
                  name={field.name}
                  className={styles.errorMessage}
                />
              )}
            </>
          )}
          {method === 'datepicker' && (
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
                    <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>
                      {"<"}
                    </button>
                    <select
                      value={val}
                      onChange={({ target: { value } }) => changeYear(value)}
                    >
                      {years.map((option) => (
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
          
                    <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
                      {">"}
                    </button>
                  </div>
                )}
                onChange={val => {
                  setFieldValue(field.name, moment(val).format("YYYY-MM-DD"))
                }}
              />
              {selected === '' && (
                <ErrorMessage
                  component='div'
                  name={field.name}
                  className={styles.errorMessage}
                />
              )}
            </>
          )}
          {method === 'password' && (
            <InputGroup size='md'>
              <Input pr='4.5rem' {...field} {...props} />
              <InputRightElement width='4.5rem'>
                <Button h='1.75rem' size='sm' onClick={onClick}>
                  Show
                </Button>
              </InputRightElement>
            </InputGroup>
          )}
          {method === 'readonly' && (
            <Input {...field} {...props} isDisabled={true} autoComplete='off' />
          )}
          {method === 'disabled' && (
            <Input {...field} {...props} isReadOnly={true} autoComplete='off' />
          )}
          {method === 'numberinput' && (
            <InputGroup>
              <InputLeftAddon children={children} />
              <Input {...field} {...props} />
            </InputGroup>
          )}
          {method === undefined && (
            <Input {...field} {...props} a autoComplete='off' />
          )}
          {method === 'singlevalue' && (
              <Input 
                value={props.selected}
                isDisabled={true}
                isReadOnly={true}
              />
          )}
        </>
      )}
      <ErrorMessage
        component='div'
        name={field.name}
        className={styles.errorMessage}
      />
    </div>
  )
}
export default TextField
