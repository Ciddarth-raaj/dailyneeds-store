import React, { Fragment, forwardRef } from 'react'
import { ErrorMessage, useField, useFormikContext } from 'formik'
import { Input, Textarea, Select, InputGroup, InputRightElement, Button, InputLeftAddon, NumberInput, NumberInputField } from '@chakra-ui/react'
import DatePicker from 'react-datepicker'
import Timekeeper from 'react-timekeeper'
import styles from './customInput.module.css'
import moment from 'moment'

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
            <NumberInput {...field} {...props} size='sm' max={9000000000} keepWithinRange={false} clampValueOnBlur={false}>
              <NumberInputField focusBorderColor='blue.200' borderRadius={'5px'} height={'40px'} />
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
                onChange={val => {
                  setFieldValue(field.name, val)
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
          {method === 'password' && (
            <InputGroup size='md'>
              <Input
                pr='4.5rem'
                {...field}
                {...props}
              />
              <InputRightElement width='4.5rem'>
                <Button h='1.75rem' size='sm' onClick={onClick}>
                  show
                </Button>
              </InputRightElement>
            </InputGroup>
          )

          }
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
            <Input {...field} {...props} autoComplete='off' />
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
