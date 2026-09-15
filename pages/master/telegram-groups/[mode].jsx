import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  Flex,
  ListItem,
  OrderedList,
  Stack,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import TelegramGroupSetupGuide from "../../../components/master/TelegramGroupSetupGuide";
import DetectTelegramGroup from "../../../components/master/DetectTelegramGroup";
import { useDetectedTelegramGroups } from "../../../customHooks/useDetectedTelegramGroups";
import styles from "../../../styles/master.module.css";
import useOutlets from "../../../customHooks/useOutlets";
import usePermissions from "../../../customHooks/usePermissions";
import { useTelegramGroupById } from "../../../customHooks/useTelegramGroupById";
import {
  createTelegramGroup,
  updateTelegramGroup,
} from "../../../helper/telegramGroups";
import {
  TELEGRAM_GROUP_CATEGORIES,
  TELEGRAM_GROUP_MESSAGES,
  STATUS_OPTIONS,
  GROUP_TYPE,
  chatIdError,
  deriveGroupType,
  displayOutlet,
  isValidGroupChatId,
} from "../../../util/telegramGroup";

/**
 * Add / View / Edit one Telegram group, at
 * /master/telegram-groups/{create,view,edit}, the `[mode].jsx` convention
 * Remarks Master uses.
 *
 * THERE IS NO GROUP TYPE FIELD. The type follows the Chat ID and is shown
 * live beside it as the user types, on all three modes; asking somebody to
 * pick it would be asking them to restate the id they just entered, and a
 * picked value could disagree with it.
 *
 * BOTH WARNINGS ARE ADVISORY AND NEITHER DISABLES SAVE. A Basic Group is
 * saved with a note that invite links and member removal will need it
 * converted; a group the bot does not administer is saved with a note that
 * member removal will not work. Only a genuinely invalid Chat ID - a
 * positive id, letters, a decimal - stops the form, and the server refuses
 * the same values again regardless of what happens here.
 */

const validationSchema = Yup.object({
  group_name: Yup.string().trim().required("Group Name is required").max(150),
  chat_id: Yup.string()
    .required(TELEGRAM_GROUP_MESSAGES.CHAT_ID_REQUIRED)
    // One rule, one message: `chatIdError` is what the list, the banner and
    // the server all phrase their refusal from.
    .test("telegram-group-chat-id", TELEGRAM_GROUP_MESSAGES.CHAT_ID_FORMAT, function (value) {
      const message = chatIdError(value);
      return message ? this.createError({ message }) : true;
    }),
  category: Yup.string()
    .required("Category is required")
    .oneOf(TELEGRAM_GROUP_CATEGORIES, "Category is not supported"),
  used_for: Yup.string().trim().required("Used For is required").max(255),
  outlet_id: Yup.mixed().nullable(),
  bot_is_admin: Yup.string().required("Bot Is Admin is required").oneOf(["1", "0"]),
  is_active: Yup.string().required("Status is required").oneOf(["Active", "Inactive"]),
});

const EMPTY = {
  group_name: "",
  chat_id: "",
  category: "",
  used_for: "",
  outlet_id: "",
  bot_is_admin: "",
  // A group somebody is registering is one they are about to use.
  is_active: "Active",
};

const YES_NO = [
  { id: "1", value: "Yes" },
  { id: "0", value: "No" },
];

/** The derived type, and the warnings, for whatever is currently in the form. */
function GroupTypeNotice({ chatId, botIsAdmin }) {
  const type = deriveGroupType(chatId);
  const showBotWarning = botIsAdmin === "0" || botIsAdmin === false;
  return (
    <Stack spacing={3} mb={4}>
      {type ? (
        <Flex align="center" gap={2}>
          <Text fontSize="sm" color="gray.600">
            Group Type:
          </Text>
          <Badge colorScheme={type === GROUP_TYPE.SUPERGROUP ? "green" : "orange"}>{type}</Badge>
          <Text fontSize="xs" color="gray.500">
            derived from the Chat ID - nothing to choose
          </Text>
        </Flex>
      ) : null}
      {type === GROUP_TYPE.BASIC_GROUP ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          {TELEGRAM_GROUP_MESSAGES.BASIC_GROUP_WARNING} You can still save it.
        </Alert>
      ) : null}
      {showBotWarning ? (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          {TELEGRAM_GROUP_MESSAGES.BOT_NOT_ADMIN_WARNING} You can still save it.
        </Alert>
      ) : null}
    </Stack>
  );
}

