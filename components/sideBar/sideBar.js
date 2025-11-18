import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Box, Text, useBreakpointValue } from "@chakra-ui/react";
import styles from "./sideBar.module.css";
import Head from "../../util/head";
import MENU_LIST from "../../constants/menus";
import "../../constants/variables";
import DesignationHelper from "../../helper/designation";

export default function Sidebar() {
  const [menu, setMenu] = useState(() => {
    const initialMenu = { ...MENU_LIST };
    Object.keys(initialMenu).forEach((key) => {
      initialMenu[key] = {
        ...initialMenu[key],
        selected: false,
        isOpen: false,
      };
    });
    return initialMenu;
  });
  const [filteredData, setFilteredData] = useState([]);
  const router = useRouter();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    getPermissions();
    checkActiveRoute();
  }, [router.asPath]);

  const checkActiveRoute = () => {
    const updatedMenu = { ...menu };

    // Reset all selections first
    Object.keys(updatedMenu).forEach((key) => {
      updatedMenu[key].selected = false;
      // Don't reset isOpen here
    });

    // Check which section should be selected based on current route
    Object.keys(updatedMenu).forEach((key) => {
      // Check main menu route
      if (updatedMenu[key].location === router.asPath) {
        updatedMenu[key].selected = true;
        updatedMenu[key].isOpen = true; // Open the menu if main route matches
        return;
      }

      // Check submenu routes
      if (updatedMenu[key].subMenu) {
        Object.keys(updatedMenu[key].subMenu).forEach((sKey) => {
          if (updatedMenu[key].subMenu[sKey].location === router.asPath) {
            updatedMenu[key].selected = true;
            updatedMenu[key].subMenu[sKey].selected = true;
            updatedMenu[key].isOpen = true; // Open the menu if submenu route matches
          }
        });
      }
    });

    setMenu(updatedMenu);
  };

  const getPermissions = () => {
    DesignationHelper.getPermissionById()
      .then((data) => {
        try {
          if (!data || data.code === 403) return;

          setFilteredData(data);
          global.config.permissions = data;
        } catch (error) {
          console.error("Error processing permissions:", error);
        }
      })
      .catch((err) => console.log(err));
  };

  const handleMenuClick = (key) => {
    const updatedMenu = { ...menu };

    // Toggle isOpen state for clicked menu
    updatedMenu[key].isOpen = !updatedMenu[key].isOpen;

    // Close other menus
    Object.keys(updatedMenu).forEach((k) => {
      if (k !== key) {
        updatedMenu[k].isOpen = false;
      }
    });

    setMenu(updatedMenu);
  };

  const handleMainMenuClick = (key, isDirectMenu) => {
    if (isDirectMenu) {
      const targetLocation = menu[key].location || "/";
      router.push(targetLocation);
      if (isMobile) {
        setIsOpen(false);
      }
      return;
    }

    handleMenuClick(key);
  };
  return (
    <>
      <div
        className={`${styles.menuContainer} ${isOpen ? styles.change : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.bar1}></div>
        <div className={styles.bar2}></div>
        <div className={styles.bar3}></div>
      </div>

      <div
        className={styles.container}
        style={{ display: isMobile ? (isOpen ? "block" : "none") : "block" }}
      >
        <Box className={styles.sideBarOptions}>
          {Object.keys(menu).map((key, index) => {
            // Compute permitted sub menu items for this main menu
            const subMenu = menu[key].subMenu || {};
            const permittedSubKeys = Object.keys(subMenu).filter(
              (sKey) =>
                filteredData?.find(
                  (item) => item.permission_key == subMenu[sKey].permission
                ) !== undefined
            );

            const isDirectMenu = Boolean(menu[key].isDirect);
            const hasDirectPermission =
              !menu[key].permission ||
              filteredData?.some(
                (item) => item.permission_key == menu[key].permission
              );

            // Skip rendering this main menu if no permitted items/permissions
            if (
              (!isDirectMenu && permittedSubKeys.length === 0) ||
              (isDirectMenu && !hasDirectPermission)
            ) {
              return null;
            }

            return (
              <React.Fragment key={key}>
                {/* Render above line divider if this menu item has aboveLine: true */}
                {menu[key].aboveLine && (
                  <div className={styles.sectionDivider}></div>
                )}

                <Box className={styles.menuWrapper}>
                  <Box
                    as="a"
                    className={`${styles.optionHolder} ${
                      menu[key].selected ? styles.selectedMenu : ""
                    } ${menu[key].isOpen ? styles.openMenu : ""}`}
                    onClick={() => handleMainMenuClick(key, isDirectMenu)}
                  >
                    <Box className={styles.iconWrapper}>
                      <i
                        className={`fa ${menu[key].icon} ${
                          menu[key].selected
                            ? styles["icons-selected"]
                            : styles.iconsUnselected
                        }`}
                      />
                    </Box>
                    <span>{menu[key].title}</span>
                  </Box>

                  {menu[key].isOpen &&
                    menu[key].subMenu &&
                    permittedSubKeys.length > 0 && (
                      <div className={styles.subMenuWrapper}>
                        {permittedSubKeys.map((sKey) => {
                          const isActive =
                            router.asPath === menu[key].subMenu[sKey].location;
                          return (
                            <Link
                              key={sKey}
                              href={menu[key].subMenu[sKey].location || ""}
                              passHref
                            >
                              <Box
                                as="a"
                                className={`${styles.subMenuItem} ${
                                  isActive ? styles.active : ""
                                }`}
                              >
                                <Text className={styles.menuText}>
                                  {menu[key].subMenu[sKey].title}
                                </Text>
                              </Box>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                </Box>

                {/* Render below line divider if this menu item has belowLine: true */}
                {menu[key].belowLine && (
                  <div className={styles.sectionDivider}></div>
                )}
              </React.Fragment>
            );
          })}
        </Box>
      </div>
    </>
  );
}
