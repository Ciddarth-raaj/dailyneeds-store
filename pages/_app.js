import '../styles/globals.css'
import 'react-dropzone-uploader/dist/styles.css'
import 'react-toastify/dist/ReactToastify.css'
import 'react-datepicker/dist/react-datepicker.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '../constants/variables'
import React from 'react'
import { ToastContainer } from 'react-toastify'

import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import router from 'next/router'

const Container = {
  baseStyle: {
    maxWidth: 'unset'
  }
}

const theme = extendTheme({
  components: {
    Container
  }
})
const unprotectedPath = {
  //   '/employee': true,
  //   '/department': true,
  //   '/designation': true,
  //   '/shift': true,
  //   '/family': true,
  //   '/document': true,
  //   '/without-adhaar': true,
  //   '/bank': true,
  //   '/salary': true,
  //   '/resignation': true,
  //   '/products': true,
  //   '/categories': true,
  //   '/subcategories': true,
  //   '/brands': true,
  //   '/product-department': true,
  //   '/indent': true,
  //   '/indent/sentIndent': true,
  //   '/indent/received': true,
  //   '/addissue': true,
  //   '/indent/despatch': true,
  //   '/indent/acceptIndent': true,
  //   '/indent/issueReceived': true,
  //   '/indent/issueSent': true,
  //   '/open-issue': true,
  //   '/serviceprovider-list': true
  '/': true
}
class MyApp extends React.Component {
  constructor (props) {
    super(props)
    this.initUser()
  }

  initUser () {
    try {
      const token = localStorage.getItem('token')
      const designation_id = localStorage.getItem('designation_id')
      const store_id = localStorage.getItem('store_id')
      const user_type = localStorage.getItem('user_type')

      console.log('Location : ', router.pathname)

      if (
        unprotectedPath[router.pathname] == undefined &&
        (token == undefined || token == null)
      ) {
        window.location = '/'
      }

      if (
        token !== undefined ||
        designation_id !== null ||
        store_id !== undefined ||
        user_type == null
      ) {
        global.config.Token = token
        global.config.designation_id = designation_id
        global.config.store_id = store_id
        global.config.user_type = user_type
      }
    } catch (err) {
      console.log(err)
    }
  }

  render () {
    const { Component, pageProps } = this.props
    return (
      <ChakraProvider theme={theme}>
        <ToastContainer />
        <Component {...pageProps} />
      </ChakraProvider>
    )
  }
}

export default MyApp
