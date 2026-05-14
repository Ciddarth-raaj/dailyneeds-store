import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Box, Text, Tooltip, useBreakpointValue } from "@chakra-ui/react";
import styles from "./sideBar.module.css";
import Head from "../../util/head";
import {
  MENU_MODULES,
  DEFAULT_MODULE_ID,
} from "../../constants/menus";
import "../../constants/variables";
import DesignationHelper from "../../helper/designation";

function menuContainsPath(menuTree, path) {
  if (!menuTree) return false;
  for (const key of Object.keys(menuTree)) {
    const item = menuTree[key];
    if (item.location === path) return true;
    if (item.subMenu) {
      for (const sKey of Object.keys(item.subMenu)) {
        const sub = item.subMenu[sKey];
        if (sub.location === path) return true;
        if (sub.subMenu) {
          for (const ssKey of Object.keys(sub.subMenu)) {
            if (sub.subMenu[ssKey].location === path) return true;
          }
        }
      }
    }
  }
  return false;
}

function findModuleIdForPath(asPath) {
  const moduleIds = Object.keys(MENU_MODULES);
  for (let i = 0; i < moduleIds.length; i += 1) {
    const id = moduleIds[i];
    if (menuContainsPath(MENU_MODULES[id].menu, asPath)) return id;
  }
  return null;
}

function buildMenuStateForModule(moduleId) {
  const template = MENU_MODULES[moduleId].menu;
  const initialMenu = {};
  Object.keys(template).forEach((key) => {
    initialMenu[key] = {
      ...template[key],
      selected: false,
      isOpen: false,
    };
    if (template[key].subMenu) {
      initialMenu[key].subMenu = JSON.parse(
        JSON.stringify(template[key].subMenu)
      );
    }
  });
  return initialMenu;
}

