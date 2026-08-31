import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Select,
  Spinner,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import offersV3Talker from "../../helper/offersV3Talker";

/**
 * 8 talkers to an A4 sheet: two columns, four rows, cut lines being the card
 * edges - no gutters to measure.
 *
 * 104 x 73mm rather than a full-bleed 105 x 74: two 105mm columns come to
 * exactly A4's 210mm width, and sub-pixel rounding then spills the row onto a
 * second page, so every sheet printed a blank one after it. The 2mm of slack
 * costs nothing - no printer reaches the paper edge anyway.
 */
const CARD_W = "104mm";
const CARD_H = "73mm";
const PER_SHEET = 8;

const STATUS_COLORS = { draft: "gray", published: "green" };

/** Sampled from public/assets/dnds-logo.png so print matches the brand mark. */
const BRAND_PURPLE = "#732f8d";
const BRAND_ORANGE = "#f15a22";

function cardKey(card) {
  return `${card.group_id}-${card.offer_type}-${card.value}`;
}

/**
 * One physical shelf talker. Sized in millimetres so it prints at the real
 * size regardless of screen DPI, and shown at that same size on screen so
 * what you preview is what comes out of the printer.
 */
function TalkerCard({ card }) {
  return (
    <div className="talker-card">
      <div className="talker-card-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="talker-logo" src="/assets/dnds-logo.png" alt="Daily Needs" />
        <div className="talker-title">{card.title}</div>
        {card.lead ? <div className="talker-lead">{card.lead}</div> : null}
        <div className="talker-headline">
          {card.big}
          {card.trail ? (
            <span className="talker-trail">{card.trail}</span>
          ) : null}
        </div>
        {card.subline ? (
          <div className="talker-subline">{card.subline}</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The print output itself, rendered into a portal on document.body. Everything
 * else on the page is a sidebar, a header or a control - hiding them for print
 * one by one is fragile, so print hides every body child except this one.
 */
function PrintSheets({ cards }) {
  const [host, setHost] = useState(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "talker-print-root";
    document.body.appendChild(el);
    setHost(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!host) return null;

  const sheets = [];
  for (let i = 0; i < cards.length; i += PER_SHEET) {
    sheets.push(cards.slice(i, i + PER_SHEET));
  }

  return ReactDOM.createPortal(
    <>
      {sheets.map((sheet, i) => (
        <div className="talker-sheet" key={i}>
          {sheet.map((card) => (
            <TalkerCard card={card} key={cardKey(card)} />
          ))}
        </div>
      ))}
    </>,
    host
  );
}

export default function TalkerPrint() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("published");
  const [groupType, setGroupType] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [syncText, setSyncText] = useState(true);
  const [printing, setPrinting] = useState(false);
  const touched = useRef(false);

  const load = useCallback(() => {
    setLoading(true);
    offersV3Talker.print
      .cards({
        ...(status ? { status } : {}),
        ...(groupType ? { group_type: groupType } : {}),
      })
      .then((rows) => {
        setCards(rows);
        // Everything printable is selected until the user says otherwise -
        // the usual job is "print this cycle's talkers", not "pick eight".
        if (!touched.current) {
          setSelected(new Set(rows.map(cardKey)));
        }
      })
      .catch((err) => toast.error(err.message ?? "Could not load talkers"))
      .finally(() => setLoading(false));
  }, [status, groupType]);

  useEffect(load, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        String(c.title ?? "").toLowerCase().includes(q) ||
        String(c.label ?? "").toLowerCase().includes(q)
    );
  }, [cards, search]);

  const chosen = useMemo(
    () => visible.filter((c) => selected.has(cardKey(c))),
    [visible, selected]
  );

  const mixedGroups = useMemo(() => {
    const labels = new Set();
    chosen.forEach((c) => c.mixed && labels.add(c.label));
    return [...labels];
  }, [chosen]);

  const mismatched = useMemo(
    () => chosen.filter((c) => !c.expected_text_matches),
    [chosen]
  );

  const droppedCount = useMemo(
    () =>
      cards.reduce(
        (n, c) => n + (c.dropped_items?.length ?? 0),
        0
      ),
    [cards]
  );

  const toggle = (card) => {
    touched.current = true;
    setSelected((prev) => {
      const next = new Set(prev);
      const key = cardKey(card);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    touched.current = true;
    setSelected((prev) => {
      const allOn = visible.every((c) => prev.has(cardKey(c)));
      const next = new Set(prev);
      visible.forEach((c) =>
        allOn ? next.delete(cardKey(c)) : next.add(cardKey(c))
      );
      return next;
    });
  };

  const handlePrint = async () => {
    if (!chosen.length) {
      toast.error("Nothing selected to print");
      return;
    }
    setPrinting(true);
    try {
      if (syncText) {
        // Recording the wording before printing keeps the photo check honest:
        // it compares the shelf against this text, so a sign printed with text
        // the check has never been told about fails every time.
        const ids = [...new Set(chosen.map((c) => c.group_id))];
        const res = await offersV3Talker.print.syncText(ids);
        if (res.skipped?.length) {
          toast(
            `${res.skipped.length} mixed group(s) skipped - set their sign text by hand`
          );
        }
      }
      window.print();
      load();
    } catch (err) {
      toast.error(err.message ?? "Could not prepare the print run");
    } finally {
      setPrinting(false);
    }
  };

  const sheetCount = Math.ceil(chosen.length / PER_SHEET);
  const allOn = visible.length > 0 && visible.every((c) => selected.has(cardKey(c)));

  return (
    <GlobalWrapper
      title="Print Talkers"
      permissionKey="manage_offers_v3_talker_groups"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        #talker-print-root {
          display: none;
        }
        .talker-sheet {
          display: grid;
          grid-template-columns: ${CARD_W} ${CARD_W};
          grid-auto-rows: ${CARD_H};
          width: 208mm;
          /* The grid measures 208 x 292mm, well inside A4, yet still spilled a
             blank page after every sheet - text descenders in the bottom row
             push the box past its own rows. Pinning the height and clipping is
             what actually stops it; verified by rendering to PDF. */
          height: 292mm;
          overflow: hidden;
        }
        .talker-card {
          width: ${CARD_W};
          height: ${CARD_H};
          box-sizing: border-box;
          padding: 3mm;
          overflow: hidden;
        }
        .talker-card-inner {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          border: 0.4mm dashed #999;
          padding: 4mm 3mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: #fff;
          color: #000;
        }
        .talker-logo {
          width: 30mm;
          height: auto;
          display: block;
          margin-bottom: 2mm;
        }
        .talker-title {
          font-size: 4.4mm;
          line-height: 1.15;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: ${BRAND_PURPLE};
          max-height: 10mm;
          overflow: hidden;
        }
        .talker-lead {
          font-size: 5mm;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: ${BRAND_PURPLE};
          margin-top: 2mm;
        }
        .talker-headline {
          font-size: 17mm;
          line-height: 1.05;
          font-weight: 800;
          color: ${BRAND_ORANGE};
          margin-top: 1mm;
          white-space: nowrap;
        }
        .talker-trail {
          font-size: 9mm;
          margin-left: 2mm;
        }
        .talker-subline {
          font-size: 4.4mm;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: ${BRAND_PURPLE};
          margin-top: 1mm;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body > *:not(#talker-print-root) {
            display: none !important;
          }
          #talker-print-root {
            display: block !important;
          }
          .talker-sheet {
            break-after: page;
            page-break-after: always;
          }
          .talker-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .talker-card-inner {
            border-color: #bbb;
          }
          /* Without this most browsers strip colour on print, and the logo
             and the discount - the two things the sign exists for - come out
             grey. */
          #talker-print-root,
          #talker-print-root * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `,
        }}
      />

      <CustomContainer title="Print Talkers" filledHeader>
        <Box p="15px">
          <Flex gap="10px" wrap="wrap" alignItems="center" mb="15px">
            <Select
              size="sm"
              maxW="190px"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="published">Published signs</option>
              <option value="draft">Drafts</option>
              <option value="">Published & drafts</option>
            </Select>
            <Select
              size="sm"
              maxW="190px"
              value={groupType}
              onChange={(e) => setGroupType(e.target.value)}
            >
              <option value="">Brand & individual</option>
              <option value="brand">Brand signs only</option>
              <option value="individual">Individual signs only</option>
            </Select>
            <Input
              size="sm"
              maxW="240px"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Checkbox
              size="sm"
              isChecked={syncText}
              onChange={(e) => setSyncText(e.target.checked)}
            >
              Save this wording as the expected sign text
            </Checkbox>
            <Button
              size="sm"
              colorScheme="purple"
              isLoading={printing}
              onClick={handlePrint}
            >
              Print {chosen.length} talker{chosen.length === 1 ? "" : "s"}
              {sheetCount ? ` (${sheetCount} sheet${sheetCount === 1 ? "" : "s"})` : ""}
            </Button>
          </Flex>

          {mixedGroups.length ? (
            <Box bg="orange.50" p="10px" borderRadius="6px" mb="10px">
              <Text fontSize="13px">
                <b>{mixedGroups.length} group(s) carry more than one offer</b> -
                each prints a separate sign per offer, and their expected sign
                text is left alone. Split them if one sign was intended:{" "}
                {mixedGroups.join(", ")}
              </Text>
            </Box>
          ) : null}

          {mismatched.length ? (
            <Box bg="red.50" p="10px" borderRadius="6px" mb="10px">
              <Text fontSize="13px">
                <b>{mismatched.length} sign(s) differ from the text the photo
                check expects.</b>{" "}
                Leave &quot;Save this wording&quot; ticked and every photo will
                be checked against what you actually printed.
              </Text>
            </Box>
          ) : null}

          {droppedCount ? (
            <Box bg="gray.50" p="10px" borderRadius="6px" mb="10px">
              <Text fontSize="13px">
                {droppedCount} article(s) in these groups no longer carry an
                offer, so they are not printed.
              </Text>
            </Box>
          ) : null}

          {loading ? (
            <Flex justifyContent="center" p="30px">
              <Spinner />
            </Flex>
          ) : !cards.length ? (
            <Text fontSize="14px" color="gray.600">
              No talkers to print. Publish some groups on Talker Groups first.
            </Text>
          ) : (
            <Flex gap="20px" wrap="wrap" alignItems="flex-start">
              <Box flex="1" minW="320px">
                <Flex alignItems="center" gap="10px" mb="8px">
                  <Checkbox size="sm" isChecked={allOn} onChange={toggleAll}>
                    Select all ({visible.length})
                  </Checkbox>
                </Flex>
                <Box maxH="520px" overflowY="auto" borderWidth="1px" borderRadius="6px">
                  {visible.map((card) => (
                    <Flex
                      key={cardKey(card)}
                      alignItems="center"
                      gap="10px"
                      p="8px 10px"
                      borderBottomWidth="1px"
                    >
                      <Checkbox
                        size="sm"
                        isChecked={selected.has(cardKey(card))}
                        onChange={() => toggle(card)}
                      />
                      <Box flex="1" minW="0">
                        <Text fontSize="13px" fontWeight="600" noOfLines={1}>
                          {card.title}
                        </Text>
                        <Text fontSize="12px" color="gray.600">
                          {card.printed_text} ·{" "}
                          {card.item_count} article
                          {card.item_count === 1 ? "" : "s"}
                        </Text>
                      </Box>
                      <Badge colorScheme={card.group_type === "brand" ? "purple" : "blue"}>
                        {card.group_type}
                      </Badge>
                      <Badge colorScheme={STATUS_COLORS[card.status] ?? "gray"}>
                        {card.status}
                      </Badge>
                      {card.mixed ? <Badge colorScheme="orange">mixed</Badge> : null}
                    </Flex>
                  ))}
                </Box>
              </Box>

              <Box>
                <Text fontSize="13px" fontWeight="600" mb="8px">
                  Actual size preview
                </Text>
                {chosen[0] ? (
                  <TalkerCard card={chosen[0]} />
                ) : (
                  <Text fontSize="13px" color="gray.600">
                    Select a talker to preview it.
                  </Text>
                )}
              </Box>
            </Flex>
          )}
        </Box>
      </CustomContainer>

      <PrintSheets cards={chosen} />
    </GlobalWrapper>
  );
}
