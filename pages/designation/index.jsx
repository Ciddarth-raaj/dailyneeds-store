import React, { useState, useEffect } from "react";
import DesignationHelper from "../../helper/designation";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";

function DesignationView() {
  const [designations, setDesignations] = useState([]);

  function getDesignationData() {
    DesignationHelper.getDesignation()
      .then((data) => {
        setDesignations(data);
      })
      .catch((err) => console.log(err));
  }

  useEffect(() => {
    getDesignationData();
  }, []);

  const colDefs = [
    {
      field: "designation_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "designation_name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "status",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (props) =>
        props.data.status === 1
          ? { label: "Active", colorScheme: "green" }
          : { label: "Inactive", colorScheme: "red" },
    },
    {
      field: "designation_id",
      headerName: "Action",
      type: "action-icons",
      valueGetter: (props) => {
        return [
          {
            label: "View",
            iconType: "view",
            redirectionUrl: `/designation/${props.data.designation_id}`,
          },
        ];
      },
    },
  ];

  return (
    <GlobalWrapper title="Designation Details">
      <CustomContainer title="Designations" filledHeader>
        <AgGrid rowData={designations} colDefs={colDefs} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DesignationView;
