import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Link from "next/link";
import { Button } from "@chakra-ui/button";

function Materials() {
  return (
    <GlobalWrapper title="Materials">
      <CustomContainer
        title="Materials"
        filledHeader
        rightSection={
          <Link href="/materials/category/create" passHref>
            <Button colorScheme="whiteAlpha">Add</Button>
          </Link>
        }
      >
        <div>Materials</div>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Materials;
