import GlobalWrapper from "../components/globalWrapper/globalWrapper";
import { Box, Flex, Heading, Text, Button, Icon } from "@chakra-ui/react";
import { useRouter } from "next/router";

function Error({ statusCode }) {
  const router = useRouter();

  const getErrorMessage = () => {
    switch (statusCode) {
      case 404:
        return "The page you're looking for doesn't exist.";
      case 500:
        return "Something went wrong on our end. Please try again later.";
      case 403:
        return "You don't have permission to access this page.";
      default:
        return statusCode
          ? `An error ${statusCode} occurred on the server.`
          : "An unexpected error occurred.";
    }
  };

  const getErrorTitle = () => {
    switch (statusCode) {
      case 404:
        return "Page Not Found";
      case 500:
        return "Server Error";
      case 403:
        return "Access Denied";
      default:
        return statusCode ? `Error ${statusCode}` : "Something Went Wrong";
    }
  };

  return (
    <GlobalWrapper title={getErrorTitle()}>
      <Flex
        minH="70vh"
        direction="column"
        align="center"
        justify="center"
        px={4}
      >
        <Box textAlign="center" maxW="md">
          <Text
            fontSize="8xl"
            fontWeight="bold"
            color="purple.200"
            lineHeight="1"
            mb={2}
          >
            {statusCode || "!"}
          </Text>
          <Heading as="h1" size="xl" color="gray.700" mb={3}>
            {getErrorTitle()}
          </Heading>
          <Text color="gray.500" fontSize="md" mb={8}>
            {getErrorMessage()}
          </Text>
          <Flex gap={3} justify="center" flexWrap="wrap">
            <Button
              colorScheme="purple"
              onClick={() => router.push("/")}
              size="md"
            >
              Go to Home
            </Button>
            <Button
              variant="outline"
              colorScheme="purple"
              onClick={() => router.back()}
              size="md"
            >
              Go Back
            </Button>
          </Flex>
        </Box>
      </Flex>
    </GlobalWrapper>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
