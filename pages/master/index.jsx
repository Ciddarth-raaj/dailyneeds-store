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
import { useConfirmation } from "../../hooks/useConfirmation";
import toast from "react-hot-toast";
import { deletePerson } from "../../helper/people";

const HEADINGS = {
  person_id: "ID",
  name: "Name",
  primary_phone: "Primary Contact",
  type: "Type",
  actions: "Actions",
};

function Master() {
  const { peopleList, refetch } = usePeople();
  const { confirm } = useConfirmation();

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
        <MenuItem onClick={() => handleDelete(item.person_id)}>Delete</MenuItem>
      </Menu>
    ),
  }));

  const handleDelete = async (id) => {
    const shouldDelete = await confirm(
      "Are you sure? You can't undo this action afterwards.",
      {
        title: "Delete Account",
        type: "error",
        confirmText: "Delete",
      }
    );

    if (shouldDelete) {
      toast.promise(deletePerson(id), {
        loading: "Deleting person",
        success: (response) => {
          if (response.code === 200) {
            refetch();
            return "Person deleted successfully";
          } else {
            console.log("CIDD", refetch);
            throw err;
          }
        },
        error: "Failed to delete person",
      });
    }
  };

  return (
    <GlobalWrapper title="Master List">
      <Head />

      <CustomContainer
        title="Master List"
        filledHeader
        rightSection={
          <Link href="/master/create" passHref>
            <Button colorScheme="whiteAlpha">Add</Button>
          </Link>
        }
      >
        <Table
          heading={HEADINGS}
          rows={modifiedPeopleList}
          variant="plain"
          // sortCallback={(key, type) =>
          //     sortCallback(key, type)
          // }
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Master;
