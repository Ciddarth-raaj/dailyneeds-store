/**
 * RENDER A COMPONENT FOR REAL, in a repository with no React test runner.
 *
 * Every other screen test here asserts against SOURCE TEXT, because that is
 * all a bare checkout can do. Source text proves the code says
 * `group.outlet_name`; it cannot prove the browser puts "Kathirkamam" above
 * the two people who work there. Where that distinction is the whole of a
 * change — a grouping that exists only in the API payload is not a grouped
 * screen — a test needs the rendered output, and this is the one place the
 * machinery for it lives.
 *
 * IT USES NEXT'S OWN BABEL PRESET, the one `next build` uses, so the thing
 * under test is the component as it ships rather than an approximation. The
 * component's own imports load through the same hook, so the real module graph
 * renders: a stubbed container would be a different screen.
 *
 * IT REPORTS UNAVAILABILITY RATHER THAN FAILING. `node_modules` is absent on a
 * bare checkout, and a render test that went red there would train everybody
 * to ignore a red suite — which costs more than the test is worth. Callers
 * turn `unavailable` into a `skip`. With the dependencies installed — the
 * state any CI or pre-deploy run is in — it runs, and it is strict.
 */
const path = require("path");

const root = path.join(__dirname, "..");

let React = null;
let ReactDOMServer = null;
let unavailable = null;

try {
  const babel = require("@babel/core");
  React = require("react");
  ReactDOMServer = require("react-dom/server");
  const preset = require.resolve("next/babel");

  const compileJsx = (mod, filename) => {
    const { code } = babel.transformFileSync(filename, {
      presets: [preset],
      filename,
      babelrc: false,
      configFile: false,
    });
    mod._compile(code, filename);
  };

  // Registering the extension also teaches Node's resolver to find
  // `../../CustomContainer` without a suffix, exactly as webpack does.
  require.extensions[".jsx"] = compileJsx;

  /**
   * Some of this project's `.js` files carry JSX too, so they go through the
   * same preset. Everything under `node_modules` is already plain CommonJS and
   * is left to Node, which keeps the hook cheap and keeps a dependency's own
   * build out of these tests.
   */
  const plainJs = require.extensions[".js"];
  require.extensions[".js"] = (mod, filename) => {
    if (filename.startsWith(root) && !filename.includes(`${path.sep}node_modules${path.sep}`)) {
      compileJsx(mod, filename);
      return;
    }
    plainJs(mod, filename);
  };

  /**
   * CSS modules are webpack's job, not Node's. A stylesheet contributes class
   * names and no behaviour, so it loads as an empty object: the real component
   * still renders, unstyled, which is exactly what a text assertion wants.
   */
  require.extensions[".css"] = (mod) => {
    mod.exports = {};
  };
} catch (err) {
  unavailable = err.message;
}

/** The default export of a component module, compiled. */
function load(rel) {
  const mod = require(path.join(root, rel));
  return mod.default || mod;
}

/** Static markup for one component and its props. */
function render(rel, props) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(load(rel), props));
}

/**
 * The rendered text, as a reader sees it, in document order.
 *
 * Emotion emits its `<style>` rules inline in the server markup, and CSS text
 * is not something anybody reads off a screen — it is dropped first, or a
 * stylesheet rule would count as the word next to a heading.
 *
 * ENTITIES ARE DECODED, because the screen shows an apostrophe and the markup
 * shows `&#x27;`. Asserting against the escaped form would mean every sentence
 * a test quotes has to be written the way a serializer spells it rather than
 * the way a person reads it, which is how a wording test stops being about
 * wording.
 */
const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text) {
  return text
    .replace(/&(?:amp|lt|gt|quot|nbsp|#x27|#39);/g, (m) => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function textOf(markup) {
  return decodeEntities(
    String(markup)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
      .replace(/<[^>]+>/g, "\u0001")
  )
    .split("\u0001")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A LIVE COMPONENT IN A REAL DOM, for behaviour a static render cannot show.
 *
 * `render` above answers "what does this look like"; it cannot answer "what
 * happens when somebody clicks the row". An accordion is almost entirely the
 * second question - collapsed by default, one open at a time, click again to
 * close - and a test that only asserted the closed markup would pass on a
 * component whose rows do not open at all.
 *
 * So `mount` runs the component in jsdom with the real `react-dom`, and
 * `click` dispatches a real DOM event through React's own synthetic event
 * system. What is exercised is the component's actual state, its actual
 * handler and its actual re-render - not a reimplementation of any of them in
 * the test.
 *
 * jsdom is a devDependency and nothing in the shipped bundle imports it. The
 * globals are installed once, at mount, because React reads `document` at
 * module scope when it is first required in a DOM environment.
 */
let JSDOM = null;
try {
  ({ JSDOM } = require("jsdom"));
} catch (err) {
  if (!unavailable) unavailable = `jsdom not installed: ${err.message}`;
}

let domReady = false;
function installDom() {
  if (domReady) return;
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.Element = dom.window.Element;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.Event = dom.window.Event;
  global.MouseEvent = dom.window.MouseEvent;
  global.KeyboardEvent = dom.window.KeyboardEvent;
  global.getComputedStyle = dom.window.getComputedStyle;
  // React 17 checks this to decide whether it may use the DOM renderer.
  global.IS_REACT_ACT_ENVIRONMENT = true;

  /**
   * AND THE TEST PROCESS MUST BE ABLE TO EXIT.
   *
   * React's scheduler prefers `MessageChannel` when one exists and keeps its
   * port open for the lifetime of the renderer. A port is an active libuv
   * handle, so `node --test` finishes every assertion and then sits there for
   * ever with nothing to report - which looks exactly like a hung test and is
   * the most expensive kind of flake, because the first instinct is to blame
   * the component.
   *
   * Removing the global makes the scheduler fall back to `setTimeout`, whose
   * handles clear themselves. This changes WHEN React flushes work by a tick;
   * it does not change what it renders, and every mutation here is wrapped in
   * `act`, which flushes before returning either way. `window.close()` is not
   * enough on its own - the port outlives the jsdom window that created it.
   */
  delete global.MessageChannel;
  try {
    delete dom.window.MessageChannel;
  } catch (err) {
    // A getter-only property on some jsdom versions; the global above is the
    // one the scheduler actually reads.
  }

  domReady = true;
}

/**
 * Mount a component and return a handle for reading and clicking it.
 *
 * `act` wraps every mutation so React has flushed before an assertion runs;
 * without it an assertion can read the DOM between a click and the re-render
 * it caused, which is a flaky test that blames the component.
 */
function mount(rel, props) {
  installDom();
  const ReactDOM = require("react-dom");
  const { act } = require("react-dom/test-utils");
  const Component = load(rel);

  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    ReactDOM.render(React.createElement(Component, props), container);
  });

  const api = {
    container,
    /** Every element matching a selector, as an array. */
    all: (selector) => [...container.querySelectorAll(selector)],
    /** The first element matching a selector, or null. */
    one: (selector) => container.querySelector(selector),
    /** The visible text of the mounted tree, as a reader sees it. */
    text: () => textOf(container.innerHTML),
    /** Click an element through React's synthetic event system. */
    click: (el) => {
      if (!el) throw new Error("click() was given nothing to click");
      act(() => {
        el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      return api;
    },
    /** Re-render with new props, as a parent passing fresh data would. */
    setProps: (next) => {
      act(() => {
        ReactDOM.render(React.createElement(Component, next), container);
      });
      return api;
    },
    unmount: () => {
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });
      container.remove();
    },
  };
  return api;
}

module.exports = { render, mount, load, textOf, decodeEntities, unavailable, root };
