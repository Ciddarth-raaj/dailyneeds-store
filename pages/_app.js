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

import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import router from "next/router";
import axiosInstance from "../util/api";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "../contexts/UserContext";

const Container = {
  baseStyle: {
    maxWidth: "unset",
  },
};

// Add fonts configuration
const fonts = {
  heading: `"Poppins", serif`,
  body: `"Poppins", serif`,
};

const activeLabelStyles = {
  transform: "scale(0.85) translateY(-24px)",
  color: "purple.500",
};

const theme = extendTheme({
  components: {
    Container,
    Form: {
      variants: {
        floating: {
          container: {
            _focusWithin: {
              label: {
                ...activeLabelStyles,
              },
              "input, textarea": {
                color: "gray.900",
              },
            },
            "input:not(:placeholder-shown) ~ label, textarea:not(:placeholder-shown) ~ label":
              {
                ...activeLabelStyles,
              },
            "input:not(:placeholder-shown), textarea:not(:placeholder-shown)": {
              color: "gray.900",
            },
            "input, textarea": {
              color: "gray.400",
            },
            label: {
              top: "0",
              left: "0",
              zIndex: 2,
              position: "absolute",
              backgroundColor: "white",
              pointerEvents: "none",
              mx: 3,
              px: 1,
              my: 2,
              transformOrigin: "left top",
              transition: "all 0.2s ease-out",
              color: "gray.500",
            },
          },
        },
      },
    },
  },
  fonts,
});
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
    try {
      const token = localStorage.getItem("Token");
      const designation_id = localStorage.getItem("Designation_id");
      const store_id = localStorage.getItem("Store_id");
      const user_type = localStorage.getItem("User_type");
      console.log("Location: ", router.pathname);

      if (
        unprotectedPath[router.pathname] == undefined &&
        (token == undefined || token == null)
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
