/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import styles from "./header.module.css";
import Head from "../../util/head";
import { useUser } from "../../contexts/UserContext";
import { useBreakpointValue } from "@chakra-ui/react";

/** Menu column widths; rail width comes from `sidebarRailWidth` event (0 or 40). */
const MENU_PANEL_EXPANDED_PX = 260;
const MENU_PANEL_MINIMIZED_PX = 80;
const HEADER_PADDING_LEFT_PX = 94;
const LOGO_CLEARANCE_GAP_PX = 9;

function getLogoMarginLeftPx(isSidebarMinimized, sidebarRailPx) {
  const rail = typeof sidebarRailPx === "number" ? sidebarRailPx : 40;
  const menuPanel = isSidebarMinimized
    ? MENU_PANEL_MINIMIZED_PX
    : MENU_PANEL_EXPANDED_PX;
  const sidebarTotal = rail + menuPanel;
  return sidebarTotal + LOGO_CLEARANCE_GAP_PX - HEADER_PADDING_LEFT_PX;
}

function readDesktopSidebarMinimized() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 767px)").matches) return false;
  return localStorage.getItem("sidebarMinimized") === "true";
}

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
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(
    readDesktopSidebarMinimized
  );
  const [sidebarRailPx, setSidebarRailPx] = useState(40);
  const { userConfig } = useUser();
  const { userType, fetched } = userConfig;
  const { employee_name, designation_name } = fetched ?? {};

  useEffect(() => {
    if (isMobile) return;
    setIsSidebarMinimized(localStorage.getItem("sidebarMinimized") === "true");
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) return undefined;
    const handleSidebarToggle = (event) => {
      setIsSidebarMinimized(Boolean(event.detail?.minimized));
    };
    window.addEventListener("sidebarMinimizeToggle", handleSidebarToggle);
    return () => {
      window.removeEventListener("sidebarMinimizeToggle", handleSidebarToggle);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) return undefined;
    const handleRail = (event) => {
      const v = event?.detail?.railPx;
      setSidebarRailPx(typeof v === "number" ? v : 40);
    };
    window.addEventListener("sidebarRailWidth", handleRail);
    return () => {
      window.removeEventListener("sidebarRailWidth", handleRail);
    };
  }, [isMobile]);

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
    localStorage.removeItem("Token");
    localStorage.removeItem("Designation_id");
    localStorage.removeItem("Store_id");
    localStorage.removeItem("User_type");
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

  const logoStyle =
    isMobile === true
      ? undefined
      : { marginLeft: `${getLogoMarginLeftPx(isSidebarMinimized, sidebarRailPx)}px` };

  return (
    <div className={styles.container}>
      <img
        src={"/assets/dnds-logo.png"}
        alt="logo"
        className={styles.logo}
        style={logoStyle}
        suppressHydrationWarning
      />
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
            className={`${styles.dropdownContent} ${isDropdownOpen ? styles.show : ""
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
