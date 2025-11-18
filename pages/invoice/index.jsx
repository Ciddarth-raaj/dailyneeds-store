import React, { useState, useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton, Input, Flex, Tooltip } from "@chakra-ui/react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import Table from "../../components/table/table";
import { useInvoice } from "../../customHooks/useInvoice";
import EmptyData from "../../components/EmptyData";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import moment from "moment";

function Invoice() {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { invoices, loading, error, deleteInvoice } = useInvoice();

  const handleSort = (key, direction) => {
    setSortConfig({ key, direction });
  };

  const handleDeleteClick = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvoice) return;

    setIsDeleting(true);
    try {
      await deleteInvoice(selectedInvoice.invoice_id);
      setIsDeleteModalOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error("Error deleting invoice:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setSelectedInvoice(null);
  };

  const heading = {
    invoice_id: "Invoice ID",
    created_at: "Created Date",
    updated_at: "Updated Date",
    actions: "Actions",
  };

  const rows = useMemo(() => {
    const sortedInvoices = [...invoices].sort((a, b) => {
      if (sortConfig.direction === null) {
        return b.invoice_id.localeCompare(a.invoice_id);
      }

      const multiplier = sortConfig.direction === "asc" ? 1 : -1;

      switch (sortConfig.key) {
        case "created_at":
        case "updated_at":
          const dateA = new Date(a[sortConfig.key]).getTime();
          const dateB = new Date(b[sortConfig.key]).getTime();
          return multiplier * (dateA - dateB);

        case "invoice_id":
          return (
            multiplier * a[sortConfig.key].localeCompare(b[sortConfig.key])
          );

        default:
          return 0;
      }
    });

    const formattedRows = sortedInvoices?.map((invoice) => ({
      ...invoice,
      created_at: (
        <Tooltip
          label={moment(invoice.created_at).format("HH:mm A, DD/MM/YYYY")}
        >
          {moment(invoice.created_at).fromNow()}
        </Tooltip>
      ),
      updated_at: (
        <Tooltip
          label={moment(invoice.updated_at).format("HH:mm A, DD/MM/YYYY")}
        >
          {moment(invoice.updated_at).fromNow()}
        </Tooltip>
      ),
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
          <Link href={`/invoice/view?id=${invoice.invoice_id}`} passHref>
            <MenuItem>View</MenuItem>
          </Link>
          <Link href={`/invoice/edit?id=${invoice.invoice_id}`} passHref>
            <MenuItem>Edit</MenuItem>
          </Link>
          <MenuItem onClick={() => handleDeleteClick(invoice)}>Delete</MenuItem>
        </Menu>
      ),
    }));

    if (!search) return formattedRows;

    const searchLower = search.toLowerCase();
    return formattedRows?.filter((row) => {
      return Object.entries(row)
        .filter(([key]) => key !== "actions")
        .some(([_, value]) => {
          if (value === null || value === undefined) return false;
          if (React.isValidElement(value)) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
    });
  }, [invoices, search, sortConfig]);

  return (
    <GlobalWrapper title="Invoice">
      <CustomContainer
        title="All Invoices"
        filledHeader
        rightSection={
          <Link href="/invoice/create" passHref>
            <Button colorScheme="purple">Add Invoice</Button>
          </Link>
        }
      >
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          mb="22px"
        />

        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : rows.length > 0 ? (
          <Table
            variant="plain"
            heading={heading}
            rows={rows}
            sortCallback={handleSort}
            showPagination
          />
        ) : (
          <EmptyData />
        )}
      </CustomContainer>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Invoice"
        body={`Are you sure you want to delete invoice ${selectedInvoice?.invoice_id}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </GlobalWrapper>
  );
}

export default Invoice;
