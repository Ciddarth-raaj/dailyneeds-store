//External Dependancies
import { Formik, Form } from 'formik'
import { Container, Flex, Button, ButtonGroup, Badge } from '@chakra-ui/react'
import React, { useState, useEffect } from 'react'
import { CheckIcon, CloseIcon, LockIcon } from '@chakra-ui/icons'

//Styles
import styles from '../../styles/admin.module.css'

//Helpers
import DocumentHelper from '../../helper/document'

//InternalDependancies
import { IdCardType } from '../../constants/values'
import { toast } from 'react-toastify'
import CustomInput from '../../components/customInput/customInput'
import Head from '../../util/head'
import GlobalWrapper from '../../components/globalWrapper/globalWrapper'
import { Validation } from '../../util/validation'
import Table from '../../components/table/table'
import Link from 'next/link'
import exportCSVFile from '../../util/exportCSVFile'
import moment from 'moment'

function documentView () {
  const initialValue = {
    dob_1: '',
    dob_2: ''
  }
  // const image = (m) => (
  //     <div style={{ display: "flex", justifyContent: "center" }}>
  //         <img src={"/assets/edit.png"} onClick={() => window.location = `/department/${m}`} className={styles.icon} />
  //     </div>
  // );
  const onClick = m => <Link href={`/document/${m.id}`}>{m.value}</Link>
  const [status, setStatus] = useState({
    id: 0,
    status: ''
  })
  useEffect(() => updateStatus(), [status])
  function getAllDocuments () {
    DocumentHelper.getAllDocuments()
      .then(data => {
        setData({ document: data })
      })
      .catch(err => console.log(err))
  }
  const badge = m => (
    <>
      <CheckIcon
        style={{ color: 'green' }}
        id='email-alerts'
        onClick={() => {
          ApproveDocument({ id: m.id, is_verified: '1' })
        }}
      />
      <CloseIcon
        style={{ color: 'red' }}
        className={styles.switch}
        id='email-alerts'
        onClick={() => {
          ApproveDocument({ id: m.id, is_verified: '-1' })
        }}
      />
    </>
  )

  function ApproveDocument (id) {
    DocumentHelper.approveDocument({
      document_id: id.id,
      is_verified: id.is_verified
    })
      .then(data => {
        if (data.code == 200) {
          if (id.is_verified == 1) {
            toast.success('Successfully Approved Document!')
          } else {
            toast.success('Successfully Declined Document!')
          }
        } else {
          toast.error('Error Approving Document!')
          throw `${data.msg}`
        }
      })
      .catch(err => console.log(err))
  }

  function updateStatus () {
    if (status.status !== '') {
      DocumentHelper.updateStatus({
        document_id: status.id,
        status: status.status
      })
        .then(data => {
          if (data.code === 200) {
            toast.success('Successfully updated Status')
          } else {
            toast.error('Not Updated')
          }
        })
        .catch(err => console.log(err))
    } else {
      console.log('clear')
    }
  }
  const download = href => {
    console.log({ href: href })
    fetch(href, {
      mode: 'no-cors',
      method: 'GET',
      headers: {}
    })
      .then(response => {
        response.arrayBuffer().then(function (buffer) {
          const url = window.URL.createObjectURL(new Blob([buffer]))
          const link = document.createElement('a')
          link.href = url
          const extension = href.split('.')[href.split('.').length - 1]
          link.setAttribute('download', `file.${extension}`)
          document.body.appendChild(link)
          link.click()
        })
      })
      .catch(err => {
        console.log(err)
      })
  }
  const downloader = m => (
    <a href={m.file} target='_blank' onClick={() => download(m.file)}>
      <img src='/assets/downloadblack.png' className={styles.iconDownload} />
    </a>
  )
  const verify = m => (
    <Link href={`/document/${m.id}`}>
      <Badge
        colorScheme={
          m.value === 'new' ? '' : m.value === 'verified' ? 'green' : 'red'
        }
      >
        {m.value}
      </Badge>
    </Link>
  )
  const table_title = {
    employee_id: 'Document Id',
    name: 'Employee Name',
    card_type: 'Card Type',
    card_no: 'Card Number',
    card_name: 'Card Name',
    verified: 'Verification',
    // status: "Status",
    action: 'Action',
    downloader: 'Download'
  }

  const [data, setData] = useState({
    document: []
  })
  useEffect(() => getAllDocuments(), [])

  function type (n) {
    var cardName = ''
    IdCardType.map(m => {
      if (m.id == n.value) {
        cardName = m.value
      }
    })
    return <Link href={`/document/${n.id}`}>{cardName}</Link>
  }

  const valuesNew = data.document.map(m => ({
    id: m.document_id,
    name: onClick({ value: m.employee_name, id: m.document_id }),
    card_type: type({ value: m.card_type, id: m.document_id }),
    card_no: onClick({ value: m.card_no, id: m.document_id }),
    card_name: onClick({ value: m.card_name, id: m.document_id }),
    verified: verify({
      value:
        m.is_verified === 0
          ? 'new'
          : m.is_verified === 1
          ? 'verified'
          : 'denied',
      id: m.document_id
    }),
    // status: badge({value: m.status , id: m.document_id}),
    action: badge({ id: m.document_id, verifycheck: m.is_verified }),
    downloader: downloader({ file: m.file })
  }))

  const sortCallback = (key, type) => {
    console.log(key, type)
  }

  const getExportFile = () => {
    const TABLE_HEADER = {
      SNo: 'SNo',
      id: 'Document Id',
      name: 'Employee Name',
      card_type: 'Card Type',
      card_no: 'Card Number',
      card_name: 'Card Name',
      verified: 'Verification',
      status: 'Status'
    }
    const formattedData = []
    valuesNew.forEach((d, i) => {
      formattedData.push({
        SNo: i + 1,
        id: d.document_id,
        name: d.employee_name,
        card_type: d.card_type,
        card_no: d.card_no,
        card_name: d.card_name,
        verified: d.verified,
        status: d.status
      })
    })
    exportCSVFile(
      TABLE_HEADER,
      formattedData,
      'document_details' + moment().format('DD-MMY-YYYY')
    )
  }

  return (
    <Formik
      initialValues={initialValue}
      onSubmit={values => {
        console.log(values)
      }}
      validationSchema={Validation}
    >
      <Form>
        <GlobalWrapper title='Document Details'>
          <Head />
          <Flex templateColumns='repeat(3, 1fr)' gap={6} colSpan={2}>
            <Container className={styles.container} boxShadow='lg'>
              <p className={styles.buttoninputHolder}>
                <div>View Documents</div>
              </p>
              <div>
                <Table
                  heading={table_title}
                  rows={valuesNew}
                  sortCallback={(key, type) => sortCallback(key, type)}
                />
                <ButtonGroup
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingBottom: 15
                  }}
                >
                  <Button colorScheme='purple' onClick={() => getExportFile()}>
                    {'Export'}
                  </Button>
                </ButtonGroup>
              </div>
            </Container>
          </Flex>
        </GlobalWrapper>
      </Form>
    </Formik>
  )
}

export default documentView
