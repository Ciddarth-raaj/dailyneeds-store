import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Head from "../../util/head";
import Link from "next/link";
import { Button } from "@chakra-ui/button";
import usePermissions from "../../customHooks/usePermissions";

function Index() {
  usePermissions();
  return (
    <GlobalWrapper title="Account Sheet">
      <Head />
      <CustomContainer
        title="Account Sheet"
        rightSection={
          usePermissions(["add_account_sheet"]) ? (
            <Link href="/accounts/create" passHref>
              <Button colorScheme="purple">Add</Button>
            </Link>
          ) : null
        }
      ></CustomContainer>
    </GlobalWrapper>
  );
}

export default Index;
