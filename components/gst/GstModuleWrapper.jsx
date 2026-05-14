import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import GstTaxpayerOtpModal from "./GstTaxpayerOtpModal";
import { getTaxpayerSessionCheck } from "../../helper/gstTaxpayer";

const CHECK_INTERVAL_MS = 3 * 60 * 1000;

const defaultCtx = {
  openOtpModal: () => {},
};

export const GstTaxpayerUiContext = createContext(defaultCtx);

const defaultOtpOptions = {
  title: "GST portal OTP",
  submitMode: "revalidate",
  autoRequestOtp: false,
  initialMessage: "",
};

/**
 * Wraps GST module pages: one shared OTP modal + session checks.
 * Use `useGstTaxpayerUi()` from children to open the same modal (e.g. Revalidate on GST Portal).
 */
export default function GstModuleWrapper({ children }) {
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpOptions, setOtpOptions] = useState(defaultOtpOptions);
  const otpModalOpenRef = useRef(false);
  const onSuccessExtraRef = useRef(null);

  useEffect(() => {
    otpModalOpenRef.current = otpModalOpen;
  }, [otpModalOpen]);

  const openOtpModal = useCallback((opts = {}) => {
    const { onSuccessExtra, ...rest } = opts;
    onSuccessExtraRef.current =
      typeof onSuccessExtra === "function" ? onSuccessExtra : null;
    setOtpOptions({ ...defaultOtpOptions, ...rest });
    setOtpModalOpen(true);
  }, []);

  const closeOtpModal = useCallback(() => {
    setOtpModalOpen(false);
    setOtpOptions(defaultOtpOptions);
    onSuccessExtraRef.current = null;
  }, []);

  const evaluateCheck = useCallback(async () => {
    try {
      const { httpStatus, data } = await getTaxpayerSessionCheck();
      if (
        httpStatus === 428 &&
        data?.requires_gst_taxpayer_otp &&
        !otpModalOpenRef.current
      ) {
        openOtpModal({
          title: "Renew GST portal session",
          submitMode: "revalidate",
          autoRequestOtp: true,
          initialMessage:
            data?.msg ||
            "Your GST portal session must be renewed with OTP (day 29 or policy).",
        });
      }
    } catch (_e) {
      /* ignore */
    }
  }, [openOtpModal]);

  useEffect(() => {
    evaluateCheck();
  }, [evaluateCheck]);

  useEffect(() => {
    const id = setInterval(evaluateCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [evaluateCheck]);

  const ctxValue = useMemo(
    () => ({
      openOtpModal,
    }),
    [openOtpModal]
  );

  return (
    <GstTaxpayerUiContext.Provider value={ctxValue}>
      {children}
      <GstTaxpayerOtpModal
        isOpen={otpModalOpen}
        onClose={closeOtpModal}
        onSuccess={(session) => {
          try {
            onSuccessExtraRef.current?.(session);
          } finally {
            onSuccessExtraRef.current = null;
          }
          evaluateCheck();
        }}
        title={otpOptions.title}
        submitMode={otpOptions.submitMode}
        autoRequestOtp={otpOptions.autoRequestOtp}
        initialMessage={otpOptions.initialMessage}
      />
    </GstTaxpayerUiContext.Provider>
  );
}

export function useGstTaxpayerUi() {
  return useContext(GstTaxpayerUiContext);
}
