import React from "react";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";
import CustomContainer from "../components/CustomContainer";

function Index() {
  return (
    <GlobalWrapper>
      <CustomContainer
        style={{
          backgroundColor: "var(--chakra-colors-purple-500)",
          color: "white",
          fontWeight: "bold",
        }}
      >
        <p>Welcome to DNDS</p>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Index;
