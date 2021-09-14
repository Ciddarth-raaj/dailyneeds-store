import "../styles/globals.css";
import "react-dropzone-uploader/dist/styles.css";
import "react-toastify/dist/ReactToastify.css"
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { ToastContainer } from "react-toastify";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const Container = {
	baseStyle: {
		maxWidth: "unset",
	},
};

const theme = extendTheme({
	components: {
		Container,
	},
});

function MyApp({ Component, pageProps }) {
	return (
		<ChakraProvider theme={theme}>
			<ToastContainer />
			<Component {...pageProps} />
		</ChakraProvider>
	);
}

export default MyApp;
