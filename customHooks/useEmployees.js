import React, { useEffect, useMemo, useState } from "react";
import EmployeeHelper from "../helper/employee";

function useEmployees(filter) {
  const [employees, setEmployees] = useState([]);

  const init = async () => {
    try {
      const data = await EmployeeHelper.getEmployee(filter);
      if (!data.code) {
        setEmployees(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    init();
  }, []);

  return { employees };
}

export default useEmployees;
