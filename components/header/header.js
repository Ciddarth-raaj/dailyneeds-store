/* eslint-disable @next/next/no-img-element */
import React, { useEffect } from "react";
import styles from "./header.module.css";
import Head from "../../util/head";
import LogIn from "../../pages/login";
import SideBarMobile from "../sideBarMobile/sideBarMobile";
import { useUser } from "../../contexts/UserContext";
import EmployeeHelper from "../../helper/employee";

export default function Header() {
  const [settings] = React.useState({
    company: {
      title: "Company Details",
      icon: "fa-regular fa-building",
      link: "/company-details",
    },
    branch: {
      title: "Branch Details",
      icon: "fa-solid fa-sitemap",
      link: "/branch-details",
    },
    sms: {
      title: "SMS Config",
      icon: "fa-regular fa-comment",
    },
    email: {
      title: "Email Config",
      icon: "fa-regular fa-envelope",
    },
    push: {
      title: "Push Notifications",
      icon: "fa-regular fa-bell",
    },
    cash: {
      title: "Cash Denomination",
      icon: "fa-solid fa-money-bill",
    },
    letter: {
      title: "Letter Template",
      icon: "fa-regular fa-file-lines",
    },
    product: {
      title: "Product Master",
      icon: "fa-solid fa-box",
      link: "/items",
    },
    packing_material_type: {
      title: "Packing Material Type",
      icon: "fa-solid fa-pen",
      link: "/packing-material-type",
    },
    packing_material_size: {
      title: "Packing Material Size",
      icon: "fa-solid fa-pen",
      link: "/packing-material-size",
    },
    employee: {
      title: "Employee Role",
      icon: "fa-solid fa-users",
    },
    vehicle: {
      title: "Vehicle Details",
      link: "/vehicle",
      icon: "fa-solid fa-truck",
    },
    login: {
      title: "Log In",
      icon: "fa-solid fa-users",
    },
  });

  const [token, setToken] = React.useState(null);
  const [loginVisibility, setLoginVisibility] = React.useState(false);
  const { userConfig } = useUser();
  const { userType, fetched } = userConfig;
  const { employee_name, designation_name } = fetched ?? {};

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    setToken(storedToken);
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location = "/";
  };

  const firstLetter = (name) => {
    return employee_name?.charAt(0) ?? "?";
  };

  return (
    <div className={styles.container}>
      <SideBarMobile />
      <Head />
      <div className={styles.navigationBar}>
        <div className={styles.wrapper}>
          <div className={styles.avatarWrapper}>{firstLetter()}</div>
          <div className={styles.name}>
            <p>{userType === "2" ? "Vinodh" : employee_name}</p>
            <p className={styles.nameSize}>
              {userType === "2" ? "Admin" : designation_name}
              <i className="fa-solid fa-angle-down" aria-hidden="true" />
            </p>
          </div>
          <div className={styles.dropdownContent}>
            {Object.keys(settings).map((key) => (
              <React.Fragment key={key}>
                {settings[key].title !== "Log In" ? (
                  <a href={settings[key].link} className={styles.menuItem}>
                    <i className={settings[key].icon} aria-hidden="true" />
                    {settings[key].title}
                  </a>
                ) : (
                  <>
                    <div className={styles.divider} />
                    <a onClick={logout} className={styles.menuItem}>
                      <i
                        className="fa-solid fa-right-from-bracket"
                        aria-hidden="true"
                      />
                      Log Out
                    </a>
                  </>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
