import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Alert, AlertIcon, Badge, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
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
});

const EMPTY = {
  group_name: "",
  chat_id: "",
  category: "",
  used_for: "",
  outlet_id: "",
  bot_is_admin: "",
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
          {({ handleSubmit: formikSubmit, values, isSubmitting }) => (
            <form onSubmit={formikSubmit}>
              <Flex flexDirection="column" gap={4} mb={2}>
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
                />
                <CustomInput
                  label="Bot Is Admin *"
                  name="bot_is_admin"
                  type="text"
                  method="switch"
                  values={YES_NO}
                  editable={!viewMode}
                />
              </Flex>

              <GroupTypeNotice chatId={values.chat_id} botIsAdmin={values.bot_is_admin} />

              {viewMode ? (
                <Flex direction="column" gap={1} mb={4} fontSize="sm" color="gray.600">
                  <Text>Outlet: {displayOutlet(group)}</Text>
                </Flex>
              ) : null}

              <Flex gap={3} justify="flex-end" mt={6}>
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
              </Flex>
            </form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}
