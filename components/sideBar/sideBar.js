import React from "react";
import styles from "./sideBar.module.css"
import Head from "../../util/head";

export default class SideBar extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }
    
    render() {
        const {} = this.state;
        return (
            <div className={styles.container}>
                <Head />
                <img src="/assets/logo-icon.png" className={styles.logo} />

                <div className={styles.sideBarOptions}>
                <i className={`fa fa-home ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-television ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-cube ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-briefcase ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-users ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-shopping-bag ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-comment ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-envelope ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-file ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-desktop ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-check-square-o ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-bolt ${styles.icons}`} aria-hidden="true"></i>
                <i className={`fa fa-list ${styles.icons}`} aria-hidden="true"></i>
                </div>
            </div>
        )
    }
}