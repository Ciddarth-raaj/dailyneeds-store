import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import ReportHelper from "../../../helper/report";
import usePermissions from "../../../customHooks/usePermissions";

/**
 * Reports — Saved Reports.
 *
 * THE CATALOGUE, AND NOTHING ELSE. This page lists the reports that exist and
 * gets out of the way. It deliberately renders no employee data, no column
 * builder and no filters: the old screen put the saved list, the field
 * picker, the filters and the results on one page, and choosing a report
 * meant scrolling past the machinery for building one.
 *
 * Opening a report goes to its own screen, where the report is the only thing
 * on it.
 *
 * BUILT-IN REPORTS ARE NOT EDITABLE, by anybody, including an administrator.
 * They are what Reports looks like on day one for every user. Save a Copy is
 * how somebody gets one of their own, and the copy is an ordinary custom
 * report from that moment on.
 */
function SavedReportsPage() {
  // BOTH keys, matching the backend's `requireAll`: the reporting capability
  // AND the dataset it is pointed at.
  const canView = usePermissions(["view_reports", "view_employees"], { all: true });
  const router = useRouter();
  const toast = useToast();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [copying, setCopying] = useState(null);

  const load = async () => {
    try {
      const body = await ReportHelper.listTemplates();
      if (body && body.code >= 400) {
        setError(body.msg || "The saved reports could not be loaded.");
        return;
      }
      setTemplates((body && body.templates) || []);
    } catch (err) {
      setError("The saved reports could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((t) => String(t.template_name).toLowerCase().includes(term));
  }, [templates, search]);

  const saveACopy = async (template) => {
    setCopying(template.template_id);
    try {
      const body = await ReportHelper.copyTemplate(
        template.template_id,
        `${template.template_name} (copy)`
      );
      if (body && body.code >= 400) {
        toast({ title: body.msg, status: "error", duration: 6000 });
        return;
      }
      toast({ title: "Copy saved", status: "success", duration: 3000 });
      await load();
    } catch (err) {
      toast({ title: "The copy could not be saved.", status: "error", duration: 5000 });
    } finally {
      setCopying(null);
    }
  };

  const remove = async (template) => {
    const body = await ReportHelper.deleteTemplate(template.template_id);
    if (body && body.code >= 400) {
      toast({ title: body.msg, status: "error", duration: 6000 });
      return;
    }
    toast({ title: "Report deleted", status: "success", duration: 3000 });
    await load();
  };

  return (
    <GlobalWrapper title="Saved Reports">
      <CustomContainer title="Saved Reports" filledHeader>
        {!canView ? (
          <Alert status="info" borderRadius="8px">
            <AlertIcon />
            You do not have permission to view reports.
          </Alert>
        ) : (
          <Stack spacing="12px">
            <Flex justify="space-between" align="center" wrap="wrap" gap="8px">
              <Input
                size="sm"
                maxWidth="280px"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                size="sm"
                colorScheme="purple"
                onClick={() => router.push("/reports/employee-master/new")}
              >
                Create Report
              </Button>
            </Flex>

            {error && (
              <Alert status="error" borderRadius="8px">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {loading ? (
              <Flex justify="center" padding="24px">
                <Spinner />
              </Flex>
            ) : (
              <Stack spacing="6px">
                {shown.map((template) => (
                  <Flex
                    key={template.template_id}
                    borderWidth="1px"
                    borderRadius="8px"
                    padding="10px 12px"
                    align="center"
                    justify="space-between"
                    wrap="wrap"
                    gap="8px"
                  >
                    <Box minW="0">
                      <HStack spacing="8px">
                        <Text fontSize="14px" fontWeight="bold">
                          {template.template_name}
                        </Text>
                        {template.is_system ? (
                          <Badge colorScheme="purple" fontSize="9px">
                            Built-in
                          </Badge>
                        ) : template.is_shared ? (
                          <Badge colorScheme="blue" fontSize="9px">
                            Shared
                          </Badge>
                        ) : null}
                      </HStack>
                      <Text fontSize="11px" color="gray.500">
                        {(template.field_keys || []).length} columns
                      </Text>
                    </Box>

                    <HStack spacing="6px">
                      <Button
                        size="xs"
                        colorScheme="purple"
                        onClick={() =>
                          router.push(`/reports/employee-master/${template.template_id}`)
                        }
                      >
                        Open
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        isLoading={copying === template.template_id}
                        onClick={() => saveACopy(template)}
                      >
                        Save a Copy
                      </Button>
                      {/* Delete only where the server already says it is
                          allowed - a built-in report has no such permission,
                          so no button appears for one. */}
                      {template.permissions && template.permissions.canDelete && (
                        <Button size="xs" variant="ghost" colorScheme="red" onClick={() => remove(template)}>
                          Delete
                        </Button>
                      )}
                    </HStack>
                  </Flex>
                ))}

                {shown.length === 0 && (
                  <Text fontSize="13px" color="gray.500">
                    {search.trim() ? "No report matches that name." : "No saved reports yet."}
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default SavedReportsPage;
