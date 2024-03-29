import React from "react";
import styles from "./header.module.css";
import Head from "../../util/head";
import LogIn from "../../pages/login";
import SideBarMobile from "../sideBarMobile/sideBarMobile";

export default class Header extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            loginVisibility: false,
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
                    icon: "fa fa-product-hunt",
                    link: "/items",
                },
                packing_material_type: {
                    title: "Packing Material Type",
                    icon: "fa fa-pencil",
                    link: "/packing-material-type",
                },
                packing_material_size: {
                    title: "Packing Material Size",
                    icon: "fa fa-pencil",
                    link: "/packing-material-size",
                },
                employee: {
                    title: "Employee Role",
                    icon: "fa fa-users"
                },
                vehicle: {
                    title: "Vehicle Details",
                    link: "/vehicle",
                    icon: "fa fa-users"
                },
                login: {
                    title: "Log In",
                    icon: "fa fa-users"
                },
            },
            token: '',
            user_type: '',
        };
    }

    componentDidMount() {
        const token = localStorage.getItem('Token');
        const user_type = localStorage.getItem('User_type')
        this.setState({user_type: user_type})
        this.setState({ token: token })
    }

    logout() {
        localStorage.clear();
        window.location = '/';
    }
    render() {
        const { settings, loginVisibility, token, user_type } = this.state;
        return (
            <div className={styles.container}>
                {/* {loginVisibility && (
                    <LogIn
                        visibility={loginVisibility}
                        setVisibility={(v) =>
                            this.setState({ loginVisibility: v })
                        }
                    />
                )} */}
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
                            {user_type === "2" ? 
                            <img src="/assets/admin.png" />
                            :
                            <img src={`${global.config.employee_image}`} />
                        }
                        </div>
                        <div className={styles.name}>
                            {user_type === "2" ? 
                            <p>{"Vinodh"}</p>
                            : 
                            <p>{`${global.config.name}`}</p>
                            }
                            {user_type === "2" ? 
                            <p className={styles.nameSize}>
                                {"Admin"}&nbsp;<i class={`fa fa-angle-down`} aria-hidden="true" />
                            </p>
                            :
                            <p className={styles.nameSize}>
                                {`${global.config.designation}`}&nbsp;<i class={`fa fa-angle-down`} aria-hidden="true" />
                            </p>
                            }
                        </div>
                        <div class="dropdown-content" style={{ right: 0 }}>
                            {Object.keys(settings).map((key) => (
                                <div>
                                    {settings[key].title !== "Log In" ? (
                                        <a href={settings[key].link}>
                                            <i className={`${settings[key].icon} ${styles.icon}`} aria-hidden="true" />
                                            {settings[key].title}
                                        </a>
                                    ) : (
                                        <div>
                                            {token !== null ? (
                                                <a onClick={() => this.logout()}>
                                                    <i className={`fa fa-users ${styles.icon}`} aria-hidden="true" />
                                                    Log Out
                                                </a>

                                            ) : (
                                                <a onClick={() => this.setState({ loginVisibility: true })}>
                                                    <i className={`fa fa-users ${styles.icon}`} aria-hidden="true" />
                                                    Log In
                                                </a>
                                            )}
                                        </div>
                                    )}

                                </div>
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