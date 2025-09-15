import React from "react";

import styles from "./globalWrapper.module.css";

import SideBar from "../sideBar/sideBar";
import Header from "../header/header";
import Head from "../../util/head";

export default class GlobalWrapper extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { children, title } = this.props;
    return (
      <>
      <Head title={title} />
      <div className={styles.mainContainer}>
        <SideBar />
        <Header />
        <div className={styles.childContainer}>{children}</div>
      </div>
      </>
    );
  }
}
