import React, { createContext, useContext, useState, useEffect } from "react";
import DesignationHelper from "../helper/designation";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [userConfig, setUserConfig] = useState({
    token: null,
    storeId: null,
    designationId: null,
    userType: null,
    employeeId: null,
    permissions: [],
  });

  useEffect(() => {
    getPermissions();
    // Initialize from localStorage
    const token = localStorage.getItem("Token");
    const storeId = localStorage.getItem("Store_id");
    const designationId = localStorage.getItem("Designation_id");
    const userType = localStorage.getItem("User_type");
    const employeeId = localStorage.getItem("Employee_id");
    const permissions = global.config.permissions || [];

    setUserConfig({
      token,
      storeId,
      designationId,
      userType,
      employeeId,
      permissions,
    });
  }, []);

  const getPermissions = () => {
    DesignationHelper.getPermissionById()
      .then((data) => {
        try {
          if (!data) return;
          updateUserConfig({ permissions: data });
        } catch (error) {
          console.error("Error processing permissions:", error);
        }
      })
      .catch((err) => console.log(err));
  };

  const updateUserConfig = (newConfig) => {
    setUserConfig((prev) => ({ ...prev, ...newConfig }));

    // Update localStorage
    if (newConfig.token) localStorage.setItem("Token", newConfig.token);
    if (newConfig.storeId) localStorage.setItem("Store_id", newConfig.storeId);
    if (newConfig.designationId)
      localStorage.setItem("Designation_id", newConfig.designationId);
    if (newConfig.userType)
      localStorage.setItem("User_type", newConfig.userType);
    if (newConfig.employeeId)
      localStorage.setItem("Employee_id", newConfig.employeeId);

    // Update global config
    if (newConfig.permissions)
      global.config.permissions = newConfig.permissions;
  };

  const clearUserConfig = () => {
    setUserConfig({
      token: null,
      storeId: null,
      designationId: null,
      userType: null,
      employeeId: null,
      permissions: [],
    });
    localStorage.clear();
  };

  return (
    <UserContext.Provider
      value={{ userConfig, updateUserConfig, clearUserConfig }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
