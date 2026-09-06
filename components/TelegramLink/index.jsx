import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Button,
  Flex,
  Link,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";

import CustomModal from "../CustomModal";
import UserHelper from "../../helper/user";

/**
 * Link a Telegram account so a forgotten password can be reset.
 *
 * The deep link is the whole mechanism: opening it in Telegram makes the bot
 * receive a `/start` carrying a secret only this signed-in session was given,
 * which is what proves the chat belongs to this user. Typing an @username
 * would prove nothing, so the screen never asks for one.
 *
 * Linking completes on the server a moment later, when the poller next runs,
 * so this re-checks rather than claiming success the instant the link opens.
 */
function TelegramLinkModal({ isOpen, onClose }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await UserHelper.getTelegramLink());
    } catch (err) {
      toast.error(err?.message || "Could not read Telegram status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setLink(null);
      return;
    }
    load();
  }, [isOpen, load]);

  const generate = async () => {
    setBusy(true);
    try {
      const data = await UserHelper.startTelegramLink();
      setLink(data.link);
    } catch (err) {
      toast.error(err?.message || "Could not start linking");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      await UserHelper.unlinkTelegram();
      toast.success("Telegram unlinked");
      setLink(null);
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not unlink");
    } finally {
      setBusy(false);
    }
  };

  const body = () => {
    if (loading) {
      return (
        <Flex justifyContent="center" py="20px">
          <Spinner color="purple.500" />
        </Flex>
      );
    }

    // Without a configured bot the deep link cannot be built at all; say so
    // rather than hand out a link that goes nowhere.
    if (status && !status.botConfigured) {
      return (
        <Alert status="warning" borderRadius="md" fontSize="13px">
          <AlertIcon />
          Telegram is not configured on this server yet. Ask an admin to set
          TELEGRAM_BOT_USERNAME.
        </Alert>
      );
    }

    return (
      <Stack spacing="14px">
        <Flex alignItems="center" gap="8px">
          <Text fontSize="14px">Status:</Text>
          <Badge colorScheme={status?.linked ? "green" : "gray"}>
            {status?.linked ? "Linked" : "Not linked"}
          </Badge>
          {status?.linked && status?.telegramUsername ? (
            <Text fontSize="13px" color="gray.600">
              @{status.telegramUsername}
            </Text>
          ) : null}
        </Flex>

        <Text fontSize="13px" color="gray.600">
          {status?.linked
            ? "If you forget your password, the reset code will be sent to this Telegram chat."
            : "Link Telegram so you can reset your own password if you ever forget it."}
        </Text>

        {link ? (
          <Alert status="info" borderRadius="md" fontSize="13px">
            <AlertIcon />
            <Stack spacing="6px">
              <Text>
                Open this link in Telegram and press Start. It is valid for 15
                minutes.
              </Text>
              <Link href={link} isExternal color="purple.600" fontWeight="600" wordBreak="break-all">
                {link}
              </Link>
              <Button
                size="xs"
                variant="outline"
                colorScheme="purple"
                alignSelf="flex-start"
                onClick={load}
              >
                I have pressed Start — check again
              </Button>
            </Stack>
          </Alert>
        ) : null}
      </Stack>
    );
  };

  const footer = () => {
    if (loading || (status && !status.botConfigured)) {
      return (
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      );
    }
    return (
      <>
        <Button variant="ghost" mr="10px" onClick={onClose} isDisabled={busy}>
          Close
        </Button>
        {status?.linked ? (
          <Button colorScheme="red" variant="outline" mr="10px" isLoading={busy} onClick={unlink}>
            Unlink
          </Button>
        ) : null}
        <Button colorScheme="purple" isLoading={busy} onClick={generate}>
          {status?.linked ? "Re-link" : "Get link"}
        </Button>
      </>
    );
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title="Link Telegram"
      size="sm"
      footer={footer()}
    >
      {body()}
    </CustomModal>
  );
}

export default TelegramLinkModal;
