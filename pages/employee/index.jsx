import { useEffect } from "react";
import { useRouter } from "next/router";
import { Spinner, Stack, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";

/**
 * Stage 0C / C3 — compatibility redirect.
 *
 * The employee master is /hr/employees now. This page used to be a second
 * employee list with its own Sync button, and both of those are gone:
 *
 *   ONE LIST. Two employee lists in the navigation is how two employee
 *   masters begin, and C1/C2 exist precisely so there is one permanent
 *   employee record per person.
 *
 *   NO SYNC. The Sync button and the "Last Sync" line described a world where
 *   Digisme owned the employee master and dnds.co.in displayed a copy. That
 *   is no longer true: employees are created, edited, resigned and rejoined
 *   HERE. A button offering to re-pull them from elsewhere is now, at best,
 *   misleading about which system is authoritative.
 *
 * The route itself stays so that bookmarks, links in old Telegram messages
 * and anyone's muscle memory keep working. `replace` rather than `push`, so
 * Back does not bounce the user straight back here.
 */
function EmployeeIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hr/employees");
  }, [router]);

  return (
    <GlobalWrapper title="Employees">
      <CustomContainer title="Employees" filledHeader>
        <Stack align="center" py={10} spacing={3}>
          <Spinner />
          <Text fontSize="sm" color="gray.600">
            Employees have moved to HR. Taking you there…
          </Text>
        </Stack>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EmployeeIndexRedirect;
