import { Formik, Form } from "formik";
import {
  Container,
  Flex,
  Switch,
  ButtonGroup,
  Button,
  IconButton,
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

const HEADINGS = {
  outlet_id: "ID",
  outlet_name: "Name",
  outlet_nickname: "Nickname",
  action: "Action",
};

export default class BranchDetail extends React.Component {
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
  updateStatus() {
    const { status, id } = this.state;
    if (status !== "") {
      BranchHelper.updateStatus({
        outlet_id: id,
        is_active: status,
      })
        .then((data) => {
          if (data.code === 200) {
            toast.success("Successfully updated Status");
            this.setState({ status: "" });
          } else {
            toast.error("Not Updated");
          }
        })
        .catch((err) => console.log(err));
    }
  }
  sortCallback = (key, type) => {
    console.log(key, type);
  };
  componentDidUpdate() {
    if (this.state.status !== "") {
      this.updateStatus();
    }
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

  badge = (m) => (
    <Switch
      className={styles.switch}
      id="email-alerts"
      defaultChecked={m.value === 1}
      onChange={() => {
        this.setState({ status: m.value === 1 ? 0 : 1, id: m.id });
      }}
    />
  );

  render() {
    const { company } = this.state;
    const valuesNew = company.map((m) => ({
      outlet_id: m.outlet_id,
      outlet_name: m.outlet_name,
      outlet_nickname: m.outlet_nickname,
      status: this.badge({ value: m.is_active, id: m.outlet_id }),
      action: (
        <Menu
          align="end"
          gap={5}
          menuButton={
            <IconButton
              variant="ghost"
              colorScheme="purple"
              icon={<i className={`fa fa-ellipsis-v`} />}
            />
          }
          transition
        >
          <Link href={`/branch-details/view?id=${m.outlet_id}`} passHref>
            <a target="_blank" rel="noopener noreferrer">
              <MenuItem>View</MenuItem>
            </a>
          </Link>
          <Link href={``} passHref>
            <MenuItem>Edit</MenuItem>
          </Link>
          <MenuItem>Delete</MenuItem>
        </Menu>
      ),
    }));

    const getExportFile = () => {
      const TABLE_HEADER = {
        SNo: "SNo",
        outlet_id: "Id",
        outlet_name: "Name",
        outlet_nickname: "Nickname",
      };
      const formattedData = [];
      valuesNew.forEach((d, i) => {
        formattedData.push({
          SNo: i + 1,
          outlet_id: d.outlet_id,
          outlet_name: d.outlet_name,
          outlet_nickname: d.outlet_nickname,
        });
      });
      exportCSVFile(
        TABLE_HEADER,
        formattedData,
        "branch_details" + moment().format("DD-MMY-YYYY")
      );
    };

    return (
      <Formik>
        <Form>
          <GlobalWrapper title="Branch Details">
            <Head />

            <CustomContainer
              title="Branch Details"
              rightSection={
                <Link href="/branch-details/create" passHref>
                  <Button colorScheme="purple">Add New Branch</Button>
                </Link>
              }
            >
              <div>
                <Table heading={HEADINGS} rows={valuesNew} />
                <ButtonGroup
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button colorScheme="purple" onClick={() => getExportFile()}>
                    {"Export"}
                  </Button>
                </ButtonGroup>
              </div>
            </CustomContainer>
          </GlobalWrapper>
        </Form>
      </Formik>
    );
  }
}
