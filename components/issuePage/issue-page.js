import React from 'react'

import styles from '../../styles/issue.module.css'
import ProductHelper from "../../helper/product";
import { toast } from 'react-toastify'
import IssueHelper from '../../helper/issue';
import { withRouter } from 'next/router';
import { CloseIcon } from '@chakra-ui/icons';
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";
// import IssueHelper from '../helper/issue'
import { 
    Container, 
    Button,
 } from '@chakra-ui/react'
import { Formik, Form } from 'formik'
import CustomInput from '../../components/customInput/customInput'
// import { BranchValidation } from '../util/validation'

class IssuePage extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      toggle: false,
      paginate_filter: false,
      pages: [],
      splice: [0, 10],
      offsetToggle: false,
      offset: 0,
      isLoading: false,
      product_data: [],
      hoverElement: false,
      show: true,
      product_id: '',
      de_name: '',
      token: ''
    }
  }
  componentDidMount() {
      this.getProduct();
  }
  createIssue(values) {
    const { router } = this.props;
    values.product_id = this.state.product_id.toString();
    IssueHelper.createIssue(values)
    .then((data) => {
        if (data == 200) {
            toast.success("Successfully Added Issue!");
            router.push("/indent/acceptIndent")
        } else {
            toast.error("Error creating Issue!");
            throw `${data.msg}`;
        }
    })
    .catch((err) => console.log(err))
    .finally(() => this.setState({ loading: false }));
}
  getProduct() {
    ProductHelper.getAll()
        .then((data) => {
            this.setState({ product_data: data })
        })
        .catch((err) => console.log(err))
}
  render () {
    const { setVisibility, data } = this.props
    const { isLoading, product_data, hoverElement, product_id, splice, pages, paginate_filter, de_name } = this.state;
    return (
      <Formik
        initialValues={{
          indent_id: this.props.data?.id,
          product_id: '',
          sent: '',
          received: '',
          difference: '',
        }}
        onSubmit={(values) => {
          this.createIssue(values);
        }}
      >
        {formikProps => {
          const { handleSubmit, values, setValues } = formikProps;
          if(values.sent !== '' && values.received !== '') {
              values.difference = parseInt(values.sent) - parseInt(values.received);
          }
          values.difference = values.difference.toString();

          return (
            <Form onSubmit={formikProps.handleSubmit}>
              <Container className={styles.mainWrapper}>
                <div
                  className={styles.wrapper}
                  onClick={(e) => e.stopPropagation()}
                >
                <CloseIcon
                    className={styles.closeButton}
                    color="red"
                    onClick={() => setVisibility(false)}
                />
                <div>
                <div className={styles.dropdown}>
                    <input placeholder="Store Name" onChange={(e) => this.setState({ de_name: e.target.value })} type="text" value={de_name === "" ? de_name : `${de_name}`} onMouseEnter={() => this.setState({ hoverElement: false })}
                            className={styles.dropbtn} />
                    <div className={styles.newDropdowncontent} style={hoverElement === false ? { color: "black" } : { display: "none" }}>
                            {product_data.filter(({ de_name }) => de_name.indexOf(this.state.de_name.toLowerCase()) > -1).map((m) => (
                                <a onClick={() => (this.setState({ product_id: m.product_id, hoverElement: true }))}>
                                    {m.de_name}<br />{`# ${m.product_id}`}</a>
                            ))}
                            {/* <div className={styles.paginate}>
                                <div className={styles.paginateContent}>
                                    <div
                                        className={styles.arrow}
                                        style={{ pointerEvents: this.state.splice[0] !== 0 ? "auto" : "none" }}
                                        onClick={() =>
                                            this.setState({
                                                splice: [this.state.splice[0] - 10, this.state.splice[1] - 10]
                                            })}
                                    >
                                        <ChevronLeftIcon />
                                    </div>
                                    {pages.slice(splice[0], splice[1]).map((m) => (
                                        <div
                                            className={styles.paginateHolder}
                                            onClick={() => {
                                                this.setState({ filterOffsetToggle: true, offset: (m - 1) * 10 })
                                            }}
                                        >
                                            {m}
                                        </div>
                                    ))}
                                    <div
                                        className={styles.arrow}
                                        onClick={() =>
                                            this.setState({
                                                splice: [this.state.splice[0] + 10, this.state.splice[1] + 10]
                                            })}
                                    >
                                        <ChevronRightIcon />
                                    </div>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
                  <div className={styles.inputHolder}>
                    <CustomInput 
                        placeholder='0'
                        name='sent'
                        type='text'
                        children='Sent'
                        method='numberinput'
                    />
                     <CustomInput 
                        placeholder='0'
                        name='received'
                        type='text'
                        children='Received'
                        method='numberinput'
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
                    Update
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

export default withRouter(IssuePage);
