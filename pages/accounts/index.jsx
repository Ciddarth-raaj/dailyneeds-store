import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Head from "../../util/head";
import Link from "next/link";
import { Button } from "@chakra-ui/button";

function index() {
  return (
    <GlobalWrapper title="Account Sheet">
      <Head />
      <CustomContainer
        title="Account Sheet"
        rightSection={
          <Link href="/accounts/create" passHref>
            <Button colorScheme="purple">Add</Button>
          </Link>
        }
      ></CustomContainer>
    </GlobalWrapper>
  );
}

export default index;
