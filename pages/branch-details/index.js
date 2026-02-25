import { Formik, Form } from "formik";
import {
  Container,
  Flex,
  Switch,
  ButtonGroup,
  Button,
  IconButton,
  Text,
} from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React from "react";

// import BranchModal from "../components/branchModal/branchModal";
import BranchHelper from "../../helper/outlets";
import { toast } from "react-toastify";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import Link from "next/link";
import { Menu, MenuItem } from "@szhsin/react-menu";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import { capitalize } from "../../util/string";
import Badge from "../../components/Badge";
import currencyFormatter from "../../util/currencyFormatter";
import CustomMenu from "../../components/CustomMenu";
import { Router, withRouter } from "next/router";

const HEADINGS = {
  outlet_id: "ID",
  outlet_name: "Name",
  outlet_nickname: "Nickname",
  action: "Action",
};

class BranchDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      branchModalVisibility: false,
      selectedData: undefined,
      company: [],
      status: "",
      id: 0,
    };
  }

  componentDidMount() {
    this.getBranchData();
  }

  getBranchData() {
    BranchHelper.getOutlet()
      .then((data) => {
        this.setState({ company: data });
      })
      .catch((err) => console.log(err));
  }

  render() {
    const { company } = this.state;

    const colDefs = [
      {
        field: "outlet_id",
        headerName: "ID",
        resizable: false,
        maxWidth: 100,
      },
      {
        field: "outlet_name",
        headerName: "Branch",
        resizable: true,
      },
      {
        field: "outlet_nickname",
        headerName: "Nickname",
        resizable: true,
      },
      {
        field: "outlet_id",
        headerName: "Action",
        resizable: false,
        maxWidth: 100,
        filter: false,
        cellRenderer: (props) => {
          return (
            <Flex justifyContent="center" alignItems="center" height={"100%"}>
              <CustomMenu
                items={[
                  {
                    label: "View",
                    onClick: () =>
                      this.props.router.push(
                        `/branch-details/view?id=${props.data.outlet_id}`
                      ),
                  },
                  {
                    label: "Edit",
                    onClick: () =>
                      this.props.router.push(
                        `/branch-details/Edit?id=${props.data.outlet_id}`
                      ),
                  },
                ]}
              />
            </Flex>
          );
        },
      },
    ];

    return (
      <Formik>
        <Form>
          <GlobalWrapper title="Branch Details">
            <CustomContainer
              title="Branch Details"
              filledHeader
              rightSection={
                <Link href="/branch-details/create" passHref>
                  <Button colorScheme="purple" size="sm">Add</Button>
                </Link>
              }
            >
              <AgGrid rowData={company} colDefs={colDefs} />
            </CustomContainer>
          </GlobalWrapper>
        </Form>
      </Formik>
    );
  }
}

export default withRouter(BranchDetail);
