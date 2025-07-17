import React, { useEffect, useState, useMemo } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import Table from "../../../components/table/table";
import materialcategory from "../../../helper/materialcategory";
import { Badge, useDisclosure } from "@chakra-ui/react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import EmptyData from "../../../components/EmptyData";
import usePermissions from "../../../customHooks/usePermissions";

const HEADINGS = {
  material_category_id: "ID",
  category_name: "Category Name",
  is_active: "Status",
  actions: "Actions",
};

function MaterialsCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();

  const canAddCategory = usePermissions(["add_materials_category"]);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await materialcategory.getMaterialCategories(0, 1000);
      setCategories(data || []);
    } catch (err) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (item, isActive) => {
    try {
      const data = await materialcategory.updateMaterialCategory(
        item.material_category_id,
        {
          category_name: item.category_name,
          is_active: isActive ? true : false,
        }
      );
      if (data && data.code === 200) {
        toast.success(`Category set as ${isActive ? "Active" : "Inactive"}`);
        fetchCategories();
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
      const data = await materialcategory.deleteMaterialCategory(
        deleteItem.material_category_id
      );
      if (data && data.code === 200) {
        toast.success("Category deleted");
        fetchCategories();
      } else {
        toast.error("Failed to delete category");
      }
    } catch (err) {
      toast.error("Failed to delete category");
    } finally {
      setDeleteItem(null);
      onClose();
    }
  };

  const rows = useMemo(() => {
    return categories.map((item) => ({
      ...item,
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
              router.push(
                `/materials/category/edit?id=${item.material_category_id}`
              )
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
    // eslint-disable-next-line
  }, [categories]);

  return (
    <GlobalWrapper title="Materials Category">
      <CustomContainer
        title="Materials Category"
        filledHeader
        rightSection={
          canAddCategory ? (
            <Link href="/materials/category/create" passHref>
              <Button colorScheme="whiteAlpha">Add</Button>
            </Link>
          ) : null
        }
      >
        {rows.length === 0 && !loading && (
          <EmptyData message="No categories found" />
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
          title="Delete Category"
          body="Are you sure you want to delete this category?"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsCategory;
