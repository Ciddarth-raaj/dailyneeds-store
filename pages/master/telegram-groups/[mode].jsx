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
  Stack,
  Text,
} from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { TelegramGroupSetupSteps } from "../../../components/master/TelegramGroupSetupGuide";
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
  // Both are TOGGLES, so the form value is already the boolean the API
  // wants. `required` would reject a legitimate `false`, so the rule is
  // "must be a boolean", not "must be truthy".
  bot_is_admin: Yup.boolean().typeError("Bot Is Admin is required").required("Bot Is Admin is required"),
  is_active: Yup.boolean().typeError("Status is required").required("Status is required"),
});

const EMPTY = {
  group_name: "",
  chat_id: "",
  category: "",
  used_for: "",
  outlet_id: "",
  // OFF until somebody says otherwise: claiming the bot is an admin when
  // nobody has checked is the one wrong default here, and the list flags
  // the row so a mistaken No is visible rather than silent.
  bot_is_admin: false,
  // A group somebody is registering is one they are about to use.
  is_active: true,
};

/**
 * The derived type, and the warnings, for whatever is currently in the form.
 *
 * BOTH WARNINGS WAIT UNTIL THEY MEAN SOMETHING. The type notice needs a Chat
 * ID to derive anything from, and the bot warning is held back until there
 * is one too: Bot Is Admin now starts OFF, so without that gate an untouched
 * Add form would open with a red warning about a group nobody has named yet.
 * A warning that is always on is a warning nobody reads.
 */
function GroupTypeNotice({ chatId, botIsAdmin }) {
  const type = deriveGroupType(chatId);
  const hasChatId = Boolean(String(chatId === undefined || chatId === null ? "" : chatId).length);
  const showBotWarning = hasChatId && botIsAdmin === false;
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
        bot_is_admin: Boolean(group.bot_is_admin),
        is_active: group.is_active !== false,
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
      // Already booleans - the toggles hold exactly what the API expects,
      // so nothing is translated on the way out.
      bot_is_admin: Boolean(values.bot_is_admin),
      is_active: Boolean(values.is_active),
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
              {/* THE GUIDE IS THE PAGE'S MAIN INSTRUCTION, and it is on the
                  page rather than behind a button: the people who need it
                  are setting up their first group, and a guide you have to
                  know to ask for is a guide they never see. Create only -
                  Edit is changing a group that is already set up. */}
              {createMode ? (
                <Box
                  mb={6}
                  p={{ base: 4, md: 5 }}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor="gray.200"
                  bg="gray.50"
                  maxW="640px"
                >
                  <Text fontWeight="600" mb={4}>
                    Setup guide
                  </Text>
                  <TelegramGroupSetupSteps compact />
                </Box>
              ) : null}

              {/* Detect Group: the Chat ID comes from Telegram itself rather
                  than from somebody reading it out of the logs. Nothing is
                  filled in until a group is explicitly selected.

                  CREATE ONLY, not `!viewMode`. On Edit this is the identity
                  of a registry row that already exists, and selecting a
                  detected group there would silently repoint an existing
                  record at a different Telegram group - the row would keep
                  its category, purpose and history while pointing somewhere
                  else entirely. Changing which group a record refers to is
                  deleting it and registering the other one. */}
              {createMode ? (
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
                      Send <Code fontSize="xs">/setup</Code> in your Telegram
                      group first, then click Detect Group.
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

              {/* SINGLE COLUMN, in the order the guide names them. The
                  two-column grid packed related fields side by side and made
                  the form read as a dense grid rather than a sequence of
                  questions; one field per row is slower to scan and far
                  easier to fill in correctly. */}
              <Stack spacing={0} maxW="640px">
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
                {/* Two-state answers, so the repo's switch_toggle rather
                    than a dropdown. The value IS the boolean the API wants,
                    so nothing is translated on save. */}
                <CustomInput
                  label="Bot Is Admin *"
                  name="bot_is_admin"
                  method="switch_toggle"
                  onLabel="Yes"
                  offLabel="No"
                  editable={!viewMode}
                />
                <CustomInput
                  label="Status *"
                  name="is_active"
                  method="switch_toggle"
                  onLabel="Active"
                  offLabel="Inactive"
                  editable={!viewMode}
                />
              </Stack>

              {/* Contextual only: these appear when the entered Chat ID is
                  actually a Basic Group, or Bot Is Admin is actually No. */}
              <GroupTypeNotice chatId={values.chat_id} botIsAdmin={values.bot_is_admin} />

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
