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
 */
function usePayrollActor() {
  const { userConfig } = useUser();
  return {
    permissions: userConfig.permissions || [],
    isAdmin: String(userConfig.userType) === "2",
  };
}

export default usePayrollActor;
