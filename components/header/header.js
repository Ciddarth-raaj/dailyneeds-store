import React from "react";
import styles from "./header.module.css";
import Head from "../../util/head";
import LogIn from "../../pages/login";
import SideBarMobile from "../sideBarMobile/sideBarMobile";
import { useUser } from "../../contexts/UserContext";

export default function Header() {
  const [settings] = React.useState({
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
      icon: "fa fa-commenting-o",
    },
    email: {
      title: "Email Config",
      icon: "fa fa-envelope-o",
    },
    push: {
      title: "Push Notifications",
      icon: "fa fa-bell-o",
    },
    cash: {
      title: "Cash Denomination",
      icon: "fa fa-money",
    },
    letter: {
      title: "Letter Template",
      icon: "fa fa-file-text-o",
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
      icon: "fa fa-users",
    },
    vehicle: {
      title: "Vehicle Details",
      link: "/vehicle",
      icon: "fa fa-users",
    },
    login: {
      title: "Log In",
      icon: "fa fa-users",
    },
  });

  const [token, setToken] = React.useState(null);
  const [loginVisibility, setLoginVisibility] = React.useState(false);
  const { userType } = useUser().userConfig;

  React.useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    setToken(storedToken);
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location = "/";
  };

  return (
    <div className={styles.container}>
      <SideBarMobile />
      <Head />
      <div className={styles.navigationBar}>
        <div className={styles.wrapper}>
          <div className={styles.image}>
            {userType === "2" ? (
              <img src="/assets/admin.png" alt="Admin" />
            ) : (
              <img
                src={`${global.config.employee_image}`}
                alt={global.config.name}
              />
            )}
          </div>
          <div className={styles.name}>
            <p>{userType === "2" ? "Vinodh" : global.config.name}</p>
            <p className={styles.nameSize}>
              {userType === "2" ? "Admin" : global.config.designation}
              <i className="fa fa-angle-down" aria-hidden="true" />
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
                    {token ? (
                      <a onClick={logout} className={styles.menuItem}>
                        <i className="fa fa-sign-out" aria-hidden="true" />
                        Log Out
                      </a>
                    ) : (
                      <a
                        onClick={() => setLoginVisibility(true)}
                        className={styles.menuItem}
                      >
                        <i className="fa fa-sign-in" aria-hidden="true" />
                        Log In
                      </a>
                    )}
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
