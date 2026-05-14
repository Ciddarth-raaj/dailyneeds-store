import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomModal from "../CustomModal";
import {
  postTaxpayerOtpRequest,
  postTaxpayerOtpVerify,
  postTaxpayerRevalidate,
} from "../../helper/gstTaxpayer";

/**
 * GST portal OTP flow (request → enter OTP → verify or revalidate).
 * Reusable from the GST module wrapper (auto) or any page (manual).
 *
 * @param {"verify" | "revalidate"} submitMode - which POST endpoint to use for OTP submission.
 * @param {boolean} autoRequestOtp - when the modal opens, automatically POST otp/request once.
 */
export default function GstTaxpayerOtpModal({
  isOpen,
  onClose,
  onSuccess,
  title = "GST portal OTP",
  submitMode = "revalidate",
  autoRequestOtp = false,
  initialMessage,
}) {
  const [otp, setOtp] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autoRequestedRef = useRef(false);

  const resetLocal = useCallback(() => {
    setOtp("");
    setRequesting(false);
    setSubmitting(false);
    autoRequestedRef.current = false;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetLocal();
      return;
    }
    if (!autoRequestOtp || autoRequestedRef.current) return;
    autoRequestedRef.current = true;
    let cancelled = false;
    (async () => {
      setRequesting(true);
      try {
        const { httpStatus, data } = await postTaxpayerOtpRequest();
        if (cancelled) return;
        if (httpStatus >= 200 && httpStatus < 300 && data?.code === 200) {
          toast.success("OTP sent to the registered GST portal contact.");
        } else {
          toast.error(
            data?.msg ||
              `Could not send OTP (HTTP ${httpStatus}). Try “Send OTP” again.`
          );
        }
      } catch (e) {
        if (!cancelled) toast.error(e?.message || "Failed to request OTP");
      } finally {
        if (!cancelled) setRequesting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, autoRequestOtp, resetLocal]);

  const handleRequestOtp = async () => {
    setRequesting(true);
    try {
      const { httpStatus, data } = await postTaxpayerOtpRequest();
      if (httpStatus >= 200 && httpStatus < 300 && data?.code === 200) {
        toast.success("OTP sent.");
      } else {
        toast.error(
          data?.msg || `Could not send OTP (HTTP ${httpStatus}).`
        );
      }
    } catch (e) {
      toast.error(e?.message || "Failed to request OTP");
    } finally {
      setRequesting(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = String(otp).trim();
    if (!/^[0-9]{4,10}$/.test(trimmed)) {
      toast.error("Enter a valid OTP (4–10 digits).");
      return;
    }
    setSubmitting(true);
    try {
      const fn =
        submitMode === "verify"
          ? postTaxpayerOtpVerify
          : postTaxpayerRevalidate;
      const { httpStatus, data } = await fn(trimmed);
      if (httpStatus >= 200 && httpStatus < 300 && data?.code === 200) {
        toast.success("GST portal session updated.");
        onSuccess?.(data?.session ?? null);
        onClose?.();
        resetLocal();
      } else {
        toast.error(
          data?.msg || data?.sandbox?.message || `Verification failed (HTTP ${httpStatus}).`
        );
      }
    } catch (e) {
      toast.error(e?.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" mr={3} onClick={onClose}>
        Cancel
      </Button>
      <Button
        colorScheme="purple"
        onClick={handleSubmit}
        isLoading={submitting}
        isDisabled={requesting}
      >
        {submitMode === "verify" ? "Verify OTP" : "Revalidate session"}
      </Button>
    </>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="md"
    >
      <VStack align="stretch" spacing={4}>
        {initialMessage ? (
          <Text fontSize="sm" color="gray.700">
            {initialMessage}
          </Text>
        ) : null}
        <Text fontSize="sm" color="gray.600">
          Use the OTP sent to your GST portal–registered mobile/email. Request
          a new OTP if needed, then enter the code below.
        </Text>
        <Button
          colorScheme="teal"
          variant="outline"
          size="sm"
          onClick={handleRequestOtp}
          isLoading={requesting}
          alignSelf="flex-start"
        >
          Send OTP
        </Button>
        <FormControl>
          <FormLabel fontSize="sm">OTP</FormLabel>
          <Input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            maxLength={10}
            autoComplete="one-time-code"
          />
        </FormControl>
      </VStack>
    </CustomModal>
  );
}
