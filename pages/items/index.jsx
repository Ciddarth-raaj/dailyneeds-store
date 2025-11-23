import React, { useState, useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Table from "../../components/table/table";
import { IconButton, Select, Input, Box, Button } from "@chakra-ui/react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import toast from "react-hot-toast";
import { useReturnItem } from "../../customHooks/useReturnItem";
import useDebounce from "../../customHooks/useDebounce";
import {
  BOOLEAN_LIST,
  findItem,
  PACKAGING_MATERIAL_LIST,
  PACKAGING_MATERIAL_SIZE_LIST,
  PACKAGING_TYPE_LIST,
} from "../../constants/repackItems";
import exportCSVFile from "../../util/exportCSVFile";
import { capitalize } from "../../util/string";
import moment from "moment";

const CustomSelect = ({ value, onChange, options = [] }) => (
  <Select
    placeholder="Select Option"
    value={value}
    size="sm"
    onChange={(value) => onChange(value.target.value)}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Select>
);

const HEADINGS = {
  item_id: "Item ID",
  item_name: "Name",
  package_size: "Package Size",
  cleaning: "Cleaning",
  packing_type: "Packing Type",
  packing_material: "Packing Material",
  packing_material_size: "Packing Material Size",
  sticker: "Sticker",
  action: "Action",
};

function Items() {
  const {
    returnItems: itemsList,
    loading,
    createReturnItem,
    setReturnItems: setItemsList,
  } = useReturnItem();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filter and sort items based on search query and sort configuration
  const filteredItems = useMemo(() => {
    let filtered = itemsList;

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = itemsList.filter((item) => {
        const itemId = item.item_id?.toString().toLowerCase() || "";
        const itemName = item.de_display_name?.toLowerCase() || "";

        return itemId.includes(query) || itemName.includes(query);
      });
    }

    return filtered;
  }, [itemsList, debouncedSearchQuery]);

  const handleChange = (key, value, index) => {
    itemsList[index] = {
      ...itemsList[index],
      [key]: value,
    };
    setItemsList(JSON.parse(JSON.stringify(itemsList)));
  };

  const handleCancel = (index) => {
    itemsList[index] = {
      ...itemsList[index],
      editable: false,
    };

    delete itemsList[index]?.edited_cleaning;
    delete itemsList[index]?.edited_packing_type;
    delete itemsList[index]?.edited_packing_material;
    delete itemsList[index]?.edited_packing_material_size;
    delete itemsList[index]?.edited_sticker;

    setItemsList(JSON.parse(JSON.stringify(itemsList)));
  };

  const handleSave = (index) => {
    try {
      const data = itemsList[index];
      const params = {
        item_id: data.item_id,
        cleaning:
          (data.edited_cleaning ? data.edited_cleaning : data.cleaning) == 1
            ? true
            : false,
        packing_type: data.edited_packing_type
          ? data.edited_packing_type
          : data.packing_type,
        packing_material: data.edited_packing_material
          ? data.edited_packing_material
          : data.packing_material,
        packing_material_size: data.edited_packing_material_size
          ? data.edited_packing_material_size
          : data.packing_material_size,
        sticker:
          (data.edited_sticker ? data.edited_sticker : data.sticker) == 1
            ? true
            : false,
      };

      toast.promise(createReturnItem(params), {
        loading: "Saving item",
        success: (response) => {
          if (response.code === 200) {
            itemsList[index] = {
              ...itemsList[index],
              editable: false,
              cleaning: params.cleaning,
              packing_type: params.packing_type,
              packing_material: params.packing_material,
              packing_material_size: params.packing_material_size,
              sticker: params.sticker,
            };

            delete itemsList[index]?.edited_cleaning;
            delete itemsList[index]?.edited_packing_type;
            delete itemsList[index]?.edited_packing_material;
            delete itemsList[index]?.edited_packing_material_size;
            delete itemsList[index]?.edited_sticker;

            setItemsList(JSON.parse(JSON.stringify(itemsList)));

            return "Item saved successfully!";
          }

          throw response;
        },
        error: (err) => {
          console.error("Error saving item:", err);
          return "Failed to save item";
        },
      });
    } catch (error) {
      console.error("Error saving sheet:", error);
    }
  };

  const rows = filteredItems.map((item) => {
    // Find the original index in itemsList for proper state management
    const originalIndex = itemsList.findIndex(
      (originalItem) => originalItem.item_id === item.item_id
    );

    const action = (
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
        {!item.editable && (
          <MenuItem
            onClick={() => handleChange("editable", true, originalIndex)}
          >
            Edit
          </MenuItem>
        )}
        {item.editable && (
          <MenuItem onClick={() => handleSave(originalIndex)}>Save</MenuItem>
        )}
        {item.editable && (
          <MenuItem onClick={() => handleCancel(originalIndex)}>
            Cancel
          </MenuItem>
        )}
      </Menu>
    );

    if (!item.editable) {
      return {
        item_id: item.item_id,
        item_name: (
          <p style={{ textTransform: "capitalize" }}>
            {item.gf_item_name.toLowerCase()}
          </p>
        ),
        package_size: `${item.measure} gms`,
        cleaning: findItem(BOOLEAN_LIST, item.edited_cleaning ?? item.cleaning),
        packing_type: findItem(
          PACKAGING_TYPE_LIST,
          item.edited_packing_type ?? item.packing_type
        ),
        packing_material: findItem(
          PACKAGING_MATERIAL_LIST,
          item.edited_packing_material ?? item.packing_material
        ),
        packing_material_size: findItem(
          PACKAGING_MATERIAL_SIZE_LIST,
          item.edited_packing_material_size ?? item.packing_material_size
        ),
        sticker: findItem(BOOLEAN_LIST, item.edited_sticker ?? item.sticker),
        action,
        editable: false,
      };
    }

    return {
      item_id: item.item_id,
      item_name: (
        <p style={{ textTransform: "capitalize" }}>
          {item.gf_item_name.toLowerCase()}
        </p>
      ),
      package_size: `${item.measure} gms`,
      cleaning: (
        <CustomSelect
          value={item.cleaning}
          onChange={(value) =>
            handleChange("edited_cleaning", value, originalIndex)
          }
          options={BOOLEAN_LIST}
        />
      ),
      packing_type: (
        <CustomSelect
          value={item.edited_packing_type ?? item.packing_type}
          onChange={(value) =>
            handleChange("edited_packing_type", value, originalIndex)
          }
          options={PACKAGING_TYPE_LIST}
        />
      ),
      packing_material: (
        <CustomSelect
          value={item.edited_packing_material ?? item.packing_material}
          onChange={(value) =>
            handleChange("edited_packing_material", value, originalIndex)
          }
          options={PACKAGING_MATERIAL_LIST}
        />
      ),
      packing_material_size: (
        <CustomSelect
          value={
            item.edited_packing_material_size ?? item.packing_material_size
          }
          onChange={(value) =>
            handleChange("edited_packing_material_size", value, originalIndex)
          }
          options={PACKAGING_MATERIAL_SIZE_LIST}
        />
      ),
      sticker: (
        <CustomSelect
          value={item.edited_sticker ?? item.sticker}
          onChange={(value) =>
            handleChange("edited_sticker", value, originalIndex)
          }
          options={BOOLEAN_LIST}
        />
      ),
      action,
      editable: true,
    };
  });

  const handleExport = () => {
    const TABLE_HEADER = {
      item_id: "Item Id",
      item_name: "Name",
      package_size: "Package Size",
      cleaning: "Cleaning",
      packing_type: "Packing Type",
      packing_material: "Packing Material",
      packing_material_size: "Packing Material Size",
      sticker: "Sticker",
    };

    const formattedData = [];
    itemsList.forEach((d, i) => {
      formattedData.push({
        item_id: d.item_id,
        item_name: capitalize(d.gf_item_name.toLowerCase()),
        package_size: `${d.measure} gms`,
        cleaning: findItem(BOOLEAN_LIST, d.edited_cleaning ?? d.cleaning),
        packing_type: findItem(
          PACKAGING_TYPE_LIST,
          d.edited_packing_type ?? d.packing_type
        ),
        packing_material: findItem(
          PACKAGING_MATERIAL_LIST,
          d.edited_packing_material ?? d.packing_material
        ),
        packing_material_size: findItem(
          PACKAGING_MATERIAL_SIZE_LIST,
          d.edited_packing_material_size ?? d.packing_material_size
        ),
        sticker: findItem(BOOLEAN_LIST, d.edited_sticker ?? d.sticker),
      });
    });

    exportCSVFile(
      TABLE_HEADER,
      formattedData,
      "Repack Items Master (" + moment().format("DD-MM-YYYY") + ")"
    );
  };

  return (
    <GlobalWrapper title="Repack Items">
      <CustomContainer
        title="Repack Items"
        filledHeader
        rightSection={
          <Button
            colorScheme="purple"
            onClick={handleExport}
            variant="new-outline"
          >
            Export
          </Button>
        }
      >
        {loading ? (
          <p>Loading</p>
        ) : (
          <>
            {/* Search Box */}
            <Box mb={4}>
              <Input
                placeholder="Search by Item ID or Item Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
              />
            </Box>

            <Table
              heading={HEADINGS}
              rows={rows}
              variant="plain"
              showPagination
              dontAffectPagination
              size="sm"
            />
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Items;
