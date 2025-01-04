import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import Table from "../../components/table/table";
import usePeople from "../../customHooks/usePeople";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { Button, IconButton } from "@chakra-ui/button";
import Link from "next/link";
import { getPersonType } from "../../constants/values";

const HEADINGS = {
  person_id: "ID",
  name: "Name",
  primary_phone: "Primary Contact",
  type: "Type",
  actions: "Actions",
};

function Master() {
  const { peopleList } = usePeople();

  const modifiedPeopleList = peopleList.map((item) => ({
    ...item,
    type: <p>{getPersonType(item.person_type)}</p>,
    actions: (
      <Menu
        align="end"
        gap={5}
        menuButton={
          <IconButton
            variant="ghost"
            colorScheme="purple"
            icon={<i className={`fa fa-ellipsis-v`} />}
          />
        }
        transition
      >
        <MenuItem>Edit</MenuItem>
        <MenuItem>Delete</MenuItem>
      </Menu>
    ),
  }));

  return (
    <GlobalWrapper title="Master List">
      <Head />

      <CustomContainer
        title="Master List"
        rightSection={
          <Link href="/master/create" passHref>
            <Button colorScheme="purple">Add</Button>
          </Link>
        }
      >
        <Table
          heading={HEADINGS}
          rows={modifiedPeopleList}
          // sortCallback={(key, type) =>
          //     sortCallback(key, type)
          // }
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Master;
