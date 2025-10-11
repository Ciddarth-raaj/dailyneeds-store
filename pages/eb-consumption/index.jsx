import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, IconButton } from "@chakra-ui/button";
import Table from "../../components/table/table";
import useEBConsumptions from "../../customHooks/useEBConsumptions";
import moment from "moment";
import Link from "next/link";
import { Menu, MenuItem } from "@szhsin/react-menu";

const HEADINGS = {
  consumption_id: "ID",
  outlet_name: "Outlet",
  date: "Date",
  opening_units: "Opening Units",
  closing_units: "Closing Units",
  night_consumption: "Night Consumption",
  day_consumption: "Day Consumption",
  action: "Action",
};

function EBConsumption() {
  const { ebConsumptions } = useEBConsumptions();

  const getLastEBConsumption = ({ date, branch_id }) => {
    if (date && branch_id) {
      const filteredList = ebConsumptions
        .filter(
          (item) =>
            item.branch_id == branch_id &&
            moment(item.date).isBefore(date, "day")
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const lastEBConsumption = filteredList[filteredList.length - 1];

      if (lastEBConsumption) {
        return {
          closing_units: lastEBConsumption.closing_units,
          opening_units: lastEBConsumption.opening_units,
        };
      }
      return { closing_units: 0, opening_units: 0 };
    }

    return { closing_units: 0, opening_units: 0 };
  };

  const modifiedEbConsumptions = ebConsumptions.map((ebConsumption) => {
    const previousItem = getLastEBConsumption({
      date: ebConsumption.date,
      branch_id: ebConsumption.branch_id,
    });

    const nightConsumption =
      ebConsumption.opening_units - previousItem.closing_units;
    const dayConsumption =
      ebConsumption.closing_units - ebConsumption.opening_units;

    return {
      ...ebConsumption,
      date: moment(ebConsumption.date).format("DD/MM/YYYY"),
      night_consumption: `${nightConsumption} units`,
      day_consumption: `${dayConsumption} units`,
      action: (
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
          <Link
            href={`/eb-consumption/view?id=${ebConsumption.consumption_id}`}
            passHref
          >
            <a target="_blank" rel="noopener noreferrer">
              <MenuItem>View</MenuItem>
            </a>
          </Link>
          <Link
            href={`/eb-consumption/edit?id=${ebConsumption.consumption_id}`}
            passHref
          >
            <MenuItem>Edit</MenuItem>
          </Link>
          <MenuItem>Delete</MenuItem>
        </Menu>
      ),
    };
  });

  return (
    <GlobalWrapper title="EB Consumption">
      <CustomContainer
        title="EB Consumption"
        filledHeader
        rightSection={
          <Link href="/eb-consumption/create" passHref>
            <Button colorScheme="whiteAlpha">Add</Button>
          </Link>
        }
      >
        <Table
          heading={HEADINGS}
          rows={modifiedEbConsumptions}
          variant="plain"
          showPagination
          dontAffectPagination
          size="sm"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EBConsumption;
