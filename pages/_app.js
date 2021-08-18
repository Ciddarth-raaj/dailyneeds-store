import "../styles/globals.css";
import "react-dropzone-uploader/dist/styles.css";

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
			<Component {...pageProps} />
		</ChakraProvider>
	);
}

export default MyApp;
