import { useEffect, useState } from "react";
import UserIpRestrictionHelper from "../helper/userIpRestriction";

/**
 * The address this browser reaches the API from, plus whether to trust it.
 *
 * `proxyBroken` is true when the API sees a loopback address: that is the
 * server talking to itself, which means the reverse proxy is not forwarding
 * the client IP, and no allow-list built from it would work. Screens use it
 * to show an error instead of offering the address.
 */
export default function useMyIp() {
  const [myIp, setMyIp] = useState("");
  const [ipDiagnostic, setIpDiagnostic] = useState(null);

  useEffect(() => {
    let cancelled = false;
    UserIpRestrictionHelper.getMyIp()
      .then((info) => {
        if (cancelled) return;
        setMyIp(info?.ip || "");
        setIpDiagnostic(info || null);
      })
      .catch(() => {
        if (cancelled) return;
        setMyIp("");
        setIpDiagnostic(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    myIp,
    ipDiagnostic,
    proxyBroken: ipDiagnostic?.isLoopback === true,
  };
}
