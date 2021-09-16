import React from "react";
import styles from "./header.module.css"
import Head from "../../util/head";
import SideBarMobile from "../sideBarMobile/sideBarMobile";

export default class Header extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            settings: {
                company: {
                    title: "Company Details",
                    icon: "fa fa-building-o",
                    link: "/company-details",
                },
                branch: {
                    title: "Branch Details",
                    icon: "fa fa-sitemap",
                    link: "/branch-details",
                },
                sms: {
                    title: "SMS Config",
                    icon: "fa fa-commenting-o"
                },
                email: {
                    title: "Email Config",
                    icon: "fa fa-envelope-o"
                },
                push: {
                    title: "Push Notifications",
                    icon: "fa fa-bell-o"
                },
                cash: {
                    title: "Cash Denomination",
                    icon: "fa fa-money"
                },
                letter: {
                    title: "Letter Template",
                    icon: "fa fa-file-text-o"
                },
                product: {
                    title: "Product Master",
                    icon: "fa fa-product-hunt"
                },
                employee: {
                    title: "Employee Role",
                    icon: "fa fa-users"
                },
            }
        };
    }
    
    render() {
        const { settings } = this.state;
        return (
            <div className={styles.container}>
                <SideBarMobile />
                <Head />
                {/* <div className={styles.buttonHolder}>
                    <a className={styles.buttonBonus}><img src="/assets/stack.png" className={styles.icon} />Bonus Ui</a>
                    <a className={styles.buttonLevel}><i className={`fas fa-box`} aria-hidden="true"></i>Level Menu</a>
                </div> */}
                <div className={styles.navigationBar}>
                    {/* <i className={`fa fa-search ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-bell-o ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-star ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-moon-o ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-shopping-cart ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-expand ${styles.icon}`} aria-hidden="true"></i> */}
                    <div className={`dropdown ${styles.wrapper}`}>
                        <div className={styles.image}>
                            <img src="/assets/admin.png" />
                        </div>
                        <div className={styles.name}>
                            <p>{"Emma"}</p>
                            <p className={styles.nameSize}>
                                {"Admin"}&nbsp;<i class={`fa fa-angle-down`} aria-hidden="true" />
                            </p>
                        </div>
                        <div class="dropdown-content" style={{right: 0}}>
                            {Object.keys(settings).map((key) => (
                                <a href={settings[key].link}>
                                    <i className={`${settings[key].icon} ${styles.icon}`} aria-hidden="true" />
                                    {settings[key].title}
                                </a>
                            ))}
                            {/* <a href="">
                                <i class={`fa fa-user-o ${styles.icon}`} aria-hidden="true" />
                                {"Account"}
                            </a>
                            <a href="">
                                <i class={`fa fa-envelope-o ${styles.icon}`} aria-hidden="true" />
                                {"Inbox"}
                            </a>
                            <a href="">
                                <i class={`fa fa-file-text-o ${styles.icon}`} aria-hidden="true" />
                                {"Taskboard"}
                            </a>
                            <a href="">
                                <img className={` ${styles.icon}`} src="/assets/logout.png" />
                                {/* <i class={`fa fa-sign-out ${styles.icon}`} aria-hidden="true" /> 
                                {"Log Out"}
                            </a> */}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}