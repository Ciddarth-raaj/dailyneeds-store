/**
 * The three per-user IP policies, as the API names them.
 *
 * `branch` is the default: the user follows whatever rule their branch has.
 * `custom` enforces the user's own list (unioned with the branch's while
 * that is on). `unrestricted` is an explicit exemption. Admins default to
 * `unrestricted`.
 */
export const IP_POLICIES = {
  branch: {
    label: "Follow branch",
    colorScheme: "blue",
    help: "Sign-in is allowed from the branch's addresses while the branch is restricted, and from anywhere while it is not.",
  },
  custom: {
    label: "Custom addresses",
    colorScheme: "orange",
    help: "Sign-in is allowed from this user's own addresses, plus the branch's while the branch is restricted.",
  },
  unrestricted: {
    label: "No restriction",
    colorScheme: "green",
    help: "Sign-in is allowed from anywhere, whatever the branch rule says.",
  },
};

export const IP_POLICY_OPTIONS = Object.entries(IP_POLICIES).map(
  ([value, meta]) => ({ value, ...meta })
);

/** Badge props for a policy value, tolerant of an unknown one. */
export const policyBadge = (value) => {
  const meta = IP_POLICIES[value] || IP_POLICIES.branch;
  return { label: meta.label, colorScheme: meta.colorScheme };
};
