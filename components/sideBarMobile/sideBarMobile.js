import React from "react";
import Link from "next/link";

import styles from "./sideBarMobile.module.css";

import Head from "../../util/head";
import MENU_LIST from "../../constants/menus";
import DesignationHelper from "../../helper/designation";

export default class SideBarMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showTitle: false,
      subOptions: "",
      menu: MENU_LIST,
      filteredData: [],
    };
  }

  componentDidMount() {
    this.getPermissions();
  }

  getPermissions = () => {
    DesignationHelper.getPermissionById()
      .then((data) => {
        try {
          if (!data || data.code === 403) return;
          this.setState({ filteredData: data });
          global.config.permissions = data;
        } catch (error) {
          console.error("Error processing permissions:", error);
        }
      })
      .catch((err) => console.log(err));
  };

  handleMenuClick = (key) => {
    const { menu } = this.state;
    menu[key].selected = true;
    this.setState({ menu: menu });
  };

  render() {
    const { showTitle, menu, filteredData } = this.state;
    return (
      <div
        className={styles.container}
        onMouseEnter={() => this.setState({ showTitle: true })}
        onMouseLeave={() => this.setState({ showTitle: false })}
      >
        <div className={styles.sideBarOptions}>
          {Object.keys(menu).map((key) => {
            const subMenu = menu[key].subMenu || {};
            const hasPermission = (permission) =>
              filteredData?.find(
                (item) => item.permission_key == permission
              ) !== undefined;
            const permittedSubKeys = Object.keys(subMenu).filter((sKey) => {
              const item = subMenu[sKey];
              if (item.subMenu) {
                return Object.keys(item.subMenu).some((ssKey) =>
                  hasPermission(item.subMenu[ssKey].permission)
                );
              }
              return hasPermission(item.permission);
            });

            const isDirectMenu = Boolean(menu[key].isDirect);
            const hasDirectPermission =
              !menu[key].permission ||
              filteredData?.some(
                (item) => item.permission_key == menu[key].permission
              );

            if (
              (!isDirectMenu && permittedSubKeys.length === 0) ||
              (isDirectMenu && !hasDirectPermission)
            ) {
              return null;
            }

            return (
              <div
                key={key}
                style={showTitle ? { width: "100%" } : {}}
                className={styles.menuWrapper}
              >
                <Link
                  href={
                    menu[key].location == undefined ? "" : menu[key].location
                  }
                  passHref
                >
                  <div
                    className={styles.optionHolder}
                    onClick={() => {
                      if (!isDirectMenu) {
                        this.handleMenuClick(key);
                      }
                    }}
                  >
                    <i
                      className={`${
                        menu[key].openPage
                          ? styles["icons-selected"]
                          : "fa fa-bars"
                      }`}
                      aria-hidden="true"
                    ></i>
                    {showTitle && <span>{menu[key].title}</span>}
                  </div>
                </Link>
                {showTitle &&
                  menu[key].selected &&
                  menu[key].subMenu != undefined &&
                  permittedSubKeys.length > 0 && (
                    <div className={styles.subMenuWrapper}>
                      {permittedSubKeys.map((sKey) => {
                        const item = menu[key].subMenu[sKey];
                        if (item.subMenu) {
                          const permittedNested = Object.keys(
                            item.subMenu
                          ).filter((ssKey) =>
                            hasPermission(item.subMenu[ssKey].permission)
                          );
                          if (permittedNested.length === 0) return null;
                          return (
                            <div
                              key={sKey}
                              className={styles.subMenuGroup}
                            >
                              <p className={styles.subMenuGroupTitle}>
                                {item.title}
                              </p>
                              <div className={styles.nestedSubMenuWrapper}>
                                {permittedNested.map((ssKey) => {
                                  const nested = item.subMenu[ssKey];
                                  return (
                                    <Link
                                      key={ssKey}
                                      href={
                                        nested.location == null
                                          ? ""
                                          : nested.location
                                      }
                                      passHref
                                    >
                                      <p>{nested.title}</p>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <Link
                            key={sKey}
                            href={
                              item.location == null ? "" : item.location
                            }
                            passHref
                          >
                            <p>{item.title}</p>
                          </Link>
                        );
                      })}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
