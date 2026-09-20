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

module.exports = { render, load, textOf, decodeEntities, unavailable, root };
