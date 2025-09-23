import { useEffect, useState } from "react";
import CleaningPackingHelper from "../helper/cleaning-packing";
import { capitalize } from "../util/string";

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
          article_name: capitalize(item.article_name),
          bulk_weight:
            (item.repackage_conversion * item.repack_quantity) / 1000,
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
