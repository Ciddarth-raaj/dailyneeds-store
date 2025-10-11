import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteEBConsumption,
  getAllEBConsumption,
} from "../helper/eb_consumption";
import { useConfirmation } from "../hooks/useConfirmation";

function useEBConsumptions() {
  const { confirm } = useConfirmation();
  const [ebConsumptions, setEBConsumptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllEBConsumption();
      if (response.code === 200) {
        setEBConsumptions(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching eb consumptions!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm(
      "Are you sure? You can't undo this action afterwards.",
      {
        title: "Delete",
        type: "error",
        confirmText: "Delete",
      }
    );

    if (!shouldDelete) {
      return;
    }

    toast.promise(deleteEBConsumption(id), {
      loading: "Deleting...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
        }

        return "Eb consumption deleted successfully!";
      },
      error: (err) => {
        console.log(err);
        return "Error deleting eb consumption!";
      },
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { ebConsumptions, loading, handleDelete };
}

export default useEBConsumptions;
