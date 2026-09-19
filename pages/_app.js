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
import { ProductsProvider } from "../contexts/ProductsContext";
import ModuleTableThemeBridge from "../components/ModuleTableThemeBridge";
import StockHoldingBackgroundLoadToast from "../components/stock-holding-dashboard/StockHoldingBackgroundLoadToast";
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
  // Stage 0A: redeeming a setup/reset link happens before there is a session.
  "/setup-password": true,
  // The Telegram Attendance Mini App - see STANDALONE_PATHS below.
  "/telegram/attendance": true,
};

/**
 * ============================ PAGES THAT GET NO DNDS APPLICATION SHELL =====
 *
 * A page listed here renders inside ChakraProvider and NOTHING ELSE.
 *
 * WHY THIS EXISTS. The ordinary shell is not passive. `UserProvider` calls
 * `GET /employee/get-details` and `GET /designation/permissions` from a mount
 * effect, unconditionally, through `util/api.js`. With no dnds.co.in session
 * those answer `{ code: 403, msg: "Access Denied" }`, which
 * `util/handle403.js` correctly classifies as a DEAD SESSION and turns into
 * `window.location.href = "/login"`.
 *
 * For the Telegram Attendance Mini App that is fatal, and it is fatal in the
 * worst way - the page itself works perfectly, and the employee never sees
 * it. They tap "Regularise Attendance", Telegram opens the WebView, the shell
 * fires two authenticated calls the employee was never going to be able to
 * make, and the WebView is redirected to a login screen for an account most
 * employees do not have. Keeping the page out of `unprotectedPath` was never
 * enough: that map only governs the constructor's own redirect, not the
 * providers mounted around the page.
 *
 * WHAT IS DELIBERATELY NOT MOUNTED, and why each one would break it:
 *
 *   UserProvider                     the two authenticated calls above
 *   ProductsProvider                 product/category state no Mini App has
 *   ModuleTableThemeBridge           ag-grid theming for tables not rendered
 *   StockHoldingBackgroundLoadToast  polls a stock-holding job
 *   Toaster / ToastContainer         notification surfaces the page does not
 *                                    use; it renders its own inline alerts
 *
 * ANYTHING ADDED TO THE ORDINARY SHELL IS OUTSIDE THIS BRANCH BY DEFAULT,
 * which is the right default: a new provider cannot silently start making
 * authenticated calls on behalf of a page that has no session.
 * `components/telegram/telegramAttendanceScreen.test.js` asserts this branch
 * mounts none of the names above.
 */
const STANDALONE_PATHS = {
  "/telegram/attendance": true,
};

const isStandalone = (pathname) => STANDALONE_PATHS[pathname] === true;

/**
 * The route being rendered.
 *
 * `this.props.router` IS THE SOURCE, not the `next/router` singleton. During
 * `next build`'s static prerender there is no router instance, and touching
 * the singleton's `pathname` there throws "No router instance found" - which
 * fails the build for every statically rendered page, not just this one. Next
 * passes the router to `_app` as a prop precisely so render can read it, and
 * that is what this uses; the singleton stays a client-only fallback.
 */
const pathnameOf = (props) => {
  if (props && props.router && typeof props.router.pathname === "string") {
    return props.router.pathname;
  }
  if (typeof window === "undefined") return null;
  return router && typeof router.pathname === "string" ? router.pathname : null;
};

class MyApp extends React.Component {
  constructor(props) {
    super(props);
    this.initUser();
  }

  /** The current route, from props where Next provides it. */
  get pathname() {
    return pathnameOf(this.props);
  }

  initUser() {
    if (typeof window === "undefined") return;
    // A standalone page has no dnds.co.in session, must not be redirected for
    // lacking one, and must not have one attached to the shared axios
    // instance on its behalf. It authenticates itself.
    if (isStandalone(pathnameOf(this.props))) return;
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

    // THE STANDALONE SHELL. Styling and the page - no provider that talks to
    // an authenticated DNDS endpoint. See STANDALONE_PATHS.
    if (isStandalone(this.pathname)) {
      return (
        <div id="root-portal">
          <ChakraProvider theme={theme}>
            <Component {...pageProps} />
          </ChakraProvider>
        </div>
      );
    }

    return (
      <div id="root-portal">
        <ChakraProvider theme={theme}>
          <UserProvider>
            <ProductsProvider>
              <ModuleTableThemeBridge>
                <Toaster />
                <ToastContainer />
                <StockHoldingBackgroundLoadToast />
                <Component {...pageProps} />
              </ModuleTableThemeBridge>
            </ProductsProvider>
          </UserProvider>
        </ChakraProvider>
      </div>
    );
  }
}

export default MyApp;
