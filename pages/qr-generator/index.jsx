import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import Table from "../../components/table/table";
import {
  Flex,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
} from "@chakra-ui/react";
import EmptyData from "../../components/EmptyData";

const HEADINGS = {
  item_code: "Item Code",
  product_name: "Product Name",
  selling_price: "Selling Price",
  mrp: "MRP",
  print_qty: "Print Qty",
  print_size: "Print Size",
  price_format: "Price Format",
};

function Index() {
  const rows = [
    {
      item_code: "123",
      product_name: "10 ON LITE EXTRA SOFT DINNER NAPKINS 400MMX400MM 2PLY",
      selling_price: 100,
      mrp: 95,
      print_qty: (
        <NumberInput max={9000000000} onWheel={(e) => e.target.blur()}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      ),
      print_size: (
        <Select placeholder="Select Size">
          <option>A4/1</option>
          <option>A4/2</option>
          <option>A4/4</option>
          <option>A4/9</option>
          <option>A4/20</option>
        </Select>
      ),
      price_format: (
        <Select placeholder="Select Format">
          <option>Rs. X only</option>
          <option>Rs. X off on MRP</option>
          <option>X% off on MRP</option>
          <option>Buy X Get Y</option>
        </Select>
      ),
    },
    {
      item_code: "123",
      product_name: "777 APPALAM NO.5 150G",
      selling_price: 100,
      mrp: 95,
      print_qty: (
        <NumberInput max={9000000000} onWheel={(e) => e.target.blur()}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      ),
      print_size: (
        <Select placeholder="Select Size">
          <option>A4/1</option>
          <option>A4/2</option>
          <option>A4/4</option>
          <option>A4/9</option>
          <option>A4/20</option>
        </Select>
      ),
      price_format: (
        <Select placeholder="Select Format">
          <option>Rs. X only</option>
          <option>Rs. X off on MRP</option>
          <option>X% off on MRP</option>
          <option>Buy X Get Y</option>
        </Select>
      ),
    },
  ];

  return (
    <GlobalWrapper>
      <CustomContainer
        title="QR Generator"
        filledHeader
        rightSection={<Button colorScheme="whiteAlpha">Import</Button>}
      >
        {rows.length === 0 ? (
          <EmptyData message="Import data to continue" />
        ) : (
          <>
            <Table variant="plain" heading={HEADINGS} rows={rows} size="sm" />

            <Flex justifyContent="flex-end">
              <Button colorScheme="purple">Generate</Button>
            </Flex>
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Index;
