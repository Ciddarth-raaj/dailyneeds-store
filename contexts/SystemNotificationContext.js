import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Button, CloseButton, Flex, Text } from "@chakra-ui/react";
import axiosInstance from "../util/api";
import { triggerLocalNotification } from "../util/triggerLocalNotification";

const SystemNotificationContext = createContext(null);

const CURSOR_STORAGE_KEY = "SystemNotificationCursor";
const DISMISS_PROMPT_KEY = "SystemNotificationPromptDismissed";
const DEFAULT_POLL_MS = 15000;

function getPullPath() {
  return process.env.NEXT_PUBLIC_NOTIFICATIONS_PULL_PATH || "/notifications/pull";
}

function getAckPath() {
  return process.env.NEXT_PUBLIC_NOTIFICATIONS_ACK_PATH || "/notifications/ack";
}

function normalizeResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  return [];
}

function safeCursorFromEvent(item) {
  return item?.id || item?._id || item?.created_at || item?.createdAt || null;
}

function readNotificationSupport() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readNotificationPermission() {
  if (!readNotificationSupport()) return "denied";
  return Notification.permission;
}

/** Bottom banner: explicit opt-in (user gesture) as soon as permission is still "default". */
function LandingNotificationPrompt() {
  const ctx = useContext(SystemNotificationContext);
  const [visible, setVisible] = useState(false);

  const isSupported = ctx?.isSupported;
  const permission = ctx?.permission;
  const requestPermission = ctx?.requestPermission;

  useEffect(() => {
    if (typeof window === "undefined" || !ctx) return;
    if (!isSupported) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISS_PROMPT_KEY) === "1") return;
    setVisible(true);
  }, [ctx, isSupported]);

  useEffect(() => {
    if (!ctx) return;
    if (permission !== "default") {
      setVisible(false);
    }
  }, [ctx, permission]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_PROMPT_KEY, "1");
    setVisible(false);
  }, []);

  const handleEnable = useCallback(async () => {
    if (requestPermission) {
      await requestPermission();
    }
    setVisible(false);
  }, [requestPermission]);

  if (!ctx || !visible || !isSupported) return null;

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      zIndex="popover"
      maxW="20rem"
      px={3}
      py={2.5}
      bg="gray.900"
      color="white"
      boxShadow="lg"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="md"
    >

      <CloseButton
        size="sm"
        onClick={handleDismiss}
        color="whiteAlpha.700"
        style={{ position: "absolute", top: "2px", right: "2px" }}
      />

      <Text fontWeight="semibold" fontSize="xs">
        Stay updated
      </Text>
      <Text fontSize="xs" opacity={0.85} mt={1} lineHeight="short">
        Enable notifications for alerts while you use DailyNeeds.
      </Text>
      <Flex gap={2} mt={3} flexWrap="wrap" justify="flex-end">
        <Button
          size="xs"
          variant="ghost"
          color="whiteAlpha.900"
          onClick={handleDismiss}
        >
          Not now
        </Button>
        <Button size="xs" colorScheme="purple" onClick={handleEnable}>
          Enable
        </Button>
      </Flex>
    </Box>
  );
}

export function SystemNotificationProvider({ children }) {
  const [permission, setPermission] = useState("default");
  const [isSupported, setIsSupported] = useState(false);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const seenInSession = useRef(new Set());
  const pollingRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = readNotificationSupport();
    setIsSupported(supported);
    if (supported) {
      setPermission(readNotificationPermission());
    } else {
      setPermission("denied");
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    setIsSupported(true);
    return result;
  }, []);

  /** Call from a click handler if you need to prompt outside the landing banner. */
  const requestPermissionIfNeeded = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    if (Notification.permission !== "default") return Notification.permission;
    return requestPermission();
  }, [requestPermission]);

  const markAsDelivered = useCallback(async (notificationIds = []) => {
    if (!notificationIds.length) return;
    try {
      await axiosInstance.post(getAckPath(), { ids: notificationIds });
    } catch (error) {
      console.error("Failed to acknowledge notifications", error);
    }
  }, []);

  const fetchAndNotify = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("Token");
    if (!token) return;

    try {
      const cursor = localStorage.getItem(CURSOR_STORAGE_KEY);
      const response = await axiosInstance.get(getPullPath(), {
        params: {
          after: cursor || undefined,
          limit: 30,
        },
      });

      const notifications = normalizeResponse(response);
      if (!notifications.length) return;

      const deliveredIds = [];
      const incoming = [];
      for (const item of notifications) {
        const id = item?.id || item?._id || `${item?.title}-${item?.created_at}`;
        if (!id || seenInSession.current.has(id)) continue;
        seenInSession.current.add(id);
        incoming.push(item);
        deliveredIds.push(id);
        triggerLocalNotification(item, { shouldToastFallback: true });
      }

      if (incoming.length) {
        setLatestNotifications((prev) => [...incoming, ...prev].slice(0, 50));
        const lastCursor = safeCursorFromEvent(notifications[notifications.length - 1]);
        if (lastCursor) {
          localStorage.setItem(CURSOR_STORAGE_KEY, String(lastCursor));
        }
      }

      if (deliveredIds.length) {
        markAsDelivered(deliveredIds);
      }
    } catch (error) {
      // Silence polling errors in UI. Missing endpoint should not block app usage.
      if (error?.response?.status && error.response.status < 500) return;
      console.error("Notification polling failed", error);
    }
  }, [markAsDelivered]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const intervalMs = Number(process.env.NEXT_PUBLIC_NOTIFICATIONS_POLL_MS) || DEFAULT_POLL_MS;

    fetchAndNotify();
    pollingRef.current = window.setInterval(fetchAndNotify, intervalMs);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchAndNotify]);

  const value = useMemo(
    () => ({
      isSupported,
      permission,
      requestPermission,
      requestPermissionIfNeeded,
      showSystemNotification: triggerLocalNotification,
      triggerLocalNotification,
      latestNotifications,
      refreshNotifications: fetchAndNotify,
    }),
    [
      isSupported,
      permission,
      requestPermission,
      requestPermissionIfNeeded,
      latestNotifications,
      fetchAndNotify,
    ]
  );

  return (
    <SystemNotificationContext.Provider value={value}>
      {children}
      <LandingNotificationPrompt />
    </SystemNotificationContext.Provider>
  );
}

export function useSystemNotifications() {
  const context = useContext(SystemNotificationContext);
  if (!context) {
    throw new Error(
      "useSystemNotifications must be used within SystemNotificationProvider"
    );
  }
  return context;
}