/**
 * The guidance beside the form: what a Chat ID must look like, why the bot
 * needs to be an admin, and how to find the id in Telegram.
 *
 * It sits next to the fields rather than under them because it is reference
 * material somebody reads WHILE typing - underneath, it would be below the
 * fold on the one screen where it is needed. On a narrow screen it stacks
 * below the form, where it is still reachable.
 *
 * Read-only: nothing here is a control, and the rules it states are enforced
 * by the form and again by the server.
 */
function GuidancePanel({ onOpenGuide }) {
  return (
    <Stack spacing={4} flex="1" minW={{ xl: "320px" }} maxW={{ xl: "420px" }}>
      <Button
        size="sm"
        variant="outline"
        colorScheme="purple"
        onClick={onOpenGuide}
        leftIcon={<i className="fa-solid fa-circle-question" />}
        alignSelf="flex-start"
      >
        Full setup guide
      </Button>

      <Alert status="info" borderRadius="md" alignItems="flex-start" fontSize="sm">
        <AlertIcon />
        <Box>
          <Text fontWeight="600" mb={1}>
            Chat ID guidelines
          </Text>
          <UnorderedList spacing={1}>
            <ListItem>Must be a negative number, e.g. -1001234567890.</ListItem>
            <ListItem>A positive number is an individual user, not a group, and is rejected.</ListItem>
            <ListItem>IDs starting with -100 are supergroups (recommended).</ListItem>
            <ListItem>
              Other negative IDs are basic groups - accepted, but consider converting to a
              supergroup for invite links and member removal.
            </ListItem>
            <ListItem>No spaces, decimals or letters, and it must be unique.</ListItem>
          </UnorderedList>
        </Box>
      </Alert>

      <Alert status="warning" borderRadius="md" alignItems="flex-start" fontSize="sm">
        <AlertIcon />
        <Box>
          <Text fontWeight="600" mb={1}>
            Bot admin requirement
          </Text>
          <Text>
            Add the bot as an admin in the group. Groups where it is not an admin are saved
            and flagged, but cannot be used for member management.
          </Text>
        </Box>
      </Alert>

      <Alert status="success" borderRadius="md" alignItems="flex-start" fontSize="sm">
        <AlertIcon />
        <Box>
          <Text fontWeight="600" mb={1}>
            How to get the Chat ID
          </Text>
          <OrderedList spacing={1}>
            <ListItem>Add the bot to your Telegram group as an admin.</ListItem>
            <ListItem>Send any message in the group.</ListItem>
            <ListItem>Use a tool such as @userinfobot to read the group chat ID.</ListItem>
            <ListItem>Or check your existing bot integration logs.</ListItem>
          </OrderedList>
        </Box>
      </Alert>
    </Stack>
  );
}

