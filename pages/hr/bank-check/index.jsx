import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import moment from "moment";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import HrHelper from "../../../helper/hr";

/**
 * Check Bank Account — a standalone Penny-Less check of ANY account number,
 * through the backend's Sandbox integration (POST /hr/bank/check).
 *
 * Nothing here is tied to an employee and nothing is saved: it answers "does
 * this account exist, and whose name is on it?" before anybody types it into
 * a profile. Each check is a paid provider call, so it runs only on the
 * button, never as the user types.
 *
 * The recent-checks list lives in this tab only and shows the masked account,
 * never the full number.
 */

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_PATTERN = /^[0-9]{6,20}$/;

const cleanAccount = (v) => String(v || "").replace(/[\s-]/g, "");
const cleanIfsc = (v) => String(v || "").replace(/[\s-]/g, "").toUpperCase();

const VERDICT_COLOR = { MATCH: "green", REVIEW: "orange", MISMATCH: "red" };

function resultStatus(result) {
  if (!result.account_exists) return { status: "error", label: "Account not found" };
  if (!result.name_match) return { status: "success", label: "Account exists" };
  if (result.name_match.verdict === "MATCH") return { status: "success", label: "Account exists — name matches" };
  if (result.name_match.verdict === "REVIEW") return { status: "warning", label: "Account exists — name partly matches" };
  return { status: "error", label: "Account exists — name does NOT match" };
}

