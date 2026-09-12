import React, { useEffect, useMemo, useState } from "react";
import EmployeeHelper from "../helper/employee";
import toast from "react-hot-toast";

function useEmployees(filterProps = {}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize filters to prevent unnecessary API calls
  const filters = useMemo(() => {
    const cleanFilters = {};

    // Only include defined filters
    if (filterProps.store_ids?.length > 0) {
      cleanFilters.store_ids = filterProps.store_ids;
    }
    if (filterProps.designation_ids?.length > 0) {
      cleanFilters.designation_ids = filterProps.designation_ids;
    }
    if (filterProps.department_ids?.length > 0) {
      cleanFilters.department_ids = filterProps.department_ids;
    }
    if (filterProps.status !== undefined) {
      cleanFilters.status = filterProps.status;
    }

    return cleanFilters;
  }, [
    filterProps.store_ids,
    filterProps.designation_ids,
    filterProps.department_ids,
    filterProps.status,
  ]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await EmployeeHelper.getEmployee(filters);
      if (!data.code) {
        // Guard against the same employee arriving more than once (the API
        // used to fan rows out on a name-keyed join). One entry per id.
        const seen = new Set();
        setEmployees(
          data.filter((item) => {
            if (seen.has(item.employee_id)) return false;
            seen.add(item.employee_id);
            return true;
          })
        );
      }
    } catch (err) {
      setError(err);
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees when filters change
  useEffect(() => {
    fetchEmployees();
  }, [JSON.stringify(filters)]); // Deep comparison of filters

  const handleSync = () => {
    try {
      toast.promise(EmployeeHelper.sync, {
        loading: "Syncing employees",
        success: (response) => {
          if (response.code === 200) {
            fetchEmployees();
            return "Employees Synced!";
          } else {
            throw err;
          }
        },
        error: (err) => {
          console.log(err);
          return "Error syncing!";
        },
      });
    } catch (err) {
      console.log(err);
    }
  };

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
    handleSync,
  };
}

export default useEmployees;
