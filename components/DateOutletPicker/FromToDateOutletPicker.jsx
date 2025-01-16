import React from "react";
import DatePicker from "react-datepicker";
import { CustomDateTimeInput } from "../customInput/customInput";
import { Select } from "@chakra-ui/react";
import useOutlets from "../../customHooks/useOutlets";

import styles from "./styles.module.css";

function FromToDateOutletPicker({
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  selectedOutlet,
  setSelectedOutlet,
  disabled = false,
}) {
  const { outlets } = useOutlets();
  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  return (
    <div className={styles.selectorContainer}>
      <DatePicker
        selected={fromDate}
        customInput={
          <CustomDateTimeInput style={{ backgroundColor: "white" }} />
        }
        onChange={(val) => {
          setFromDate(val);
        }}
        selectsStart
        startDate={fromDate}
        endDate={toDate}
      />

      <DatePicker
        selected={toDate}
        customInput={
          <CustomDateTimeInput style={{ backgroundColor: "white" }} />
        }
        onChange={(val) => {
          setToDate(val);
        }}
        startDate={fromDate}
        endDate={toDate}
        minDate={fromDate}
      />

      <Select
        placeholder="Select Outlet"
        value={selectedOutlet}
        onChange={(val) => setSelectedOutlet(val.target.value)}
        style={{ backgroundColor: "white" }}
        disabled={disabled}
      >
        {OUTLETS_LIST?.map((item) => (
          <option key={item.id} value={item.id}>
            {item.value}
          </option>
        ))}
      </Select>
    </div>
  );
}

export default FromToDateOutletPicker;
