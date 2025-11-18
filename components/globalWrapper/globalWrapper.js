import React from "react";

import styles from "./globalWrapper.module.css";

import SideBar from "../sideBar/sideBar";
import Header from "../header/header";
import Head from "../../util/head";
import usePermissions from "../../customHooks/usePermissions";
import { Flex } from "@chakra-ui/react";
import EmptyData from "../EmptyData";

export default function GlobalWrapper({ children, title, permissionKey = [] }) {
  const canViewPage = usePermissions(permissionKey);

  return (
    <>
      <Head title={title} />
      <div className={styles.mainContainer}>
        <SideBar />
        <Header />
        {canViewPage ? (
          <div className={styles.childContainer}>{children}</div>
        ) : (
          <Flex w="100%" h="100vh" justifyContent="center" alignItems="center">
            <EmptyData
              message="You do not have permission to view this page"
              faIcon="fa-lock"
            />
          </Flex>
        )}
      </div>
    </>
  );
}
