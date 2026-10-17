//External Dependencies
import React from "react";
import { Container, Button, Text, Alert, AlertIcon } from "@chakra-ui/react";
import { withRouter } from "next/router";
import Link from "next/link";
import moment from "moment";

//Style
import styles from "../../styles/create.module.css";

//Internal Dependencies
import ResignationHelper from "../../helper/resignation";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";

/**
 * A HISTORICAL RESIGNATION RECORD - READ ONLY.
 *
 * Exits are recorded with Resign, and returns with Rejoin, in Employee
 * Master; Rejoin applies the rehire assessment. The legacy create / edit /
 * delete are refused by the server (410), so this page only shows a record.
 * `/resignation/create` has nothing to create and points to Employee Master.
 */
class ResignationRecord extends React.Component {
  constructor(props) {
    super(props);
    this.state = { record: null, loading: false };
  }

  componentDidMount() {
    this.fetchRecord();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.router.query.id !== this.props.router.query.id) {
      this.fetchRecord();
    }
  }

  fetchRecord() {
    const recordId = this.props.router.query.id;
    if (!recordId || recordId === "create") {
      this.setState({ record: null });
      return;
    }
    this.setState({ loading: true });
    ResignationHelper.getResignationById(recordId)
      .then((data) => this.setState({ record: (Array.isArray(data) && data[0]) || null }))
      .catch((err) => console.log(err))
      .finally(() => this.setState({ loading: false }));
  }

  render() {
    const { record, loading } = this.state;
    const isCreate = this.props.router.query.id === "create";
    const row = (label, value) => (
      <div className={styles.inputHolder} key={label}>
        <Text fontSize="sm" color="gray.500">{label}</Text>
        <Text>{value || "—"}</Text>
      </div>
    );
    return (
      <GlobalWrapper title="Resignation">
        <Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
          <p>Resignation record</p>
          <Alert status="info" mb={4}>
            <AlertIcon />
            Resignation records are read-only. Record an exit with Resign, and a return with Rejoin, in Employee Master.
          </Alert>
          {isCreate || (!loading && !record) ? null : (
            <div className={styles.wrapper}>
              {record
                ? [
                    row("Employee Name", record.employee_name),
                    row("Reason Type", record.reason_type),
                    row(
                      "Resignation Date",
                      record.resignation_date ? moment(record.resignation_date).format("DD/MM/YYYY") : null
                    ),
                    row("Reason", record.reason),
                  ]
                : null}
            </div>
          )}
          <Link href="/resignation">
            <Button mt={6}>Back</Button>
          </Link>
        </Container>
      </GlobalWrapper>
    );
  }
}

export default withRouter(ResignationRecord);