export default function TelegramGroupMode() {
  const router = useRouter();
  const { mode, id } = router.query;
  const groupId = id ? parseInt(id, 10) : null;

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const canManage = usePermissions(["manage_telegram_groups"]);
  const { outlets } = useOutlets({ directory: true });
  const { group, loading } = useTelegramGroupById(groupId, {
    enabled: (editMode || viewMode) && !!groupId,
  });

  const [formInitialValues, setFormInitialValues] = useState(EMPTY);
  const [serverError, setServerError] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [detectOpen, setDetectOpen] = useState(false);
  const { detected, loading: detecting, error: detectError, detect } = useDetectedTelegramGroups();

  useEffect(() => {
    if (createMode) {
      setFormInitialValues(EMPTY);
      return;
    }
    if (group) {
      setFormInitialValues({
        group_name: group.group_name || "",
        chat_id: group.chat_id || "",
        category: group.category || "",
        used_for: group.used_for || "",
        outlet_id: group.outlet_id == null ? "" : String(group.outlet_id),
        bot_is_admin: group.bot_is_admin ? "1" : "0",
        is_active: group.is_active === false ? "Inactive" : "Active",
      });
    }
  }, [createMode, group]);

  const outletOptions = useMemo(
    () => [
      // Optional, and said so in words: a blank option reads as "not filled
      // in yet", which is a different thing from a company-wide group.
      { id: "", value: "All Outlets (no specific outlet)" },
      ...outlets.map((o) => ({ id: String(o.outlet_id), value: o.outlet_name })),
    ],
    [outlets]
  );

  const categoryOptions = useMemo(
    () => TELEGRAM_GROUP_CATEGORIES.map((c) => ({ id: c, value: c })),
    []
  );

  const handleSubmit = async (values) => {
    setServerError(null);
    const body = {
      group_name: values.group_name.trim(),
      // NOT trimmed: the Chat ID is sent exactly as validated. Trimming here
      // would repair a value the rule refuses - and that the server refuses
      // too - into one that saves, which is the mismatch this avoids.
      chat_id: String(values.chat_id),
      category: values.category,
      used_for: values.used_for.trim(),
      outlet_id: values.outlet_id === "" ? null : Number(values.outlet_id),
      bot_is_admin: values.bot_is_admin === "1",
      is_active: values.is_active === "Active",
    };

    try {
      if (createMode) {
        const res = await createTelegramGroup(body);
        const newId = res?.telegram_group_id;
        toast.success("Telegram group registered");
        router.push(
          newId
            ? `/master/telegram-groups/view?id=${newId}`
            : "/master/telegram-groups"
        );
        return;
      }
      if (editMode && groupId) {
        await updateTelegramGroup(groupId, body);
        toast.success("Telegram group updated");
        router.push("/master/telegram-groups");
      }
    } catch (err) {
      // The server's own sentence: it names the group a duplicate Chat ID is
      // already registered to, which a generic failure message would lose.
      const message = err?.message || "Could not save the Telegram group";
      setServerError(message);
      toast.error(message);
    }
  };

  if ((editMode || viewMode) && loading && !group) {
    return (
      <GlobalWrapper title="Telegram Group Registry" permissionKey={["view_telegram_groups"]}>
        <CustomContainer title="Loading..." filledHeader>
          <Flex py={4}>Loading...</Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((editMode || viewMode) && !loading && !group && groupId) {
    return (
      <GlobalWrapper title="Telegram Group Registry" permissionKey={["view_telegram_groups"]}>
        <CustomContainer title="Not found" filledHeader>
          <Flex py={4}>Telegram group not found.</Flex>
          <Button colorScheme="purple" onClick={() => router.push("/master/telegram-groups")}>
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode
    ? "View Telegram Group"
    : editMode
    ? "Edit Telegram Group"
    : "Add Telegram Group";

  return (
    <GlobalWrapper
      title={title}
      permissionKey={viewMode ? ["view_telegram_groups"] : ["manage_telegram_groups"]}
    >
      <CustomContainer title={title} filledHeader>
        <TelegramGroupSetupGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
        {!viewMode && !canManage ? (
          <Alert status="warning" fontSize="sm" mb={4}>
            <AlertIcon />
            You do not have permission to change the Telegram group registry.
          </Alert>
        ) : null}
        {serverError ? (
          <Alert status="error" fontSize="sm" mb={4}>
            <AlertIcon />
            {serverError}
          </Alert>
        ) : null}

        <Formik
          enableReinitialize
          initialValues={formInitialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit: formikSubmit, values, setFieldValue, isSubmitting }) => (
            <form onSubmit={formikSubmit}>
              {/* Detect Group: the Chat ID comes from Telegram itself rather
                  than from somebody reading it out of the logs. Nothing is
                  filled in until a group is explicitly selected. */}
              {!viewMode ? (
                <>
                  <DetectTelegramGroup
                    isOpen={detectOpen}
                    onClose={() => setDetectOpen(false)}
                    detected={detected}
                    loading={detecting}
                    error={detectError}
                    onRetry={detect}
                    willOverwrite={Boolean(values.group_name || values.chat_id)}
                    onSelect={(group) => {
                      setFieldValue("group_name", group.group_name);
                      setFieldValue("chat_id", group.chat_id);
                      setDetectOpen(false);
                      setServerError(null);
                      toast.success(`Using "${group.group_name}"`);
                    }}
                  />
                  <Flex
                    align={{ md: "center" }}
                    justify="space-between"
                    gap={3}
                    mb={4}
                    direction={{ base: "column", md: "row" }}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="purple.100"
                    bg="purple.50"
                    p={3}
                  >
                    <Text fontSize="sm" color="gray.700">
                      Add the Daily Needs bot to the group and send{" "}
                      <Code fontSize="xs">/setup</Code> there, then detect it
                      here instead of typing the Chat ID.
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      isDisabled={!canManage}
                      isLoading={detecting}
                      leftIcon={<i className="fa-solid fa-satellite-dish" />}
                      onClick={async () => {
                        setDetectOpen(true);
                        await detect();
                      }}
                      flexShrink={0}
                    >
                      Detect Group
                    </Button>
                  </Flex>
                </>
              ) : null}

              {/* Fields on the left, reference material on the right; it
                  stacks on a narrow screen. */}
              <Flex
                direction={{ base: "column", xl: "row" }}
                gap={{ base: 4, xl: 8 }}
                align="flex-start"
              >
                <Box flex="2" minW={0} w="100%">
              <div className={styles.inputContainer}>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Group Name *"
                    name="group_name"
                    type="text"
                    placeholder="e.g. Attendance Alerts"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Group Chat ID *"
                    name="chat_id"
                    type="text"
                    placeholder="-1001234567890"
                    editable={!viewMode}
                  />
                </div>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Category *"
                    name="category"
                    type="text"
                    method="switch"
                    values={categoryOptions}
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Used For *"
                    name="used_for"
                    type="text"
                    placeholder="e.g. Daily missing-punch alerts"
                    editable={!viewMode}
                  />
                </div>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Outlet"
                    name="outlet_id"
                    type="text"
                    method="switch"
                    values={outletOptions}
                    editable={!viewMode}
                    // A group with no outlet reads as "All Outlets", not the
                    // "N/A" the read-only renderer shows for an empty value.
                    {...(viewMode ? { value: displayOutlet(group) } : {})}
                  />
                  <CustomInput
                    label="Bot Is Admin *"
                    name="bot_is_admin"
                    type="text"
                    method="switch"
                    values={YES_NO}
                    editable={!viewMode}
                  />
                </div>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Status *"
                    name="is_active"
                    type="text"
                    method="switch"
                    values={STATUS_OPTIONS}
                    editable={!viewMode}
                  />
                  {/* Keeps the last row two columns wide so Status lines up
                      with the fields above it rather than stretching. */}
                  <div style={{ width: "100%" }} />
                </div>
              </div>

              <GroupTypeNotice chatId={values.chat_id} botIsAdmin={values.bot_is_admin} />
                </Box>

                {/* The guidance is for somebody filling the form in, so it is
                    not shown on the read-only view. */}
                {!viewMode ? <GuidancePanel onOpenGuide={() => setGuideOpen(true)} /> : null}
              </Flex>

              <div className={styles.buttonContainer}>
                {viewMode ? (
                  <>
                    {canManage && groupId ? (
                      <Button
                        variant="outline"
                        colorScheme="purple"
                        onClick={() =>
                          router.push(`/master/telegram-groups/edit?id=${groupId}`)
                        }
                      >
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      colorScheme="purple"
                      onClick={() => router.push("/master/telegram-groups")}
                    >
                      Back
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => router.push("/master/telegram-groups")}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      colorScheme="purple"
                      isLoading={isSubmitting}
                      // A Basic Group and a non-admin bot are BOTH saveable;
                      // only a Chat ID that is not a group id stops this.
                      isDisabled={!canManage || !isValidGroupChatId(values.chat_id)}
                    >
                      {createMode ? "Create" : "Update"}
                    </Button>
                  </>
                )}
              </div>
            </form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}
