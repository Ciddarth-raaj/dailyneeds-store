import React from "react";
import useOutlets from "../../customHooks/useOutlets";
import { Select } from "@chakra-ui/react";

function OutletDropdown({
  selectedOutlet,
  setSelectedOutlet,
  disabled,
  showLabel,
}) {
  const { outlets } = useOutlets();
  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  return (
    <div>
      {showLabel && (
        <p
          style={{
            fontSize: "14px",
            color: "gray",
            fontWeight: "600",
            marginBottom: "6px",
          }}
        >
          Select Outlet
        </p>
      )}

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

export default OutletDropdown;
