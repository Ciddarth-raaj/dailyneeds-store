import React from "react";
import { Box, SimpleGrid, Text, Tooltip } from "@chakra-ui/react";
import { CARDS, formatMinutes, ratePercent, rateCounts, rateDetail, tone } from "../../../util/attendanceDashboard";

/**
 * The six top cards: Total, Checked In, Not Yet Checked In, Absent, Need
 * Action, OT Requests Pending.
 *
 * EACH CARD IS A BUTTON, and opens the drilldown for exactly what it counted -
 * a number you cannot get behind is a number nobody can act on. The server
 * re-derives that list from the same population under the same filters, so the
 * list can never disagree with the count on the card.
 *
 * SIX DIFFERENTLY COLOURED CARDS, with the meaning fixed in
 * `util/attendanceDashboard.js`: green is a check-in, red a settled absence,
 * amber and orange the states waiting on somebody, purple the OT claim, navy
 * the plain headcount. Compact by design - a tall card row pushes the panels
 * that carry the actual detail below the fold.
 *
 * A CARD SHOWS WHAT IT IS WITHHOLDING. While the attendance day is open,
 * Absent is not a fact yet, so instead of a misleading 0 the card says so and
 * is not clickable. The same honesty the API applies, carried into the UI.
 *
 * TWO COLUMNS ON A PHONE, six across on the desktop - the approved layout.
 */
function Card({ card, value, sub, detail, onOpen, disabled, disabledNote }) {
  const t = tone(card.color);
  const clickable = !disabled && typeof onOpen === "function";
  return (
    <Tooltip label={disabled ? disabledNote : detail || card.help} placement="bottom" hasArrow openDelay={300}>
      <Box
        as={clickable ? "button" : "div"}
        type={clickable ? "button" : undefined}
        onClick={clickable ? onOpen : undefined}
        aria-label={clickable ? `Show ${card.label}` : card.label}
        textAlign="left"
        w="100%"
        px={3}
        py={2}
        borderWidth="1px"
        borderRadius="md"
        borderColor={t.border}
        bg={disabled ? "gray.50" : t.bg}
        opacity={disabled ? 0.7 : 1}
        cursor={clickable ? "pointer" : "default"}
        _hover={clickable ? { boxShadow: "sm", borderColor: t.chart } : undefined}
      >
        <Text
          fontSize="xl"
          fontWeight="700"
          lineHeight="short"
          color={disabled ? "gray.500" : t.fg}
          isTruncated
        >
          {disabled ? "—" : value}
        </Text>
        <Text fontSize="xs" color="gray.700" fontWeight="600" noOfLines={1}>
          {card.label}
        </Text>
        {sub ? (
          <Text fontSize="10px" color="gray.500" noOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </Box>
    </Tooltip>
  );
}

export default function DashboardCards({ cards, isOpenDay, onOpenBucket }) {
  if (!cards) return null;

  const valueFor = (key) => Number(cards[key] && cards[key].count) || 0;

  const subFor = (key) => {
    const card = cards[key];
    if (!card) return null;
    if (key === "checked_in") {
      return `${ratePercent(card.rate)} · ${rateCounts(card.rate)}`;
    }
    if (key === "ot_requests_pending") {
      // The engine's own hours for the pending requests, beside the count.
      return `${formatMinutes(card.minutes)} · ${Number(card.employees) || 0} staff`;
    }
    if (key === "need_action") {
      const top = (card.by_issue || []).filter((i) => Number(i.count) > 0);
      return top.length ? top.map((i) => `${i.label} ${i.count}`).join(" · ") : "Nothing outstanding";
    }
    return null;
  };

  const detailFor = (key) => (key === "checked_in" ? rateDetail(cards[key] && cards[key].rate) : null);

  return (
    <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={2}>
      {CARDS.map((card) => {
        // ABSENT is withheld on an open day, because it is not yet a fact.
        const withheld = isOpenDay && card.key === "absent";
        return (
          <Card
            key={card.key}
            card={card}
            value={valueFor(card.key)}
            sub={withheld ? "Pending day close" : subFor(card.key)}
            detail={detailFor(card.key)}
            disabled={withheld}
            disabledNote="This attendance day is still open. Confirmed absence is reported only once it has closed under each employee's own shift cutoff."
            onOpen={() => onOpenBucket(card.bucket)}
          />
        );
      })}
    </SimpleGrid>
  );
}
