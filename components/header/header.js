/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import styles from "./header.module.css";
import Head from "../../util/head";
import { useUser } from "../../contexts/UserContext";
import { useBreakpointValue } from "@chakra-ui/react";

export default function Header() {
  const [settings] = React.useState({
    // company: {
    //   title: "Company Details",
    //   icon: "fa-regular fa-building",
    //   link: "/company-details",
    // },
    branch: {
      title: "Branch Details",
      icon: "fa-solid fa-sitemap",
      link: "/branch-details",
    },
    // sms: {
    //   title: "SMS Config",
    //   icon: "fa-regular fa-comment",
    // },
    // email: {
    //   title: "Email Config",
    //   icon: "fa-regular fa-envelope",
    // },
    // push: {
    //   title: "Push Notifications",
    //   icon: "fa-regular fa-bell",
    // },
    // cash: {
    //   title: "Cash Denomination",
    //   icon: "fa-solid fa-money-bill",
    // },
    // letter: {
    //   title: "Letter Template",
    //   icon: "fa-regular fa-file-lines",
    // },
    // product: {
    //   title: "Product Master",
    //   icon: "fa-solid fa-box",
    //   link: "/items",
    // },
    // packing_material_type: {
    //   title: "Packing Material Type",
    //   icon: "fa-solid fa-pen",
    //   link: "/packing-material-type",
    // },
    // packing_material_size: {
    //   title: "Packing Material Size",
    //   icon: "fa-solid fa-pen",
    //   link: "/packing-material-size",
    // },
    // employee: {
    //   title: "Employee Role",
    //   icon: "fa-solid fa-users",
    // },
    // vehicle: {
    //   title: "Vehicle Details",
    //   link: "/vehicle",
    //   icon: "fa-solid fa-truck",
    // },
    login: {
      title: "Log In",
      icon: "fa-solid fa-users",
    },
  });

  const [token, setToken] = React.useState(null);
  const [loginVisibility, setLoginVisibility] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { userConfig } = useUser();
  const { userType, fetched } = userConfig;
  const { employee_name, designation_name } = fetched ?? {};

  // Handle click outside to close dropdown on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && isDropdownOpen) {
        const wrapper = event.target.closest(`.${styles.wrapper}`);
        if (!wrapper) {
          setIsDropdownOpen(false);
        }
      }
    };

    if (isMobile) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isMobile, isDropdownOpen]);

  const logout = () => {
    localStorage.clear();
    window.location = "/";
  };

  const firstLetter = (name) => {
    return employee_name?.charAt(0) ?? "?";
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDropdownClose = () => {
    setIsDropdownOpen(false);
  };

  const handleMenuItemClick = (link) => {
    if (link) {
      window.location.href = link;
    }
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isMobile) {
        handleDropdownToggle();
      } else {
        setIsDropdownOpen(!isDropdownOpen);
      }
    } else if (event.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className={styles.container}>
      <img src={"/assets/dnds-logo.png"} alt="logo" className={styles.logo} />
      <div className={styles.navigationBar}>
        <div
          className={`${styles.wrapper} ${isDropdownOpen ? styles.show : ""}`}
          onClick={isMobile ? handleDropdownToggle : undefined}
          onMouseEnter={!isMobile ? () => setIsDropdownOpen(true) : undefined}
          onMouseLeave={!isMobile ? () => setIsDropdownOpen(false) : undefined}
          onBlur={handleDropdownClose}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
          aria-label="User menu"
        >
          <div className={styles.avatarWrapper}>{firstLetter()}</div>
          <div className={styles.name}>
            <p>{userType === "2" ? "Vinodh" : employee_name}</p>
            <p className={styles.nameSize}>
              {userType === "2" ? "Admin" : designation_name}
              <i className="fa-solid fa-angle-down" aria-hidden="true" />
            </p>
          </div>
          <div
            className={`${styles.dropdownContent} ${
              isDropdownOpen ? styles.show : ""
            }`}
            style={{ display: isDropdownOpen ? "block" : "none" }}
          >
            {Object.keys(settings).map((key) => (
              <React.Fragment key={key}>
                {settings[key].title !== "Log In" ? (
                  <a
                    href={settings[key].link}
                    className={styles.menuItem}
                    onClick={() => handleMenuItemClick(settings[key].link)}
                    onTouchStart={() => handleMenuItemClick(settings[key].link)}
                  >
                    <i className={settings[key].icon} aria-hidden="true" />
                    {settings[key].title}
                  </a>
                ) : (
                  <>
                    <div className={styles.divider} />
                    <a
                      onClick={logout}
                      className={styles.menuItem}
                      onTouchStart={logout}
                      role="button"
                      tabIndex={0}
                    >
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
