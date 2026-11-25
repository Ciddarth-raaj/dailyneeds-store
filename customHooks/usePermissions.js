import React, { useContext, useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";

/**
 * Does the signed-in user hold these permissions?
 *
 * The default is ANY of them, which is what every existing caller means and
 * relies on. Pass `{ all: true }` for a screen whose access is a conjunction -
 * a capability AND the dataset it is pointed at, say - where the default would
 * quietly answer "yes" on the strength of one key.
 *
 *   usePermissions(["view_employees"])                      one key
 *   usePermissions(["a", "b"])                              either
 *   usePermissions(["view_reports", "view_employees"], { all: true })   both
 *
 * NOT A SECURITY BOUNDARY. This decides what to render. Every endpoint behind
 * it is guarded independently by the backend, which revalidates on every
 * request and does not care what this returned.
 */
function usePermissions(permissions = [], { all = false } = {}) {
  const { userConfig } = useUser();
  const { permissions: userPermissions } = userConfig;

  const checkPermissions = () => {
    if (permissions.length === 0) {
      return true;
    }

    const held = new Set(
      (userPermissions || []).map((permission) => permission.permission_key)
    );

    if (all) {
      return permissions.every((permission) => held.has(permission));
    }

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
