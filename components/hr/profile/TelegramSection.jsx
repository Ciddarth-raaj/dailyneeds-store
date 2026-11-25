import React from "react";
import { SectionCard } from "./SectionCard";
import TelegramSetupPanel from "../TelegramSetupPanel";

/**
 * The employee's Telegram, on their profile.
 *
 * A THIN CARD OVER THE SHARED PANEL. Every decision - which statuses exist,
 * what they are called, when polling stops, that the raw link is never
 * printed, that Change Telegram does not disconnect first - lives in
 * `components/hr/TelegramSetupPanel.jsx` and `util/employeeTelegram.js`. This
 * file is the frame around it, so Employee Master and the Add Employee wizard
 * cannot end up with two different Telegram screens.
 *
 * IT IS THE SECONDARY ACTION POINT. The Add Employee wizard is where a new
 * hire's Telegram is set up while they are standing there; this is where the
 * ~200 existing employees get theirs, and where a manager comes back to after
 * correcting a mobile number.
 *
 * NO EDIT MODE OF ITS OWN. `SectionCard`'s edit/save affordance is for
 * sections that write employee columns; this one writes none. Its actions are
 * inside the panel, each gated on the same rights the server enforces.
 */
function TelegramSection({
  employeeId,
  employeeName,
  outletName,
  canView = true,
  canManage = false,
  onEditMobile = null,
}) {
  return (
    <SectionCard
      title="Telegram"
      subtitle="Connect the employee's own Telegram account so Daily Needs can reach them."
      canView={canView}
      deniedMessage="You do not have permission to view this employee's Telegram status."
    >
      <TelegramSetupPanel
        employeeId={employeeId}
        employeeName={employeeName}
        outletName={outletName}
        canManage={canManage}
        onEditMobile={onEditMobile}
        compact
      />
    </SectionCard>
  );
}

export default TelegramSection;
