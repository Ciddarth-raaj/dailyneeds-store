import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spinner,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import offersV3Talker from "../../helper/offersV3Talker";
import talkerCss from "../../util/talkerCss";
import {
  DEFAULT_PRINT_SETTINGS,
  LOGO_POSITIONS,
  PRINT_SETTING_LIMITS,
  sheetLayout,
} from "../../constants/talkerPrint";

const STATUS_COLORS = { draft: "gray", published: "green" };

/** Stands in for a real sign while the editor is open on an empty selection. */
const SAMPLE_CARD = {
  group_id: 0,
  title: "CADBURY DAIRY MILK 150G",
  lead: "SPL PRICE",
  big: "\u20b994.50",
  trail: null,
  subline: null,
};

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
        <img
          className="talker-logo"
          src="/assets/dnds-logo.png"
          alt="Daily Needs"
        />
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
function PrintSheets({ cards, perSheet }) {
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
  for (let i = 0; i < cards.length; i += perSheet) {
    sheets.push(cards.slice(i, i + perSheet));
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
    host,
  );
}

/**
 * One labelled slider over a numeric design setting. The number is shown in
 * millimetres because that is what someone measures against a printed card.
 */
function SizeControl({ name, value, onChange }) {
  const { min, max, step, label } = PRINT_SETTING_LIMITS[name];
  return (
    <Box mb="10px">
      <Flex justifyContent="space-between" alignItems="baseline">
        <Text fontSize="12px" fontWeight="600">
          {label}
        </Text>
        <Text fontSize="12px" color="gray.600">
          {value}mm
        </Text>
      </Flex>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(v) => onChange(name, v)}
        focusThumbOnChange={false}
      >
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>
    </Box>
  );
}