function BankCheckPage() {
  const [account, setAccount] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [expectedName, setExpectedName] = useState("");
  const [branch, setBranch] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const acc = cleanAccount(account);
  const code = cleanIfsc(ifsc);
  const accountOk = ACCOUNT_PATTERN.test(acc);
  const confirmOk = cleanAccount(confirmAccount) === acc;
  const ifscOk = IFSC_PATTERN.test(code);
  const canCheck = accountOk && confirmOk && ifscOk && !checking;

  // Bank and branch for the IFSC. Free (cached on the server), not a check.
  useEffect(() => {
    if (!ifscOk) {
      setBranch(null);
      return undefined;
    }
    let cancelled = false;
    setBranch({ status: "checking" });
    const t = setTimeout(() => {
      HrHelper.lookupIfsc(code)
        .then((res) => {
          if (cancelled) return;
          if (res && Number(res.code) === 200) {
            setBranch({ status: "ok", bank_name: res.bank_name, branch_name: res.branch_name });
          } else if (res && (Number(res.code) === 404 || Number(res.code) === 422)) {
            setBranch({ status: "invalid", message: res.msg || "Invalid IFSC — please check the code" });
          } else {
            setBranch({ status: "unavailable", message: (res && res.msg) || "Branch lookup unavailable" });
          }
        })
        .catch(() => !cancelled && setBranch({ status: "unavailable", message: "Branch lookup unavailable" }));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [code, ifscOk]);

  const runCheck = async () => {
    if (!canCheck) return;
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await HrHelper.checkBankAccount(acc, code, expectedName.trim());
      if (!res || Number(res.code) !== 200) {
        setError((res && res.msg) || "The check could not be completed.");
        return;
      }
      setResult(res);
      setHistory((h) =>
        [
          {
            at: res.checked_at,
            masked_account: res.masked_account,
            ifsc: res.ifsc,
            bank_name: branch && branch.status === "ok" ? branch.bank_name : null,
            account_exists: res.account_exists,
            name_at_bank: res.name_at_bank,
            verdict: res.name_match ? res.name_match.verdict : null,
          },
          ...h,
        ].slice(0, 20)
      );
    } catch (err) {
      setError("The check could not be completed. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const clearForm = () => {
    setAccount("");
    setConfirmAccount("");
    setIfsc("");
    setExpectedName("");
    setResult(null);
    setError(null);
  };

  const shown = result ? resultStatus(result) : null;

  return (
    <GlobalWrapper title="Check Bank Account" permissionKey={["verify_employee_bank"]}>
      <CustomContainer title="Check Bank Account" filledHeader>
        <Stack spacing={5} maxW="720px">
          <Text color="gray.600" fontSize="sm">
            Confirms an account exists and shows the account holder&apos;s name at the bank, without depositing
            money. Nothing is saved to any employee. Each check is a paid verification call.
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired isInvalid={account !== "" && !accountOk}>
              <FormLabel>Account number</FormLabel>
              <Input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="6 to 20 digits"
              />
              {account !== "" && !accountOk && (
                <FormHelperText color="red.500">Account number must be 6 to 20 digits</FormHelperText>
              )}
            </FormControl>

            <FormControl isRequired isInvalid={confirmAccount !== "" && !confirmOk}>
              <FormLabel>Re-enter account number</FormLabel>
              <Input
                value={confirmAccount}
                onChange={(e) => setConfirmAccount(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                onPaste={(e) => e.preventDefault()}
              />
              {confirmAccount !== "" && !confirmOk && (
                <FormHelperText color="red.500">Account numbers do not match</FormHelperText>
              )}
            </FormControl>

            <FormControl isRequired isInvalid={ifsc !== "" && !ifscOk}>
              <FormLabel>IFSC</FormLabel>
              <Input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                autoComplete="off"
                placeholder="e.g. HDFC0001234"
                maxLength={13}
              />
              {ifsc !== "" && !ifscOk && (
                <FormHelperText color="red.500">Four letters, a zero, then six characters</FormHelperText>
              )}
              {ifscOk && branch && branch.status === "checking" && <FormHelperText>Looking up branch…</FormHelperText>}
              {ifscOk && branch && branch.status === "ok" && (
                <FormHelperText color="green.600">
                  {branch.bank_name} — {branch.branch_name}
                </FormHelperText>
              )}
              {ifscOk && branch && (branch.status === "invalid" || branch.status === "unavailable") && (
                <FormHelperText color={branch.status === "invalid" ? "red.500" : "gray.500"}>
                  {branch.message}
                </FormHelperText>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Expected account holder name (optional)</FormLabel>
              <Input
                value={expectedName}
                onChange={(e) => setExpectedName(e.target.value)}
                autoComplete="off"
                placeholder="To compare with the name at the bank"
              />
            </FormControl>
          </SimpleGrid>

          <Stack direction="row" spacing={3}>
            <Button colorScheme="purple" onClick={runCheck} isLoading={checking} isDisabled={!canCheck}>
              Check account
            </Button>
            <Button variant="outline" onClick={clearForm} isDisabled={checking}>
              Clear
            </Button>
          </Stack>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && shown && (
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Alert status={shown.status} borderRadius="md" mb={4}>
                <AlertIcon />
                <AlertDescription fontWeight="semibold">{shown.label}</AlertDescription>
              </Alert>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacingY={2} spacingX={6} fontSize="sm">
                <Text color="gray.500">Account</Text>
                <Text>{result.masked_account}</Text>
                <Text color="gray.500">IFSC</Text>
                <Text>
                  {result.ifsc}
                  {branch && branch.status === "ok" ? ` (${branch.bank_name}, ${branch.branch_name})` : ""}
                </Text>
                <Text color="gray.500">Name at bank</Text>
                <Text fontWeight="semibold">{result.name_at_bank || "—"}</Text>
                {result.name_match && (
                  <>
                    <Text color="gray.500">Name comparison</Text>
                    <Text>
                      <Badge colorScheme={VERDICT_COLOR[result.name_match.verdict] || "gray"} mr={2}>
                        {result.name_match.verdict}
                      </Badge>
                      {result.name_match.reason}
                    </Text>
                  </>
                )}
                {result.transaction_id && (
                  <>
                    <Text color="gray.500">Reference</Text>
                    <Text>{result.transaction_id}</Text>
                  </>
                )}
              </SimpleGrid>
              <Text mt={3} fontSize="sm" color="gray.600">
                {result.message}
              </Text>
            </Box>
          )}
        </Stack>
      </CustomContainer>

      {history.length > 0 && (
        <CustomContainer title="Checks in this session" smallHeader style={{ marginTop: 16 }}>
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Account</Th>
                  <Th>IFSC</Th>
                  <Th>Result</Th>
                  <Th>Name at bank</Th>
                  <Th>Name check</Th>
                </Tr>
              </Thead>
              <Tbody>
                {history.map((h, i) => (
                  <Tr key={`${h.at}-${i}`}>
                    <Td>{moment(h.at).format("DD/MM/YYYY HH:mm")}</Td>
                    <Td>{h.masked_account}</Td>
                    <Td>{h.ifsc}</Td>
                    <Td>
                      <Badge colorScheme={h.account_exists ? "green" : "red"}>
                        {h.account_exists ? "Exists" : "Not found"}
                      </Badge>
                    </Td>
                    <Td>{h.name_at_bank || "—"}</Td>
                    <Td>
                      {h.verdict ? <Badge colorScheme={VERDICT_COLOR[h.verdict] || "gray"}>{h.verdict}</Badge> : "—"}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CustomContainer>
      )}
    </GlobalWrapper>
  );
}

export default BankCheckPage;
