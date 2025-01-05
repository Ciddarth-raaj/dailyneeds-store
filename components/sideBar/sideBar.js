import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Box, Text } from "@chakra-ui/react";
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

  useEffect(() => {
    getPermissions();
    checkActiveRoute();
  }, [router.pathname]);

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
      if (updatedMenu[key].location === router.pathname) {
        updatedMenu[key].selected = true;
        updatedMenu[key].isOpen = true; // Open the menu if main route matches
        return;
      }

      // Check submenu routes
      if (updatedMenu[key].subMenu) {
        Object.keys(updatedMenu[key].subMenu).forEach((sKey) => {
          if (updatedMenu[key].subMenu[sKey].location === router.pathname) {
            updatedMenu[key].selected = true;
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
          if (!data) return;
          setFilteredData(data);
          global.config.data = data;
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

  return (
    <div className={styles.container}>
      <Head />
      <Box className={styles.sideBarOptions}>
        {Object.keys(menu).map((key) => (
          <Box key={key} className={styles.menuWrapper}>
            <Box
              as="a"
              className={`${styles.optionHolder} ${
                menu[key].selected ? styles.selectedMenu : ""
              } ${menu[key].isOpen ? styles.openMenu : ""}`}
              onClick={() => handleMenuClick(key)}
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
              Object.keys(menu[key].subMenu).length > 0 && (
                <div className={styles.subMenuWrapper}>
                  {Object.keys(menu[key].subMenu).map((sKey) => {
                    if (
                      filteredData.find(
                        (item) =>
                          item.permission_key ==
                          menu[key].subMenu[sKey].permission
                      ) === undefined
                    ) {
                      return null;
                    }

                    const isActive =
                      router.pathname === menu[key].subMenu[sKey].location;
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
        ))}
      </Box>
    </div>
  );
}
