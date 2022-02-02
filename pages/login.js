import React from 'react'

import styles from '../styles/login.module.css'
import { toast } from 'react-toastify'

import { CloseIcon } from '@chakra-ui/icons'
import LoginHelper from '../helper/login'
import { Container, Button, Switch } from '@chakra-ui/react'
import { Formik, Form } from 'formik'
import CustomInput from '../components/customInput/customInput'
import { BranchValidation } from '../util/validation'

export default class LogIn extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      toggle: false,
      isLoading: false,
      show: true,
      token: ''
    }
  }
  login (values) {
    LoginHelper.login(values.username, values.password)
      .then(data => {
        if (data.code === 400) {
          toast.error(`${data.msg}`)
        }
        if (data.data.code === 200) {
          localStorage.setItem('Token', data.data.token)
          localStorage.setItem('Store_id', data.data.store_id)
          localStorage.setItem('Designation_id', data.data.designation_id)
          localStorage.setItem('User_type', data.data.user_type)
          localStorage.setItem('Employee_id', data.data.employee_id)
          global.config.name = data.data.name
          global.config.designation = data.data.designation
          global.config.employee_image = data.data.employee_image
          this.props.setVisibility(true)
        }
      })
      .catch(err => console.log(err))
  }
  render () {
    const { setVisibility } = this.props
    const { toggle, isLoading, show, token } = this.state
    return (
      <Formik
        initialValues={{
          username: '',
          password: ''
        }}
        onSubmit={values => {
          this.login(values)
        }}
      >
        {formikProps => {
          const { handleSubmit, values } = formikProps
          return (
            <Form onSubmit={formikProps.handleSubmit}>
              <Container className={styles.mainWrapper}>
                <div
                  className={styles.wrapper}
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className={styles.title}>
                    <img src={'/assets/dnds-logo.png'} />
                  </h3>

                  <div className={styles.inputHolder}>
                    <CustomInput
                      label='User Name'
                      name='username'
                      type='text'
                    />
                  </div>
                  <div className={styles.inputHolder}>
                    <CustomInput
                      label='Password'
                      name='password'
                      type={!show ? 'text' : 'password'}
                      onClick={() => this.setState({ show: !show })}
                      method='password'
                      autocapitalize='none'
                    />
                  </div>
                  <Button
                    className={styles.updateButton}
                    style={{ width: '97%', marginBottom: '25px' }}
                    isLoading={isLoading}
                    colorScheme='purple'
                    loadingText='Updating'
                    onClick={() => handleSubmit()}
                  >
                    Login
                  </Button>
                </div>
              </Container>
            </Form>
          )
        }}
      </Formik>
    )
  }
}
