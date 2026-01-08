import { useEffect, useState } from "react";
import department from "../helper/department";

export function useProductDepartments() {
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await department.getProductDepartment();
      const data = response || [];
      setDepartmentsList(
        data.map((d) => ({
          id: d.id || d.department_id,
          value: d.value || d.department_name,
        }))
      );
    } catch (err) {
      setError(err);
      console.error("Error fetching departments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return { departmentsList, loading, error, refetch: fetchDepartments };
}

