import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Alert, AlertIcon, Button, Stack, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import DeviceForm, { toApiDateTime } from "../../../components/attendance/DeviceForm";
import useOutlets from "../../../customHooks/useOutlets";
import { displayDateTime } from "../../../util/attendanceRaw";
import AttendanceHelper from "../../../helper/attendance";
import { registerPrefill } from "../../../util/biomaxRegisterPrefill";

/**
 * Add Device. Also the landing page for "Register" from the unregistered
 * list: `?dev_id=` fills the Cloud ID and `?first_punch=` suggests Effective
 * From, so the administrator sees which quarantined punches will be covered
 * and can move the date if they should not be.
 *
 * `first_punch` IS ALREADY IST AND IS NOT CONVERTED. It comes from
 * biomax_punch.io_time, which is the terminal's own clock; the devices are
 * set to Indian time and the receiver stores the 14-digit string through
 * MySQL's STR_TO_DATE without ever building a JS Date
 * (docs/biomax-attendance-part1.md R3). Passing it through an IST
 * conversion - as the machine timestamps on the Devices screen need - would
 * push it forward another 5:30 and pre-fill Effective From to a time the
 * device never punched at. The value is only reshaped from
 * 'YYYY-MM-DD HH:MM:SS' to what `datetime-local` binds to, and the banner
 * shows the same wall clock the administrator sees in the unregistered list.
 */
export default function NewBiomaxDevicePage() {
  const router = useRouter();
  const toast = useToast();
  const { outlets } = useOutlets({ directory: true });
  const [value, setValue] = useState({ dev_id: "", label: "", outlet_id: "", effective_from: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { dev_id, first_punch } = router.query;
    setValue((v) => ({
      ...v,
      dev_id: dev_id ? String(dev_id) : v.dev_id,
      effective_from: first_punch ? registerPrefill(first_punch) : v.effective_from,
    }));
  }, [router.isReady, router.query]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await AttendanceHelper.createDevice({
        dev_id: value.dev_id.trim(),
        label: value.label.trim(),
        notes: value.notes || "",
        outlet_id: Number(value.outlet_id),
        effective_from: toApiDateTime(value.effective_from),
      });
      if (res && res.code === 200) {
        toast({ title: "Device registered", status: "success", duration: 3000 });
        router.push(`/attendance/devices/${res.biomax_device_id}`);
      } else {
        setError((res && res.msg) || "Could not register the device");
      }
    } catch (err) {
      console.log(err);
      setError("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlobalWrapper title="Add Biomax Device" permissionKey={["manage_biomax_devices"]}>
      <CustomContainer title="Add Device" subtitle="A new terminal, with its first location period." filledHeader>
        {router.query && router.query.first_punch ? (
          <Alert status="info" fontSize="sm" mb={4}>
            <AlertIcon />
            This Cloud ID has already sent punches, the first at {displayDateTime(String(router.query.first_punch))} (the terminal's own clock, IST). Effective From is pre-filled to cover them; punches before it stay held as inactive.
          </Alert>
        ) : null}
        {error ? (
          <Alert status="error" fontSize="sm" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        ) : null}
        <DeviceForm value={value} onChange={setValue} outlets={outlets} />
        <Stack direction="row" spacing={3} mt={6}>
          <Button colorScheme="purple" onClick={save} isLoading={saving} isDisabled={!value.dev_id || !value.label || !value.outlet_id || !value.effective_from}>
            Register Device
          </Button>
          <Button variant="ghost" onClick={() => router.push("/attendance/devices")}>Cancel</Button>
        </Stack>
      </CustomContainer>
    </GlobalWrapper>
  );
}
