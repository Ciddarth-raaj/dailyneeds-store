import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Alert,
  AlertIcon,
  Button,
  Flex,
  Input,
  Link,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import ReportWorkbench from "../../../components/reports/ReportWorkbench";
import useReportCatalogue from "../../../customHooks/useReportCatalogue";
import ReportHelper from "../../../helper/report";
import usePermissions from "../../../customHooks/usePermissions";

/**
 * Reports — Create Report.
 *
 * The same screen as an open report, started from the catalogue's default
 * columns instead of a saved definition. It shares `ReportWorkbench`, and
 * through it the same columns drawer and the same filter rules, rather than
 * growing a second way to choose fields - which is how the two screens would
 * end up disagreeing about what a column list means.
 */
function CreateReportPage() {
  const canView = usePermissions(["view_reports", "view_employees"], { all: true });
  const router = useRouter();
  const toast = useToast();

  const { catalogue, masters, error } = useReportCatalogue();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const definition = useRef({ field_keys: [], filters: {} });

  /** The catalogue's own defaults - the server says which columns start ticked. */
  const defaults = useMemo(() => {
    if (!catalogue) return [];
    return (catalogue.groups || [])
      .flatMap((g) => g.fields)
      .filter((f) => f.default_selected)
      .map((f) => f.key);
  }, [catalogue]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Give the report a name first", status: "info", duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      const body = await ReportHelper.createTemplate({
        template_name: trimmed,
        field_keys: definition.current.field_keys,
        filters: definition.current.filters,
      });
      if (body && body.code >= 400) {
        toast({ title: body.msg, status: "error", duration: 6000 });
        return;
      }
      toast({ title: `"${trimmed}" saved`, status: "success", duration: 3000 });
      router.push(
        body && body.template_id
          ? `/reports/employee-master/${body.template_id}`
          : "/reports/employee-master"
      );
    } catch (err) {
      toast({ title: "The report could not be saved.", status: "error", duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlobalWrapper title="Create Report">
      <CustomContainer title="Create Report" filledHeader>
        <Stack spacing="10px">
          <Text fontSize="12px" color="gray.500">
            <NextLink href="/reports/employee-master" passHref>
              <Link color="purple.600">Saved Reports</Link>
            </NextLink>
            {" › Create Report"}
          </Text>

          {!canView && (
            <Alert status="info" borderRadius="8px">
              <AlertIcon />
              You do not have permission to view reports.
            </Alert>
          )}

          {error && (
            <Alert status="error" borderRadius="8px">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {canView && !catalogue && !error && (
            <Flex justify="center" padding="24px">
              <Spinner />
            </Flex>
          )}

          {canView && catalogue && (
            <ReportWorkbench
              title="New report"
              catalogue={catalogue}
              masters={masters}
              template={null}
              initialFieldKeys={defaults}
              initialFilters={{}}
              onDefinitionChange={(next) => {
                definition.current = next;
              }}
              actions={
                <Flex gap="6px" align="center">
                  <Input
                    size="sm"
                    width="180px"
                    placeholder="Report name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Report name"
                  />
                  <Button size="sm" variant="outline" isLoading={saving} onClick={save}>
                    Save Report
                  </Button>
                </Flex>
              }
            />
          )}
        </Stack>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default CreateReportPage;
