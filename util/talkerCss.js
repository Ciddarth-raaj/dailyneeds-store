/**
 * The printed talker's stylesheet, built from the shared design settings.
 *
 * Generated rather than static because the same rules have to drive three
 * things at once - the on-screen preview, the editor, and the print output -
 * and any drift between them means what you approve is not what prints.
 */
const LOGO_ANCHORS = {
  "top-left": "top: 3mm; left: 3mm;",
  "top-center": "top: 3mm; left: 50%; transform: translateX(-50%);",
  "top-right": "top: 3mm; right: 3mm;",
};

export default function talkerCss(s, layout) {
  const logo =
    s.logo_position === "none"
      ? ".talker-logo { display: none; }"
      : `.talker-logo {
          position: absolute;
          ${LOGO_ANCHORS[s.logo_position] ?? LOGO_ANCHORS["top-left"]}
          width: ${s.logo_w_mm}mm;
          height: auto;
        }`;

  return `
    #talker-print-root { display: none; }

    .talker-sheet {
      display: grid;
      grid-template-columns: repeat(${layout.cols}, ${s.card_w_mm}mm);
      grid-auto-rows: ${s.card_h_mm}mm;
      width: ${layout.width_mm}mm;
      /* Even a grid measuring well inside A4 spilled a blank page after every
         sheet - text descenders in the bottom row push the box past its own
         rows. Pinning the height and clipping is what actually stops it;
         verified by rendering sheets to PDF. */
      height: ${layout.height_mm}mm;
      overflow: hidden;
    }
    .talker-card {
      width: ${s.card_w_mm}mm;
      height: ${s.card_h_mm}mm;
      box-sizing: border-box;
      padding: 3mm;
      overflow: hidden;
    }
    .talker-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border: ${s.show_border ? "0.4mm dashed #999" : "none"};
      padding: 4mm 3mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: #fff;
      color: #000;
    }
    /* Out of the flow, so it reads as a corner mark and the offer stays
       centred in the whole card rather than in what is left beside it. */
    ${logo}
    .talker-title {
      font-size: ${s.title_mm}mm;
      line-height: 1.15;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: ${s.brand_color};
      max-height: ${(s.title_mm * 2.4).toFixed(1)}mm;
      overflow: hidden;
    }
    .talker-lead {
      font-size: ${s.lead_mm}mm;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: ${s.brand_color};
      margin-top: 2mm;
    }
    .talker-headline {
      font-size: ${s.big_mm}mm;
      line-height: 1.05;
      font-weight: 800;
      color: ${s.offer_color};
      margin-top: 1mm;
      white-space: nowrap;
    }
    .talker-trail {
      font-size: ${s.trail_mm}mm;
      margin-left: 2mm;
    }
    .talker-subline {
      font-size: ${s.subline_mm}mm;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: ${s.brand_color};
      margin-top: 1mm;
    }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      body > *:not(#talker-print-root) { display: none !important; }
      #talker-print-root { display: block !important; }
      .talker-sheet { break-after: page; page-break-after: always; }
      .talker-sheet:last-child { break-after: auto; page-break-after: auto; }
      /* Without this most browsers strip colour on print, and the logo and the
         discount - the two things the sign exists for - come out grey. */
      #talker-print-root, #talker-print-root * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}
