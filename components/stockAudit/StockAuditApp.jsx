import React, { useState } from "react";
import {
  Badge, Box, Button, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader, DrawerOverlay, Flex, Heading, Image, Select, SimpleGrid, Stack, Text,
} from "@chakra-ui/react";
import { StockAuditProvider, useStockAudit } from "./context";
import { SCREENS, GROUPS, allowed } from "./registry";
import { VIEWERS } from "./permissions";
import { BRAND, fmtDate } from "./ui";
import { NoAccess } from "./screens/common";

/** The season every screen works on: current by default, earlier ones for reports. */
function SeasonPicker() {
  const { seasons, season, chooseSeason } = useStockAudit();
  if (!seasons.length) return null;
  return (
    <Flex px={{ base: 4, md: 5 }} pb={2} gap={2} align="center" minW={0}>
      <Text fontSize="xs" color="gray.500" flexShrink={0}>Season</Text>
      <Select size="sm" h="36px" maxW={{ base: "100%", md: "420px" }} value={season || ""} onChange={(e) => chooseSeason(e.target.value)} aria-label="Season">
        {seasons.map((x) => (
          <option key={x.period_code} value={x.period_code}>
            {x.name} · {fmtDate(x.start_date)} – {fmtDate(x.end_date)}{x.current ? " (current)" : ""}
          </option>
        ))}
      </Select>
    </Flex>
  );
}

function Home() {
  const { go, can, preview } = useStockAudit();
  return (
    <Box>
      <Heading size="md" mb={1}>Stock Audit & Premier League</Heading>
      <Text fontSize="sm" color="gray.500" mb={4}>Every screen of the module. In the preview, screens the selected role cannot open are greyed out.</Text>
      {typeof window !== "undefined" && window.__SA_GALLERY__ ? (
        <Button as="a" href={window.__SA_GALLERY__} target="_blank" rel="noreferrer" size="sm" mb={4} colorScheme="orange" variant="outline">Mobile & desktop screenshots, sample PDFs</Button>
      ) : null}
      {GROUPS.filter((g) => preview || SCREENS.some((s) => s.group === g && allowed(s, can))).map((g) => (
        <Box key={g} mb={4}>
          <Text fontWeight={700} color={BRAND.purple} mb={2}>{g}</Text>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={2}>
            {SCREENS.filter((s) => s.group === g && (preview || allowed(s, can))).map((s) => {
              const ok = allowed(s, can);
              return (
                <Button key={s.path} justifyContent="flex-start" variant="outline" minH="48px" h="auto" py={2} whiteSpace="normal" textAlign="left" colorScheme={ok ? "purple" : "gray"} opacity={ok ? 1 : 0.5} onClick={() => go(s.path)}>
                  <Badge mr={2} colorScheme={ok ? "purple" : "gray"}>{s.no}</Badge>{s.title}
                </Button>
              );
            })}
          </SimpleGrid>
        </Box>
      ))}
    </Box>
  );
}

function Shell() {
  const { path, go, can, preview, viewer, setViewerId, dataState, setDataState, season, seasonReady } = useStockAudit();
  const [menu, setMenu] = useState(false);
  const screen = SCREENS.find((s) => s.path === path);
  const groupScreens = screen ? SCREENS.filter((s) => s.group === screen.group && allowed(s, can)) : [];
  const C = screen ? screen.C : Home;
  return (
    <Box bg="#FAF7FB" minH="100vh" maxW="100vw" overflowX="hidden">
      <Box bg="white" borderBottom="1px solid" borderColor="gray.100" position="sticky" top="env(safe-area-inset-top, 0px)" zIndex={10}>
        <Flex align="center" px={{ base: 4, md: 5 }} py={2} gap={3}>
          <Button size="sm" minH="40px" onClick={() => setMenu(true)} colorScheme="purple" variant="outline">☰ Menu</Button>
          <Box flex="1" minW={0} cursor="pointer" onClick={() => go("")}>
            <Text fontWeight={700} color={BRAND.purple} fontSize={{ base: "sm", md: "md" }} noOfLines={1}>Stock Audit & SAPL</Text>
            <Text fontSize="10px" color="gray.500" noOfLines={1}>{screen ? `${screen.no}. ${screen.title}` : "All screens"}</Text>
          </Box>
          <Image src={typeof window !== "undefined" && window.__SA_LOGO__ ? window.__SA_LOGO__ : "/assets/dnds-logo.png"} alt="Daily Needs" h={{ base: "22px", md: "28px" }} display={{ base: "none", sm: "block" }} />
        </Flex>
        {preview ? (
          <Flex px={{ base: 4, md: 5 }} pb={2} gap={2} wrap="wrap" align="center">
            <Badge bg={BRAND.orange} color="white">PREVIEW</Badge>
            <Select size="xs" w="auto" maxW="240px" value={viewer.id} onChange={(e) => setViewerId(e.target.value)} aria-label="View as">
              {VIEWERS.map((v) => <option key={v.id} value={v.id}>View as: {v.label}</option>)}
            </Select>
            <Select size="xs" w="auto" maxW="260px" value={dataState} onChange={(e) => setDataState(e.target.value)} aria-label="Data state">
              <option value="allotment">Data: sample allotment imported</option>
              <option value="no-allotment">Data: before allotment (today)</option>
            </Select>
          </Flex>
        ) : null}
        <SeasonPicker />
        {groupScreens.length > 1 ? (
          <Flex px={{ base: 4, md: 5 }} pb={2} gap={1} overflowX="auto" css={{ scrollbarWidth: "none" }}>
            {groupScreens.map((s) => (
              <Button key={s.path} size="xs" minH="32px" flexShrink={0} variant={s.path === path ? "solid" : "ghost"} colorScheme="purple" onClick={() => go(s.path)}>{s.title}</Button>
            ))}
          </Flex>
        ) : null}
      </Box>
      <Box px={{ base: 4, md: 5 }} py={4} maxW="1280px" mx="auto">
        {screen && !allowed(screen, can) ? <NoAccess what={`"${screen.title}"`} />
          : seasonReady ? <C key={season || "no-season"} /> : <Text fontSize="sm" color="gray.500">Loading the season…</Text>}
      </Box>
      <Drawer isOpen={menu} placement="left" onClose={() => setMenu(false)} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader color={BRAND.purple}>Stock Audit & SAPL</DrawerHeader>
          <DrawerBody>
            <Button w="100%" mb={3} variant="ghost" justifyContent="flex-start" onClick={() => { go(""); setMenu(false); }}>All screens</Button>
            {GROUPS.map((g) => {
              const items = SCREENS.filter((s) => s.group === g && allowed(s, can));
              if (!items.length) return null;
              return (
                <Box key={g} mb={3}>
                  <Text fontSize="xs" fontWeight={700} color="gray.500" textTransform="uppercase" mb={1}>{g}</Text>
                  <Stack spacing={0}>
                    {items.map((s) => (
                      <Button key={s.path} variant={s.path === path ? "solid" : "ghost"} colorScheme="purple" size="sm" minH="40px" justifyContent="flex-start" onClick={() => { go(s.path); setMenu(false); }}>
                        {s.no}. {s.title}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

/** The whole module. Host supplies path/params and `go`. */
export default function StockAuditApp(props) {
  return (
    <StockAuditProvider {...props}>
      <Shell />
    </StockAuditProvider>
  );
}
