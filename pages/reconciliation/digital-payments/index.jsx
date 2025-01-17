import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import Link from "next/link";

function DigitalPayments() {
  return (
    <GlobalWrapper>
      <CustomContainer
        title="Digital Payments"
        filledHeader
        rightSection={
          <Link href={`/reconciliation/digital-payments/create`} passHref>
            <Button colorScheme="whiteAlpha">Add</Button>
          </Link>
        }
      ></CustomContainer>
    </GlobalWrapper>
  );
}

export default DigitalPayments;
