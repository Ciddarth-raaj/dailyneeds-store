import React, { useEffect, useState, useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import { Flex, useDisclosure } from "@chakra-ui/react";
import Table from "../../components/table/table";
import { Badge } from "@chakra-ui/react";
import EmptyData from "../../components/EmptyData";
import material from "../../helper/material";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import usePermissions from "../../customHooks/usePermissions";

const HEADINGS = {
  material_id: "ID",
  name: "Name",
  sku_code: "SKU Code",
  category: "Category",
  is_active: "Status",
  actions: "Actions",
};

function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();
  const canAddMaterial = usePermissions(["add_materials"]);
  const canAddCategory = usePermissions(["add_materials_category"]);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await material.getMaterials();
      setMaterials(data || []);
    } catch (err) {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (item, isActive) => {
    try {
      const data = await material.updateMaterial(item.material_id, {
        name: item.name,
        sku_code: item.sku_code,
        unit_id: item.unit_id,
        material_category_id: item.material_category_id,
        is_active: isActive ? true : false,
      });
      if (data && data.code === 200) {
        toast.success(`Material set as ${isActive ? "Active" : "Inactive"}`);
        fetchMaterials();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const data = await material.deleteMaterial(deleteItem.material_id);
      if (data && data.code === 200) {
        toast.success("Material deleted");
        fetchMaterials();
      } else {
        toast.error("Failed to delete material");
      }
    } catch (err) {
      toast.error("Failed to delete material");
    } finally {
      setDeleteItem(null);
      onClose();
    }
  };

  const rows = useMemo(() => {
    return materials.map((item) => ({
      ...item,
      category: item.category?.category_name || "-",
      is_active: item.is_active ? (
        <Badge colorScheme="green">Active</Badge>
      ) : (
        <Badge colorScheme="red">Inactive</Badge>
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
          <MenuItem
            onClick={() =>
              router.push(`/materials/edit?id=${item.material_id}`)
            }
          >
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              setDeleteItem(item);
              onOpen();
            }}
          >
            Delete
          </MenuItem>
          <MenuItem onClick={() => handleSetActive(item, !item.is_active)}>
            {item.is_active ? "Set as Inactive" : "Set as Active"}
          </MenuItem>
        </Menu>
      ),
    }));
  }, [materials, onOpen, router]);

  return (
    <GlobalWrapper title="Materials">
      <CustomContainer
        title="Materials"
        filledHeader
        rightSection={
          <Flex>
            {canAddMaterial && (
              <Link href="/materials/create" passHref>
                <Button colorScheme="whiteAlpha">Add</Button>
              </Link>
            )}
            {canAddCategory && (
              <Link href="/materials/category/create" passHref>
                <Button colorScheme="whiteAlpha" ml={2}>
                  Add Category
                </Button>
              </Link>
            )}
          </Flex>
        }
      >
        {rows.length === 0 && !loading && (
          <EmptyData message="No materials found" />
        )}
        {rows.length > 0 && (
          <Table variant="plain" heading={HEADINGS} rows={rows} size="sm" />
        )}
        <ConfirmDeleteModal
          isOpen={isOpen}
          onClose={() => {
            setDeleteItem(null);
            onClose();
          }}
          onConfirm={handleDelete}
          title="Delete Material"
          body="Are you sure you want to delete this material?"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Materials;
