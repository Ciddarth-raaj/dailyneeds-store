import { useEffect } from "react";
import { useRouter } from "next/router";
import { Spinner, Stack, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { canonicalPathFor } from "../../util/legacyEmployeeRoute";

/**
 * Stage 0C / C3 — compatibility redirect.
 *
 * THERE IS ONE EMPLOYEE PROFILE, and it is /hr/employees/[id]. This route
 * used to render a second, entirely separate implementation of the same idea:
 * its own fetch, its own form, its own seven section components, its own
 * notion of what an employee is. Two profiles for one person is how two
 * employee records begin, which is the thing C1 and C2 exist to prevent.
 *
 * So this no longer renders a profile - it forwards to the canonical one, and
 * the implementation that used to live here is deleted rather than left
 * beside it. Nothing imported it, and dead code that renders an employee is
 * still code somebody will later trust.
 *
 * The id is carried through unchanged by `canonicalPathFor`, which is where
 * that decision is stated and tested.
 *
 * `replace`, not `push`: Back must return to wherever the user came from,
 * not bounce them between the old route and the new one.
 */
function LegacyEmployeeProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    // On a dynamic route the query is empty until the router is ready; acting
    // before then would send everybody to the list.
    if (!router.isReady) return;
    const target = canonicalPathFor(router.query.id);
    if (target) router.replace(target);
  }, [router.isReady, router.query.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GlobalWrapper title="Employee">
      <CustomContainer title="Employee" filledHeader>
        <Stack align="center" py={10} spacing={3}>
          <Spinner />
          <Text fontSize="sm" color="gray.600">
            Employee profiles have moved to HR. Taking you there…
          </Text>
        </Stack>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default LegacyEmployeeProfileRedirect;