function ColorControl({ label, value, onChange }) {
  return (
    <Flex alignItems="center" gap="8px" mb="10px">
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        width="42px"
        height="28px"
        padding="2px"
        cursor="pointer"
      />
      <Box>
        <Text fontSize="12px" fontWeight="600">
          {label}
        </Text>
        <Text fontSize="11px" color="gray.600">
          {value}
        </Text>
      </Box>
    </Flex>
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

  // `settings` is what prints; `draft` is what the editor is showing. Keeping
  // them apart is what lets the preview update on every drag without a save,
  // and lets Cancel put the printed look back.
  const [settings, setSettings] = useState(DEFAULT_PRINT_SETTINGS);
  const [draft, setDraft] = useState(DEFAULT_PRINT_SETTINGS);
  const [editing, setEditing] = useState(false);
  const [savingDesign, setSavingDesign] = useState(false);

  useEffect(() => {
    offersV3Talker.print
      .settings()
      .then((res) => {
        setSettings(res.settings);
        setDraft(res.settings);
      })
      .catch((err) => toast.error(err.message ?? "Could not load the design"));
  }, []);

  const active = editing ? draft : settings;
  const layout = useMemo(() => sheetLayout(active), [active]);

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
        String(c.title ?? "")
          .toLowerCase()
          .includes(q) ||
        String(c.label ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [cards, search]);

  const chosen = useMemo(
    () => visible.filter((c) => selected.has(cardKey(c))),
    [visible, selected],
  );

  const mixedGroups = useMemo(() => {
    const labels = new Set();
    chosen.forEach((c) => c.mixed && labels.add(c.label));
    return [...labels];
  }, [chosen]);

  const mismatched = useMemo(
    () => chosen.filter((c) => !c.expected_text_matches),
    [chosen],
  );

  const droppedCount = useMemo(
    () => cards.reduce((n, c) => n + (c.dropped_items?.length ?? 0), 0),
    [cards],
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
        allOn ? next.delete(cardKey(c)) : next.add(cardKey(c)),
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
            `${res.skipped.length} mixed group(s) skipped - set their sign text by hand`,
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

  const setDesign = (key, value) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const saveDesign = async () => {
    setSavingDesign(true);
    try {
      // The server clamps and falls back, so take what it returns rather than
      // the draft - what is stored is what will print.
      const res = await offersV3Talker.print.saveSettings(draft);
      setSettings(res.settings);
      setDraft(res.settings);
      setEditing(false);
      toast.success("Design saved");
    } catch (err) {
      toast.error(err.message ?? "Could not save the design");
    } finally {
      setSavingDesign(false);
    }
  };

  const sheetCount = Math.ceil(chosen.length / layout.per_sheet);
  const allOn =
    visible.length > 0 && visible.every((c) => selected.has(cardKey(c)));

  return (
    <GlobalWrapper
      title="Print Talkers"
      permissionKey="manage_offers_v3_talker_groups"
    >
      <style dangerouslySetInnerHTML={{ __html: talkerCss(active, layout) }} />

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
              variant={editing ? "solid" : "outline"}
              colorScheme="gray"
              onClick={() => {
                setDraft(settings);
                setEditing((v) => !v);
              }}
            >
              {editing ? "Close design" : "Design"}
            </Button>
            <Button
              size="sm"
              colorScheme="purple"
              isLoading={printing}
              onClick={handlePrint}
            >
              Print {chosen.length} talker{chosen.length === 1 ? "" : "s"}
              {sheetCount
                ? ` (${sheetCount} sheet${sheetCount === 1 ? "" : "s"})`
                : ""}
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
                <b>
                  {mismatched.length} sign(s) differ from the text the photo
                  check expects.
                </b>{" "}
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
          ) : (
            /* The preview and the editor sit outside the "any talkers?" check
               on purpose: the design has to be adjustable before anything is
               published, not only once there is a sign to look at. */
            <Flex gap="20px" wrap="wrap" alignItems="flex-start">
              <Box flex="1" minW="320px">
                {!cards.length ? (
                  <Text fontSize="14px" color="gray.600">
                    No talkers to print. Publish some groups on Talker Groups
                    first.
                  </Text>
                ) : (
                  <>
                    <Flex alignItems="center" gap="10px" mb="8px">
                      <Checkbox
                        size="sm"
                        isChecked={allOn}
                        onChange={toggleAll}
                      >
                        Select all ({visible.length})
                      </Checkbox>
                    </Flex>
                    <Box
                      maxH="520px"
                      overflowY="auto"
                      borderWidth="1px"
                      borderRadius="6px"
                    >
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
                            <Text
                              fontSize="13px"
                              fontWeight="600"
                              noOfLines={1}
                            >
                              {card.title}
                            </Text>
                            <Text fontSize="12px" color="gray.600">
                              {card.printed_text} · {card.item_count} article
                              {card.item_count === 1 ? "" : "s"}
                            </Text>
                          </Box>
                          <Badge
                            colorScheme={
                              card.group_type === "brand" ? "purple" : "blue"
                            }
                          >
                            {card.group_type}
                          </Badge>
                          <Badge
                            colorScheme={STATUS_COLORS[card.status] ?? "gray"}
                          >
                            {card.status}
                          </Badge>
                          {card.mixed ? (
                            <Badge colorScheme="orange">mixed</Badge>
                          ) : null}
                        </Flex>
                      ))}
                    </Box>
                  </>
                )}
              </Box>

              <Box>
                <Text fontSize="13px" fontWeight="600" mb="8px">
                  Actual size preview
                </Text>
                <TalkerCard card={chosen[0] ?? SAMPLE_CARD} />
                <Text fontSize="12px" color="gray.600" mt="6px">
                  {active.card_w_mm} x {active.card_h_mm}mm · {layout.per_sheet}{" "}
                  per A4 sheet ({layout.cols} x {layout.rows})
                  {chosen[0] ? "" : " · sample"}
                </Text>

                {editing ? (
                  <Box
                    mt="12px"
                    p="12px"
                    borderWidth="1px"
                    borderRadius="6px"
                    maxW="320px"
                  >
                    <Text fontSize="13px" fontWeight="700" mb="10px">
                      Card
                    </Text>
                    <SizeControl
                      name="card_w_mm"
                      value={draft.card_w_mm}
                      onChange={setDesign}
                    />
                    <SizeControl
                      name="card_h_mm"
                      value={draft.card_h_mm}
                      onChange={setDesign}
                    />
                    <Checkbox
                      size="sm"
                      mb="12px"
                      isChecked={draft.show_border}
                      onChange={(e) =>
                        setDesign("show_border", e.target.checked)
                      }
                    >
                      Show cut lines
                    </Checkbox>

                    <Text fontSize="13px" fontWeight="700" mb="8px">
                      Logo
                    </Text>
                    <Select
                      size="sm"
                      mb="10px"
                      value={draft.logo_position}
                      onChange={(e) =>
                        setDesign("logo_position", e.target.value)
                      }
                    >
                      {LOGO_POSITIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                    {draft.logo_position === "none" ? null : (
                      <SizeControl
                        name="logo_w_mm"
                        value={draft.logo_w_mm}
                        onChange={setDesign}
                      />
                    )}

                    <Text fontSize="13px" fontWeight="700" mb="8px" mt="4px">
                      Type sizes
                    </Text>
                    {[
                      "title_mm",
                      "lead_mm",
                      "big_mm",
                      "trail_mm",
                      "subline_mm",
                    ].map((name) => (
                      <SizeControl
                        key={name}
                        name={name}
                        value={draft[name]}
                        onChange={setDesign}
                      />
                    ))}

                    <Text fontSize="13px" fontWeight="700" mb="8px" mt="4px">
                      Colours
                    </Text>
                    <ColorControl
                      label="Name and small lines"
                      value={draft.brand_color}
                      onChange={(v) => setDesign("brand_color", v)}
                    />
                    <ColorControl
                      label="The offer"
                      value={draft.offer_color}
                      onChange={(v) => setDesign("offer_color", v)}
                    />

                    <Flex gap="8px" mt="14px" wrap="wrap">
                      <Button
                        size="sm"
                        colorScheme="purple"
                        isLoading={savingDesign}
                        onClick={saveDesign}
                      >
                        Save design
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDraft(settings);
                          setEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDraft(DEFAULT_PRINT_SETTINGS)}
                      >
                        Reset
                      </Button>
                    </Flex>
                    <Text fontSize="11px" color="gray.600" mt="8px">
                      Saved for everyone at HQ, and used for every print run
                      until changed.
                    </Text>
                  </Box>
                ) : null}
              </Box>
            </Flex>
          )}
        </Box>
      </CustomContainer>

      <PrintSheets cards={chosen} perSheet={layout.per_sheet} />
    </GlobalWrapper>
  );
}
