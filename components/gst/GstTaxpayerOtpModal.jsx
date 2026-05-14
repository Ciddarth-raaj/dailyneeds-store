import React, { useCallback, useEffect, useState } from "react";
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
 * Reusable from the GST module wrapper or any page. OTP is sent only when the user taps "Send OTP".
 *
 * @param {"verify" | "revalidate"} submitMode - which POST endpoint to use for OTP submission.
 */
export default function GstTaxpayerOtpModal({
  isOpen,
  onClose,
  onSuccess,
  title = "GST portal OTP",
  submitMode = "revalidate",
  initialMessage,
}) {
  const [otp, setOtp] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetLocal = useCallback(() => {
    setOtp("");
    setRequesting(false);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetLocal();
    }
  }, [isOpen, resetLocal]);

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
          Tap <strong>Send OTP</strong> to receive a code on your GST
          portal–registered mobile or email. Then enter the code below.
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
