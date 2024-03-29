import React from "react";
import Link from "next/link";

import styles from "./sideBarMobile.module.css";

import Head from "../../util/head";
import MENU_LIST from "../../constants/menus";

export default class SideBarMobile extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showTitle: false,
            subOptions: "",
            menu: MENU_LIST,
        };
    }

    handleMenuClick = (key) => {
        const { menu } = this.state;
        menu[key].selected = true;
        this.setState({ menu: menu });
    };

    render() {
        const { showTitle, menu } = this.state;
        return (
            <div
                className={styles.container}
                onMouseEnter={() => this.setState({ showTitle: true })}
                onMouseLeave={() => this.setState({ showTitle: false })}
            >
                <Head />

                <div className={styles.sideBarOptions}>
                    {Object.keys(menu).map((key) => (
                        <div
                            style={showTitle ? { width: "100%" } : {}}
                            className={styles.menuWrapper}
                        >
                            <Link
                                href={
                                    menu[key].location == undefined
                                        ? ""
                                        : menu[key].location
                                }
                            >
                                <div
                                    className={styles.optionHolder}
                                    onClick={() => this.handleMenuClick(key)}
                                >
                                    <i
                                        className={`${menu[key].openPage
                                                ? styles["icons-selected"]
                                                : "fa fa-bars"
                                            }`}
                                        aria-hidden="true"
                                    ></i>
                                    {showTitle && (
                                        <span>{menu[key].title}</span>
                                    )}
                                </div>
                            </Link>
                            {showTitle &&
                                menu[key].selected &&
                                menu[key].subMenu != undefined &&
                                Object.keys(menu[key].subMenu).length > 0 && (
                                    <div className={styles.subMenuWrapper}>
                                        {Object.keys(menu[key].subMenu).map(
                                            (sKey) => (
                                                <Link
                                                    href={
                                                        menu[key].subMenu[sKey]
                                                            .location ==
                                                            undefined
                                                            ? ""
                                                            : menu[key].subMenu[
                                                                sKey
                                                            ].location
                                                    }
                                                >
                                                    <p>
                                                        {
                                                            menu[key].subMenu[
                                                                sKey
                                                            ].title
                                                        }
                                                    </p>
                                                </Link>
                                            )
                                        )}
                                    </div>
                                )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}
