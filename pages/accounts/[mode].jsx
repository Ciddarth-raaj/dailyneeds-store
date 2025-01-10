import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import NormalOutletForm from "../../components/accounts/NormalOutletForm";
function Create() {
  return (
    <GlobalWrapper title="Add Account Sheet">
      <Head />

      <NormalOutletForm />
    </GlobalWrapper>
  );
}

export default Create;
