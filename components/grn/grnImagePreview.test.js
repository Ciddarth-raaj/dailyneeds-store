/**
 * GRN -> Products table -> click a thumbnail to see the product image large.
 *
 *   node --test components/grn/grnImagePreview.test.js
 *
 * The rules being pinned:
 *
 *   OPENS        clicking the Image cell's thumbnail shows the SAME image URL
 *                in a modal on the page - no navigation, no new tab.
 *   CLOSES       by the × button, by a click outside the image, and by Esc.
 *   BROKEN       an image that fails to load (or has no URL) reads
 *                "Image not available" instead of a broken-image icon.
 *   UNCHANGED    the Image column keeps its field, width and 48px thumbnail;
 *                the grid around it is not touched.
 *
 * The mounted tests run Chakra's real Modal in jsdom and need node_modules;
 * the source checks run everywhere.
 */
const { describe, it, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { load, unavailable, root } = require("../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};
const src = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

/**
 * jsdom as test_support/renderJsx installs it, plus animation frames: Chakra's
 * Modal animates through framer-motion, which needs requestAnimationFrame.
 */
let dom = null;
function installDom() {
  if (dom) return;
  const { JSDOM } = require("jsdom");
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/grn/view?refno=5972",
    pretendToBeVisual: true,
  });
  for (const key of ["window", "document", "navigator", "Element", "HTMLElement", "Node", "Event", "MouseEvent", "KeyboardEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    global[key] = key === "window" ? dom.window : dom.window[key];
  }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  delete global.MessageChannel;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Polls until `check()` is truthy - exit animations finish on their own clock. */
async function waitFor(check, label, timeout = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for ${label}`);
    await sleep(20);
  }
}

const IMG = "https://cdn.example.com/products/1001.jpg";

describe("product image preview (mounted)", skip, () => {
  let React;
  let ReactDOM;
  let act;
  let container;
  let state;

  before(() => {
    installDom();
    React = require("react");
    ReactDOM = require("react-dom");
    ({ act } = require("react-dom/test-utils"));
  });

  /**
   * The page's wiring in miniature: the real thumbnail and the real modal,
   * joined by one piece of state exactly as pages/grn/view.jsx joins them.
   */
  async function mountPreview({ src: imageSrc = IMG } = {}) {
    const Thumbnail = load("components/grn/GrnProductThumbnail.jsx");
    const Preview = load("components/grn/GrnImagePreviewModal.jsx");
    state = { opens: [], open: null };
    function Harness() {
      const [preview, setPreview] = React.useState(null);
      state.open = preview;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(Thumbnail, {
          src: imageSrc,
          alt: "Aashirvaad Atta 5kg",
          onOpen: (s, a) => {
            state.opens.push(s);
            setPreview({ src: s, alt: a });
          },
        }),
        React.createElement(Preview, {
          isOpen: Boolean(preview),
          onClose: () => setPreview(null),
          src: preview?.src,
          alt: preview?.alt,
        })
      );
    }
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      ReactDOM.render(React.createElement(Harness), container);
    });
  }

  /** Idempotent, and run after EVERY test: a failed assertion must not leave
   * an open modal animating, or the process never exits. */
  async function unmount() {
    if (!container) return;
    const node = container;
    container = null;
    await act(async () => {
      ReactDOM.unmountComponentAtNode(node);
    });
    node.remove();
    await sleep(50);
  }

  afterEach(() => unmount());

  const dialog = () => document.querySelector("[role=dialog]");
  const thumbnail = () => container.querySelector("button[aria-label^='View larger image']");

  async function click(el, { withMouseDown = false } = {}) {
    await act(async () => {
      if (withMouseDown) el.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
      el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  }

  async function openPreview() {
    await click(thumbnail());
    await waitFor(() => dialog(), "the preview to open");
  }

  async function expectClosed() {
    assert.equal(state.open, null, "the page's preview state is cleared");
    await waitFor(() => !dialog(), "the preview to leave the DOM");
  }

  after(() => {
    if (dom) dom.window.close();
  });

  it("clicking the thumbnail opens the SAME image large, on the page", async () => {
    await mountPreview();
    assert.equal(dialog() === null, true, "nothing is open before the click");
    const thumbImg = thumbnail().querySelector("img");
    assert.equal(thumbImg.getAttribute("src"), IMG);

    await openPreview();

    const big = dialog().querySelector("img");
    assert.ok(big, "the large image is shown");
    assert.equal(big.getAttribute("src"), IMG, "the thumbnail's own URL");
    assert.equal(big.getAttribute("alt"), "Aashirvaad Atta 5kg");
    assert.deepEqual(state.opens, [IMG]);
    assert.equal(window.location.href, "http://localhost/grn/view?refno=5972", "no navigation");
    await unmount();
  });

  it("the × button closes it", async () => {
    await mountPreview();
    await openPreview();
    const close = dialog().querySelector("button[aria-label='Close image preview']");
    assert.ok(close, "there is a close button");
    assert.equal(close.tagName, "BUTTON");

    await click(close);
    await expectClosed();
    await unmount();
  });

  it("a click outside the image closes it", async () => {
    await mountPreview();
    await openPreview();
    const backdrop = document.querySelector(".chakra-modal__content-container");
    assert.ok(backdrop, "the backdrop container is present");

    await click(backdrop, { withMouseDown: true });
    await expectClosed();
    await unmount();
  });

  it("a click ON the image does not close it", async () => {
    await mountPreview();
    await openPreview();
    await click(dialog().querySelector("img"), { withMouseDown: true });
    await sleep(50);
    assert.ok(state.open, "still open");
    assert.ok(Boolean(dialog()));
    await unmount();
  });

  it("Esc closes it", async () => {
    await mountPreview();
    await openPreview();
    await act(async () => {
      dialog().dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await expectClosed();
    await unmount();
  });

  it("an image that fails to load reads 'Image not available'", async () => {
    await mountPreview();
    await openPreview();
    const big = dialog().querySelector("img");
    await act(async () => {
      big.dispatchEvent(new window.Event("error"));
    });
    assert.equal(dialog().querySelector("img") === null, true, "no broken-image icon");
    assert.match(dialog().textContent, /Image not available/);
    // And it can still be closed.
    await click(dialog().querySelector("button[aria-label='Close image preview']"));
    await expectClosed();
    await unmount();
  });

  it("the next image gets a fresh attempt after a failure", async () => {
    const Preview = load("components/grn/GrnImagePreviewModal.jsx");
    container = document.createElement("div");
    document.body.appendChild(container);
    const renderWith = (s) =>
      act(async () => {
        ReactDOM.render(React.createElement(Preview, { isOpen: true, onClose: () => {}, src: s, alt: "x" }), container);
      });
    await renderWith(IMG);
    await waitFor(() => dialog() && dialog().querySelector("img"), "the image");
    await act(async () => {
      dialog().querySelector("img").dispatchEvent(new window.Event("error"));
    });
    assert.match(dialog().textContent, /Image not available/);
    await renderWith("https://cdn.example.com/products/1002.jpg");
    assert.equal(dialog().querySelector("img").getAttribute("src"), "https://cdn.example.com/products/1002.jpg");
    await unmount();
  });

  it("no image URL at all reads 'Image not available'", async () => {
    const Preview = load("components/grn/GrnImagePreviewModal.jsx");
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      ReactDOM.render(React.createElement(Preview, { isOpen: true, onClose: () => {}, src: "" }), container);
    });
    await waitFor(() => dialog(), "the preview");
    assert.match(dialog().textContent, /Image not available/);
    await unmount();
  });

  it("the thumbnail is a button, never a link or a new tab", async () => {
    await mountPreview();
    const button = thumbnail();
    assert.equal(button.tagName, "BUTTON");
    assert.equal(button.getAttribute("type"), "button");
    assert.equal(container.querySelector("a") === null, true);
    assert.equal(button.getAttribute("title"), "Click to view larger image");
    await unmount();
  });
});

describe("product image preview (source)", () => {
  const view = src("pages/grn/view.jsx");
  const thumb = src("components/grn/GrnProductThumbnail.jsx");
  const modal = src("components/grn/GrnImagePreviewModal.jsx");

  it("the Image column renders the clickable thumbnail from the same URL", () => {
    const column = view.slice(view.indexOf('field: "product.image_link"'), view.indexOf('headerName: "Name"'));
    assert.match(column, /headerName: "Image"/);
    assert.match(column, /width: 72/);
    assert.match(column, /valueGetter: \(params\) => params\.data\?\.product\?\.image_link/);
    assert.match(column, /<GrnProductThumbnail\s+src=\{params\.value\}/);
    assert.match(column, /if \(!params\.value\) return "—";/);
  });

  it("one page-level preview, opened by the thumbnail and cleared on close", () => {
    assert.match(view, /<GrnImagePreviewModal\s+isOpen=\{Boolean\(previewImage\)\}\s+onClose=\{\(\) => setPreviewImage\(null\)\}/);
    assert.match(view, /onOpen=\{\(src, alt\) => setPreviewImage\(\{ src, alt \}\)\}/);
  });

  it("the thumbnail keeps its 48px size and shows a pointer and hover cue", () => {
    assert.match(thumb, /maxWidth: "48px"/);
    assert.match(thumb, /maxHeight: "48px"/);
    assert.match(thumb, /cursor="pointer"/);
    assert.match(thumb, /_hover=/);
  });

  it("the preview keeps the aspect ratio inside the viewport and never navigates", () => {
    assert.match(modal, /objectFit="contain"/);
    assert.match(modal, /maxW="90vw"/);
    assert.match(modal, /maxH="90vh"/);
    for (const file of [thumb, modal]) {
      assert.ok(!/window\.open|target=|router\.push|href=/.test(file));
    }
  });

  it("the rest of the Products grid is untouched", () => {
    assert.match(view, /tableKey="grn-detail-products"/);
    assert.match(view, /<Box overflowX="auto" w="100%">/);
    assert.match(view, /getMismatchRowStyle\(params\.data\?\._priceMismatch, mismatchBg\) \?\?/);
  });
});
