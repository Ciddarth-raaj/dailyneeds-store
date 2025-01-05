import React, { useContext, useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";

function usePermissions(permissions = []) {
  const { userConfig } = useUser();
  const { permissions: userPermissions } = userConfig;

  const checkPermissions = () => {
    for (let permission of userPermissions) {
      if (permissions.includes(permission.permission_key)) {
        return true;
      }
    }

    return false;
  };

  return checkPermissions();
}

export default usePermissions;
