import { useEffect, useState } from "react";
import CleaningPackingHelper from "../helper/cleaning-packing";
import { capitalize } from "../util/string";
import {
  BOOLEAN_LIST,
  findItem,
  PACKAGING_MATERIAL_LIST,
  PACKAGING_MATERIAL_SIZE_LIST,
  PACKAGING_TYPE_LIST,
} from "../constants/repackItems";

export function useCleaningPacking(filters) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await CleaningPackingHelper.getAll(filters);
      if (data.code === 200) {
        const formattedData = data.data.map((item, index) => ({
          ...item,
          sno: index + 1,
          parent_stock: item.parent_stock.toFixed(2),
          article_name: capitalize(item.article_name),
          bulk_weight:
            (item.repackage_conversion * item.repack_quantity) / 1000,
          cleaning_val: findItem(BOOLEAN_LIST, item.cleaning),
          packing_type_val: findItem(PACKAGING_TYPE_LIST, item.packing_type),
          packing_material_val: findItem(
            PACKAGING_MATERIAL_LIST,
            item.packing_material
          ),
          packing_material_size_val: findItem(
            PACKAGING_MATERIAL_SIZE_LIST,
            item.packing_material_size
          ),
          sticker_val: findItem(BOOLEAN_LIST, item.sticker),
        }));
        setItems(formattedData);
      } else {
        throw data;
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  return { items, loading, setItems, refetch: fetchList };
}
