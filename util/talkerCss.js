/**
 * The printed talker's stylesheet, built from the shared design settings.
 *
 * Generated rather than static because the same rules have to drive three
 * things at once - the on-screen preview, the editor, and the print output -
 * and any drift between them means what you approve is not what prints.
 *
 * Every element is absolutely placed from a percentage of the card and centred
 * on that point, so a position set by dragging holds its proportions when the
 * card size changes, and nothing reflows when a neighbour grows.
 */
function place(x, y) {
  return `left: ${x}%; top: ${y}%; transform: translate(-50%, -50%);`;
}

export default function talkerCss(s, layout) {
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
      background: #fff;
      color: #000;
      overflow: hidden;
    }
    .talker-el {
      position: absolute;
      text-align: center;
      max-width: 96%;
    }
    .talker-logo {
      ${s.show_logo ? place(s.logo_x, s.logo_y) : "display: none;"}
      width: ${s.logo_w_mm}mm;
      height: auto;
    }
    .talker-title {
      ${place(s.title_x, s.title_y)}
      font-size: ${s.title_mm}mm;
      line-height: 1.15;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: ${s.brand_color};
      /* Elements are placed independently, so nothing pushes a neighbour out
         of the way any more: a four-line product name would simply grow over
         the offer beneath it. Two lines, then ellipsis - the name identifies
         the product, the offer is what the sign is for. */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .talker-lead {
      ${place(s.lead_x, s.lead_y)}
      font-size: ${s.lead_mm}mm;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: ${s.brand_color};
      white-space: nowrap;
    }
    .talker-headline {
      ${place(s.big_x, s.big_y)}
      font-size: ${s.big_mm}mm;
      line-height: 1.05;
      font-weight: 800;
      color: ${s.offer_color};
      white-space: nowrap;
    }
    .talker-trail {
      font-size: ${s.trail_mm}mm;
      margin-left: 2mm;
    }
    .talker-subline {
      ${place(s.subline_x, s.subline_y)}
      font-size: ${s.subline_mm}mm;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: ${s.brand_color};
      white-space: nowrap;
    }

    /* Editor only - never reaches the printed card. */
    .talker-card-inner.is-editing .talker-el {
      cursor: grab;
      outline: 1px dashed rgba(115, 47, 141, 0.45);
      outline-offset: 2px;
    }
    .talker-card-inner.is-editing .talker-el:hover {
      outline-color: rgba(115, 47, 141, 0.9);
      background: rgba(115, 47, 141, 0.06);
    }
    .talker-card-inner.is-editing .talker-el.is-dragging {
      cursor: grabbing;
      outline-style: solid;
      outline-color: ${s.offer_color};
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
