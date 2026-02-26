import React, { useState, useEffect } from "react";

import styles from "./globalWrapper.module.css";

import SideBar from "../sideBar/sideBar";
import Header from "../header/header";
import Head from "../../util/head";
import usePermissions from "../../customHooks/usePermissions";
import { Flex, Spinner, useBreakpointValue } from "@chakra-ui/react";
import EmptyData from "../EmptyData";

export default function GlobalWrapper({ children, title, permissionKey = [], loading = false }) {
  const canViewPage = usePermissions(permissionKey);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(() => {
    if (typeof window !== "undefined" && !window.matchMedia("(max-width: 480px)").matches) {
      const saved = localStorage.getItem("sidebarMinimized");
      return saved === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleSidebarToggle = (event) => {
      if (!isMobile) {
        setIsSidebarMinimized(event.detail.minimized);
      }
    };

    window.addEventListener("sidebarMinimizeToggle", handleSidebarToggle);
    return () => {
      window.removeEventListener("sidebarMinimizeToggle", handleSidebarToggle);
    };
  }, [isMobile]);

  return (
    <>
      <Head title={title} />
      <div className={styles.mainContainer}>
        <SideBar />
        <Header />

        {loading ? (
          <Flex w="100%" h="100vh" justifyContent="center" alignItems="center">
            <Spinner size="xl" color="purple.500" thickness="4px" />
          </Flex>
        ) : (
          <>
            {canViewPage ? (
              <div
                className={styles.childContainer}
                style={{
                  marginLeft: isMobile
                    ? undefined
                    : isSidebarMinimized
                      ? "75px"
                      : "255px",
                }}
              >
                {children}
              </div>
            ) : (
              <Flex w="100%" h="100vh" justifyContent="center" alignItems="center">
                <EmptyData
                  message="You do not have permission to view this page"
                  faIcon="fa-lock"
                />
              </Flex>
            )}</>
        )}
      </div>
    </>
  );
}
