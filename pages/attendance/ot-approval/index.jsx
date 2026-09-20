import { useEffect } from "react";
import { useRouter } from "next/router";
import { Flex, Spinner, Text } from "@chakra-ui/react";

/**
 * OT Approval was its own screen. It is now the OT tab of the Attendance
 * Approval Centre, so this is a redirect and not a second copy of the queue:
 * one approval UI, and every link and bookmark that pointed here still lands
 * on OT requests.
 *
 * `replace` rather than `push`, so Back goes where the reader came from
 * instead of bouncing them through this page again.
 */
export default function OtApprovalRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/attendance/approval?type=OT");
  }, [router]);

  return (
    <Flex align="center" justify="center" gap={2} py={10}>
      <Spinner size="sm" color="purple.500" />
      <Text fontSize="sm" color="gray.600">Opening Attendance Approvals…</Text>
    </Flex>
  );
}
