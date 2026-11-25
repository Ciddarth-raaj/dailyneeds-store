import { useEffect, useState } from "react";
import department from "../helper/department";
import unwrapList from "../util/apiList";

export function useProductDepartments() {
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      // `/department/product-department` is B2-gated on `view_department`.
      // A refusal used to reach `.map` and throw; the try/catch below caught
      // it, so the page survived but reported a TypeError instead of "you do
      // not have access".
      const result = unwrapList(await department.getProductDepartment());
      setAccessDenied(result.accessDenied);
      setDepartmentsList(
        result.items.map((d) => ({
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

  return { departmentsList, loading, error, accessDenied, refetch: fetchDepartments };
}

