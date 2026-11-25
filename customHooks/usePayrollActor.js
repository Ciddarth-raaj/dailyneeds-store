import { useMemo } from "react";
import { useUser } from "../contexts/UserContext";

/**
 * M4 — the signed-in user, as the payroll access rules read one.
 *
 * The same two facts every HR screen assembles - the permission rows the
 * session was issued, and whether this is an administrator (`user_type = 2`,
 * which bypasses the permission table on the server) - in one place, so the
 * two Payroll screens cannot end up deciding access from slightly different
 * objects.
 *
 * `userType` arrives from localStorage as a string, which is why the
 * comparison is against "2" and not against 2; `pages/hr/employees/[id].jsx`
 * has done exactly this since M1 and this is that line, shared.
 *
 * NOT A SECURITY BOUNDARY. What comes out of here decides what to draw. Every
 * salary endpoint re-checks the caller's real permissions on every request.
 *
 * THE SAME OBJECT BACK UNTIL THE FACTS CHANGE. This used to build a fresh
 * literal on every render, which is invisible until a caller puts it in a
 * dependency array: on Salary Approval it made a `useMemo` recompute every
 * render and the effect that depends on that memo run every render, which is
 * a render loop and a screen that pegs the CPU. `permissions` is state inside
 * `UserContext`, so its reference only moves when it is actually refetched,
 * and memoising on it is stable.
 */
function usePayrollActor() {
  const { userConfig } = useUser();
  const permissions = userConfig.permissions;
  const userType = userConfig.userType;
  return useMemo(
    () => ({
      permissions: permissions || [],
      isAdmin: String(userType) === "2",
    }),
    [permissions, userType]
  );
}

export default usePayrollActor;
