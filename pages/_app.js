import "../styles/globals.css";
import "react-dropzone-uploader/dist/styles.css";
import "react-toastify/dist/ReactToastify.css"
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../constants/variables";
import React from "react";
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

class MyApp extends React.Component {
	constructor(props) {
		super(props);
		this.initUser();
	}

	initUser() {
		try {
			const designation_id = localStorage.getItem('Designation_id');
			if (designation_id) {
				global.config.designation_id = designation_id;
			}
		} catch (err) {
			console.log(err);
		}
	}

	render() {
		const { Component, pageProps } = this.props;
		return (
			<ChakraProvider theme={theme}>
				<ToastContainer />
				<Component {...pageProps} />
			</ChakraProvider>
		);
	}
}

export default MyApp;
