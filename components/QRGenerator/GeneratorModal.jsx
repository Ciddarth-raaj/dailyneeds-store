import React, { useRef, useState } from "react";
import EmptyData from "../EmptyData";
import Table from "../table/table";
import {
  Button,
  Container,
  Flex,
  Input,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import { importFileToJSON, isValidFileType } from "../../util/fileImport";
import toast from "react-hot-toast";

const HEADINGS = {
  item_code: "Item Code",
  product_name: "Product Name",
  selling_price: "Selling Price",
  mrp: "MRP",
  print_qty: "Print Qty",
  print_size: "Print Size",
  price_format: "Price Format",
  offer_type: "Offer Type",
  end_date: "End Date",
};

const ROWS = [
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
    offer_type: (
      <Select placeholder="Select Offer Type">
        <option>On Invoice</option>
        <option>Offer Created</option>
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
    offer_type: (
      <Select placeholder="Select Offer Type">
        <option>On Invoice</option>
        <option>Offer Created</option>
      </Select>
    ),
    end_date: (
      <DatePicker
        selected={new Date()}
        customInput={<Input />}
        onChange={(date) => {}}
        dateFormat="dd/MM/yyyy"
      />
    ),
  },
];

function GeneratorModal({ isOpen, onClose }) {
  const fileInputRef = useRef(null);
  //   const [rows, setRows] = useState(ROWS);
  const [rows, setRows] = useState([]);

  const setValue = (key, value, index) => {
    setRows((rows) => {
      const tmpRow = [...rows];
      tmpRow[index] = { ...tmpRow[index], [key]: value };
      return tmpRow;
    });
  };

  const renderRows = () => {
    return rows.map((row, index) => ({
      ...row,
      print_qty: (
        <NumberInput
          max={9000000000}
          onWheel={(e) => e.target.blur()}
          value={row.print_qty_value}
          onChange={(val) => setValue("print_qty_value", val, index)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      ),
      print_size: (
        <Select
          placeholder="Select Size"
          value={row.print_size_value}
          onChange={(val) =>
            setValue("print_size_value", val.target.value, index)
          }
        >
          <option>A4/1</option>
          <option>A4/2</option>
          <option>A4/4</option>
          <option>A4/9</option>
          <option>A4/20</option>
        </Select>
      ),
      price_format: (
        <Select
          placeholder="Select Format"
          value={row.format_value}
          onChange={(val) => setValue("format_value", val.target.value, index)}
        >
          <option>Rs. X only</option>
          <option>Rs. X off on MRP</option>
          <option>X% off on MRP</option>
          <option>Buy X Get Y</option>
        </Select>
      ),
      offer_type: (
        <Select
          placeholder="Select Offer Type"
          value={row.offer_type_value}
          onChange={(val) =>
            setValue("offer_type_value", val.target.value, index)
          }
        >
          <option>On Invoice</option>
          <option>Offer Created</option>
        </Select>
      ),
      end_date: (
        <DatePicker
          selected={row.end_date_value}
          customInput={<Input />}
          onChange={(date) => {
            setValue("end_date_value", date, index);
          }}
          dateFormat="dd/MM/yyyy"
        />
      ),
    }));
  };

  const handleFileChange = async (event) => {
    try {
      const file = event.target.files[0];
      if (file) {
        if (!isValidFileType(file)) {
          toast.error("Invalid file type");
          return;
        }

        const result = await importFileToJSON(
          file,
          ["Item Code", "Mrp", "Selling"],
          1
        );
        parseData(result.data);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const parseData = (data) => {
    try {
      const mappedData = data.map((item) => ({
        item_code: item["Item Code"],
        product_name: item["Description"] ?? "",
        selling_price: item["Selling"],
        mrp: item["Mrp"],
      }));
      setRows(mappedData);
    } catch (err) {
      console.log(err);
      toast.error("Error parsing file!");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollBehavior="inside">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <ModalOverlay />
      <ModalContent maxW="90%">
        <ModalHeader>Generate Barcode</ModalHeader>
        <ModalCloseButton />

        <Container overflowY="auto">
          {rows.length === 0 ? (
            <EmptyData
              button={
                <Button
                  mt="12px"
                  colorScheme="purple"
                  onClick={() => {
                    fileInputRef.current.value = null;
                    fileInputRef.current.click();
                  }}
                >
                  Import Excel or CSV
                </Button>
              }
              message="Import data to continue"
            />
          ) : (
            <Table
              variant="plain"
              heading={HEADINGS}
              rows={renderRows()}
              size="sm"
            />
          )}
        </Container>
        <ModalFooter>
          <Flex justifyContent="flex-end" gap="12px">
            <Button disabled={rows.length === 0} onClick={() => setRows([])}>
              Reset
            </Button>
            <Button colorScheme="purple" disabled={rows.length === 0}>
              Generate
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default GeneratorModal;
