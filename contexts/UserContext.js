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

    updateUserConfig({
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
    // First, create a clean config by filtering out "null" strings
    const cleanConfig = Object.keys(newConfig).reduce((acc, key) => {
      acc[key] = newConfig[key] == "null" ? null : newConfig[key];
      return acc;
    }, {});

    // Update state while preserving existing values if new ones aren't provided
    setUserConfig((prev) => ({
      ...prev,
      ...Object.keys(cleanConfig).reduce((acc, key) => {
        if (cleanConfig[key] !== undefined) {
          acc[key] = cleanConfig[key];
        }
        return acc;
      }, {}),
    }));

    // Update localStorage for all provided values
    Object.keys(cleanConfig).forEach((key) => {
      if (cleanConfig[key] !== undefined) {
        localStorage.setItem(
          key.charAt(0).toUpperCase() + key.slice(1), // Convert to Title_Case
          cleanConfig[key]
        );
      }
    });

    // Update global config permissions if provided
    if (cleanConfig.permissions !== undefined) {
      global.config.permissions = cleanConfig.permissions;
    }
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
