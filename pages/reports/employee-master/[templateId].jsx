import React, { useEffect, useRef, useState } from "react";
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
 * Reports — one saved report, open.
 *
 * The report is the page. Its columns are behind the Columns button, its
 * filters are above the table, and the table is the rest of it.
 *
 * SAVE A COPY IS THE ONLY WAY TO KEEP A CHANGE to a built-in report, and that
 * is deliberate rather than a limitation: the five built-in reports are what
 * every user sees on day one, and one person's idea of the Bank/KYC list is
 * not everybody's. Editing here changes what is on screen; saving a copy is
 * how it survives.
 *
 * The copy carries the report as it stands - its columns in their order and
 * the filters currently applied - so reopening it reproduces this screen.
 */
function ReportViewPage() {
  const canView = usePermissions(["view_reports", "view_employees"], { all: true });
  const router = useRouter();
  const toast = useToast();
  const { templateId } = router.query;

  const { catalogue, masters, error: catalogueError } = useReportCatalogue();

  const [template, setTemplate] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [copyName, setCopyName] = useState("");
  const [saving, setSaving] = useState(false);

  // The live definition, so Save a Copy stores what is on screen rather than
  // what was saved a week ago.
  const definition = useRef({ field_keys: [], filters: {} });

  useEffect(() => {
    if (!templateId) return;
    let live = true;
    (async () => {
      try {
        const body = await ReportHelper.listTemplates();
        if (!live) return;
        if (body && body.code >= 400) {
          setLoadError(body.msg || "That report could not be loaded.");
          return;
        }
        const found = (body.templates || []).find(
          (t) => String(t.template_id) === String(templateId)
        );
        if (!found) {
          setLoadError("That report was not found.");
          return;
        }
        setTemplate(found);
        setCopyName(`${found.template_name} (copy)`);
      } catch (err) {
        if (live) setLoadError("That report could not be loaded.");
      }
    })();
    return () => {
      live = false;
    };
  }, [templateId]);

  const saveACopy = async () => {
    const name = copyName.trim();
    if (!name) {
      toast({ title: "Give the copy a name first", status: "info", duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      // Created as a NEW template from the definition on screen. The built-in
      // it came from is untouched - this route cannot modify it, and the
      // backend refuses to in any case.
      const body = await ReportHelper.createTemplate({
        template_name: name,
        field_keys: definition.current.field_keys,
        filters: definition.current.filters,
      });
      if (body && body.code >= 400) {
        toast({ title: body.msg, status: "error", duration: 6000 });
        return;
      }
      toast({ title: `"${name}" saved`, status: "success", duration: 3000 });
      if (body && body.template_id) {
        router.push(`/reports/employee-master/${body.template_id}`);
      }
    } catch (err) {
      toast({ title: "The copy could not be saved.", status: "error", duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const ready = Boolean(template && catalogue);

  return (
    <GlobalWrapper title={template ? template.template_name : "Report"}>
      <CustomContainer title={template ? template.template_name : "Report"} filledHeader>
        <Stack spacing="10px">
          <Text fontSize="12px" color="gray.500">
            <NextLink href="/reports/employee-master" passHref>
              <Link color="purple.600">Saved Reports</Link>
            </NextLink>
            {template ? ` › ${template.template_name}` : ""}
          </Text>

          {!canView && (
            <Alert status="info" borderRadius="8px">
              <AlertIcon />
              You do not have permission to view reports.
            </Alert>
          )}

          {(loadError || catalogueError) && (
            <Alert status="error" borderRadius="8px">
              <AlertIcon />
              {loadError || catalogueError}
            </Alert>
          )}

          {canView && !ready && !loadError && !catalogueError && (
            <Flex justify="center" padding="24px">
              <Spinner />
            </Flex>
          )}

          {canView && ready && (
            <ReportWorkbench
              title={template.template_name}
              catalogue={catalogue}
              masters={masters}
              template={template}
              initialFieldKeys={template.field_keys || []}
              initialFilters={template.filters || {}}
              onDefinitionChange={(next) => {
                definition.current = next;
              }}
              actions={
                <Flex gap="6px" align="center">
                  <Input
                    size="sm"
                    width="180px"
                    value={copyName}
                    onChange={(e) => setCopyName(e.target.value)}
                    aria-label="Name for the copy"
                  />
                  <Button size="sm" variant="outline" isLoading={saving} onClick={saveACopy}>
                    Save a Copy
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

export default ReportViewPage;
