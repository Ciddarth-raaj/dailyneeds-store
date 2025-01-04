import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";

function index() {
  return (
    <GlobalWrapper title="Master List">
      <Head />

      <CustomContainer title="Master List">
        <p>test</p>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default index;