export default function Sidebar() {
  const router = useRouter();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [selectedModuleId, setSelectedModuleId] = useState(DEFAULT_MODULE_ID);
  const [menu, setMenu] = useState(() =>
    buildMenuStateForModule(DEFAULT_MODULE_ID)
  );
  const [filteredData, setFilteredData] = useState([]);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarMinimized");
      return saved === "true";
    }
    return false;
  });

  const applyRouteToMenu = useCallback((baseMenu, asPath) => {
    const updatedMenu = { ...baseMenu };

    Object.keys(updatedMenu).forEach((key) => {
      updatedMenu[key] = { ...updatedMenu[key], selected: false };
    });

    Object.keys(updatedMenu).forEach((key) => {
      if (updatedMenu[key].location === asPath) {
        updatedMenu[key].selected = true;
        updatedMenu[key].isOpen = true;
        return;
      }

      if (updatedMenu[key].subMenu) {
        Object.keys(updatedMenu[key].subMenu).forEach((sKey) => {
          const subItem = updatedMenu[key].subMenu[sKey];
          if (subItem.location === asPath) {
            updatedMenu[key].selected = true;
            if (subItem.selected !== undefined) subItem.selected = true;
            updatedMenu[key].isOpen = true;
          }
          if (subItem.subMenu) {
            Object.keys(subItem.subMenu).forEach((ssKey) => {
              if (subItem.subMenu[ssKey].location === asPath) {
                updatedMenu[key].selected = true;
                if (subItem.subMenu[ssKey].selected !== undefined)
                  subItem.subMenu[ssKey].selected = true;
                updatedMenu[key].isOpen = true;
              }
            });
          }
        });
      }
    });

    return updatedMenu;
  }, []);

  useEffect(() => {
    const fromPath = findModuleIdForPath(router.asPath);
    if (fromPath) setSelectedModuleId(fromPath);
  }, [router.asPath]);

  useEffect(() => {
    const base = buildMenuStateForModule(selectedModuleId);
    setMenu(applyRouteToMenu(base, router.asPath));
  }, [selectedModuleId, router.asPath, applyRouteToMenu]);

  useEffect(() => {
    getPermissions();
  }, []);

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

  const handleModuleClick = (moduleId) => {
    if (moduleId === selectedModuleId) return;
    setSelectedModuleId(moduleId);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleMenuClick = (key) => {
    const updatedMenu = { ...menu };

    updatedMenu[key].isOpen = !updatedMenu[key].isOpen;

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

  const toggleMinimize = () => {
    if (isMobile) return;
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    localStorage.setItem("sidebarMinimized", String(newMinimized));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sidebarMinimizeToggle", {
          detail: { minimized: newMinimized },
        })
      );
    }
  };

  const menuAccent =
    MENU_MODULES[selectedModuleId]?.accent ?? "purple";

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
        className={styles.shell}
        data-menu-accent={menuAccent}
        style={{ display: isMobile ? (isOpen ? "flex" : "none") : "flex" }}
      >
        <Box
          className={styles.moduleRail}
          aria-label="Main modules"
        >
          {Object.keys(MENU_MODULES).map((moduleId) => {
            const mod = MENU_MODULES[moduleId];
            const isActive = moduleId === selectedModuleId;
            return (
              <Tooltip
                key={moduleId}
                label={mod.title}
                placement="right"
                hasArrow
                openDelay={200}
                gutter={10}
              >
                <button
                  type="button"
                  aria-label={mod.title}
                  data-accent={mod.accent || "purple"}
                  className={`${styles.moduleRailButton} ${isActive ? styles.moduleRailButtonActive : ""
                    }`}
                  onClick={() => handleModuleClick(moduleId)}
                >
                  <i
                    className={mod.iconClass ?? `fa ${mod.icon}`}
                    aria-hidden="true"
                  />
                </button>
              </Tooltip>
            );
          })}
        </Box>

        <div
          className={`${styles.container} ${!isMobile && isMinimized ? styles.minimized : ""
            }`}
        >
          <Box className={styles.menuScrollArea}>
            <Box className={styles.sideBarOptions}>
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
                <React.Fragment key={key}>
                  {menu[key].aboveLine && (
                    <div className={styles.sectionDivider}></div>
                  )}

                  <Box className={styles.menuWrapper}>
                    <Box
                      as="a"
                      className={`${styles.optionHolder} ${menu[key].selected ? styles.selectedMenu : ""
                        } ${menu[key].isOpen ? styles.openMenu : ""}`}
                      onClick={() => handleMainMenuClick(key, isDirectMenu)}
                    >
                      <Box className={styles.iconWrapper}>
                        <i
                          className={`fa ${menu[key].icon} ${menu[key].selected
                              ? styles["icons-selected"]
                              : styles.iconsUnselected
                            }`}
                        />
                      </Box>
                      <span
                        className={`${styles.menuTitle} ${isMinimized && !isMobile ? styles.hoverTitle : ""
                          }`}
                      >
                        {menu[key].title}
                      </span>
                    </Box>

                    {menu[key].isOpen &&
                      menu[key].subMenu &&
                      permittedSubKeys.length > 0 && (
                        <div
                          className={`${styles.subMenuWrapper} ${isMinimized && !isMobile ? styles.hoverSubMenu : ""
                            }`}
                        >
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
                                  <Text
                                    className={styles.subMenuGroupTitle}
                                    fontSize="xs"
                                    fontWeight="600"
                                    color="gray.600"
                                    mb={1}
                                  >
                                    {item.title}
                                  </Text>
                                  <div
                                    className={styles.nestedSubMenuWrapper}
                                  >
                                    {permittedNested.map((ssKey) => {
                                      const nestedItem =
                                        item.subMenu[ssKey];
                                      const isActive =
                                        router.asPath ===
                                        nestedItem.location;
                                      return (
                                        <Link
                                          key={ssKey}
                                          href={
                                            nestedItem.location || ""
                                          }
                                          passHref
                                        >
                                          <Box
                                            as="a"
                                            className={`${styles.subMenuItem} ${isActive
                                                ? styles.active
                                                : ""
                                              }`}
                                          >
                                            <Text
                                              className={styles.menuText}
                                            >
                                              {nestedItem.title}
                                            </Text>
                                          </Box>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            const isActive =
                              router.asPath === item.location;
                            return (
                              <Link
                                key={sKey}
                                href={item.location || ""}
                                passHref
                              >
                                <Box
                                  as="a"
                                  className={`${styles.subMenuItem} ${isActive ? styles.active : ""
                                    }`}
                                >
                                  <Text className={styles.menuText}>
                                    {item.title}
                                  </Text>
                                </Box>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                  </Box>

                  {menu[key].belowLine && (
                    <div className={styles.sectionDivider}></div>
                  )}
                </React.Fragment>
              );
            })}
            </Box>
          </Box>
          {!isMobile && (
            <Box
              className={styles.minimizeButton}
              onClick={toggleMinimize}
              title={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
            >
              <i
                className={`fa ${isMinimized ? "fa-chevron-right" : "fa-chevron-left"
                  }`}
              />
            </Box>
          )}
        </div>
      </div>
    </>
  );
}
