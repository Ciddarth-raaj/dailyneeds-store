import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import NormalOutletForm from "../../components/accounts/NormalOutletForm";
import { useUser } from "../../contexts/UserContext";
import WarehouseForm from "../../components/accounts/WarehouseForm";
import { WAREHHOUSE_ID } from "../../constants";

function Create() {
  const { storeId } = useUser().userConfig;

  return (
    <GlobalWrapper title="Add Account Sheet">
      <Head />

      {storeId == WAREHHOUSE_ID ? <WarehouseForm /> : <NormalOutletForm />}
    </GlobalWrapper>
  );
}

export default Create;
