import React, { useState } from "react";
import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import { runRetailPilotSupplierSync } from "../../helper/productDistributors";

const LINES = [
  ["suppliers", "Suppliers from RetailPilot"],
  ["suppliers_new", "New to DNDS"],
  ["products_supplier_set", "Products given their RetailPilot supplier"],
  ["products_supplier_cleared", "Products left with no supplier"],
  ["buyers_removed", "Buyer assignments removed (old suppliers)"],
  ["old_suppliers_deleted", "Old suppliers deleted"],
  ["old_suppliers_hidden", "Old suppliers kept hidden (used by advance requests / LR)"],
];

function Counts({ result }) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
      {LINES.map(([key, label]) => (
        <Box key={key} borderWidth="1px" borderRadius="md" p={2}>
          <Text fontSize="xs" color="gray.600">
            {label}
          </Text>
          <Text fontWeight="bold">{result?.[key] ?? 0}</Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}

/**
 * Suppliers from RetailPilot, by hand: Dry Run (counts, no change) and Sync
 * Now (after a confirmation). Runs daily at 6:45 AM once this first switch
 * has been made.
 */
export default function RetailPilotSupplierSync({ onSynced }) {
  const panel = useDisclosure();
  const [running, setRunning] = useState(null); // "dry" | "sync"
  const [preview, setPreview] = useState(null);

  const run = async (dryRun) => {
    setRunning(dryRun ? "dry" : "sync");
    try {
      const r = await runRetailPilotSupplierSync({ dryRun });
      if (r?.code !== 200) throw new Error(r?.msg || "RetailPilot supplier sync failed");
      if (dryRun) {
        setPreview(r);
      } else {
        setPreview(null);
        panel.onClose();
        toast.success(`Suppliers synced from RetailPilot: ${r.suppliers}`);
        if (onSynced) onSynced();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunning(null);
    }
  };

  return (
    <>
      <Button colorScheme="purple" size="sm" onClick={panel.onOpen}>
        RetailPilot Sync
      </Button>
      <Modal isOpen={panel.isOpen} onClose={panel.onClose} size="2xl">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Suppliers from RetailPilot</ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                RetailPilot&apos;s supplier list replaces DNDS&apos;s, and each product&apos;s supplier
                follows RetailPilot. Buyer and holding days you set here are kept. Run a Dry Run
                first: it shows what will change and changes nothing.
              </Text>
              {preview ? (
                <>
                  <Text fontWeight="semibold">Dry run - nothing changed. A sync now would:</Text>
                  <Counts result={preview} />
                </>
              ) : null}
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={panel.onClose} isDisabled={!!running}>
              Close
            </Button>
            <Button
              variant="outline"
              colorScheme="purple"
              onClick={() => run(true)}
              isLoading={running === "dry"}
              loadingText="Checking RetailPilot"
              isDisabled={!!running}
            >
              Dry Run
            </Button>
            <Button
              colorScheme="purple"
              onClick={() => run(false)}
              isLoading={running === "sync"}
              loadingText="Syncing"
              isDisabled={!preview || !!running}
              title={preview ? "" : "Run a Dry Run first"}
            >
              Sync Now
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
