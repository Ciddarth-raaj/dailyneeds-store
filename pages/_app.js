import "../styles/globals.css";
import "react-dropzone-uploader/dist/styles.css";
import "react-toastify/dist/ReactToastify.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/zoom.css";
import "react-datetime/css/react-datetime.css";

import "../constants/variables";
import React from "react";
import { ToastContainer } from "react-toastify";
import { ChakraProvider } from "@chakra-ui/react";
import router from "next/router";
import axiosInstance from "../util/api";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "../contexts/UserContext";
import theme from "../theme";

import {
  AllCommunityModule,
  ModuleRegistry,
  TextEditorModule,
} from "ag-grid-community";

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule, TextEditorModule]);

const unprotectedPath = {
  //   '/employee': true,
  //   '/department': true,
  //   '/designation': true,
  //   '/shift': true,
  //   '/family': true,
  //   '/document': true,
  //   '/without-adhaar': true,
  //   '/bank': true,
  //   '/salary': true,
  //   '/resignation': true,
  //   '/products': true,
  //   '/categories': true,
  //   '/subcategories': true,
  //   '/brands': true,
  //   '/product-department': true,
  //   '/indent': true,
  //   '/indent/sentIndent': true,
  //   '/indent/received': true,
  //   '/addissue': true,
  //   '/indent/despatch': true,
  //   '/indent/acceptIndent': true,
  //   '/indent/issueReceived': true,
  //   '/indent/issueSent': true,
  //   '/open-issue': true,
  //   '/serviceprovider-list': true
  "/": true,
};

class MyApp extends React.Component {
  constructor(props) {
    super(props);
    this.initUser();
  }

  initUser() {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem("Token");
      const designation_id = localStorage.getItem("Designation_id");
      const store_id = localStorage.getItem("Store_id");
      const user_type = localStorage.getItem("User_type");
      console.log("Location: ", router.pathname);

      if (
        unprotectedPath[router.pathname] == undefined &&
        (token == undefined || token == null) &&
        window.location.pathname !== "/login"
      ) {
        window.location = "/";
      }

      if (
        token !== undefined ||
        designation_id !== null ||
        store_id !== undefined ||
        user_type == null
      ) {
        axiosInstance.defaults.headers.common["x-access-token"] = token;

        global.config.Token = token;
        global.config.designation_id = designation_id;
        global.config.store_id = store_id;
        global.config.user_type = user_type;
      }
    } catch (err) {
      console.log(err);
    }
  }

  render() {
    const { Component, pageProps } = this.props;
    return (
      <ChakraProvider theme={theme}>
        <UserProvider>
          <Toaster />
          <ToastContainer />
          <Component {...pageProps} />
        </UserProvider>
      </ChakraProvider>
    );
  }
}

export default MyApp;
