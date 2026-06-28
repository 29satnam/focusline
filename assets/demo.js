/* Focusline live demo — a faithful recreation of the macOS app.
 *
 * The MacBook shows the effect on a page; the panel is the app's "Choose a
 * mode" + Customize flow. Mode picks a recipe (which bar + which tint), and the
 * controls mirror the app exactly: Reading bar = None/Bar/Highlight (or
 * None/Spotlight), Colour, Opacity, Keep bar centered, Size, and Screen tint —
 * each shown only for the Modes that use it, per the app's `allowedBarStyles`.
 */
(function () {
  const reader = document.getElementById("reader");
  const band = document.getElementById("band");
  const bar = document.getElementById("bar");
  const dim = document.getElementById("dim");
  const hole = document.getElementById("hole");
  if (!reader) return;

  // Per-Mode recipe, mirroring ReadingMode.recipe + allowedBarStyles in the app.
  const MODES = {
    off:       { tint: "none",  bars: [],                     defBar: "none",      tagline: "Everything off." },
    reading:   { tint: "none",  bars: ["bar", "highlight"],   defBar: "bar",       tagline: "A clear line guides every line you read." },
    focus:     { tint: "focus", bars: ["bar", "highlight"],   defBar: "bar",       tagline: "Everything but your app fades away." },
    spotlight: { tint: "none",  bars: ["spotlight"],          defBar: "spotlight", tagline: "A spotlight on the line you're reading." },
    night:     { tint: "night", bars: ["bar", "highlight"],   defBar: "bar",       tagline: "Warm, dim light that's easy on the eyes." },
  };

  const state = {
    mode: "reading",
    barStyle: "bar",          // none | bar | highlight | spotlight
    shape: "round",           // round | rectangle | square | bar
    centered: false,
    color: "#ffd15c",
    opacity: 0.9,
    size: 6,
    width: 0.8,
    spot: 150,
    strength: 0.55,
    x: 0, y: 0,
  };

  function setFromEvent(e) {
    const r = reader.getBoundingClientRect();
    state.x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    state.y = Math.max(0, Math.min(r.height, e.clientY - r.top));
    render();
  }
  reader.addEventListener("pointermove", setFromEvent);
  reader.addEventListener("pointerleave", () => {
    const r = reader.getBoundingClientRect();
    state.x = r.width / 2; state.y = r.height * 0.45; render();
  });

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function render() {
    const { mode, barStyle, x, y, color, size, width } = state;
    const R = reader.getBoundingClientRect();
    band.style.cssText = ""; bar.style.cssText = ""; dim.style.cssText = "";
    dim.className = "layer"; hole.style.cssText = "display:none";

    const tint = MODES[mode].tint;

    // --- Screen tint (independent of the bar, like the app) ---
    if (tint === "night") {
      dim.classList.add("night");
      dim.style.background = rgba("#281600", 0.35 + state.strength * 0.5);
    } else if (tint === "focus") {
      // Distraction-Free: dim everything but a clear band around the line.
      Object.assign(hole.style, holeBox(R.width / 2, y, R.width + 40, 70, "8px"));
    }

    // --- Reading bar ---
    if (barStyle === "spotlight") {
      let w, h, radius;
      if (state.shape === "bar") { w = R.width + 40; h = 64; radius = "8px"; }
      else if (state.shape === "rectangle") { w = state.spot * 1.9; h = state.spot * 0.78; radius = "16px"; }
      else if (state.shape === "square") { w = state.spot; h = state.spot; radius = "18px"; }
      else { w = state.spot; h = state.spot; radius = "50%"; }
      const cx = state.shape === "bar" ? R.width / 2 : x;
      Object.assign(hole.style, holeBox(cx, y, w, h, radius));
    } else if (barStyle === "bar" || barStyle === "highlight") {
      const wpx = Math.max(40, R.width * width);
      const left = state.centered ? (R.width - wpx) / 2
        : Math.max(0, Math.min(R.width - wpx, x - wpx / 2));
      if (barStyle === "highlight") {
        const h = Math.max(18, size * 4);
        Object.assign(band.style, {
          position: "absolute", left: `${left}px`, width: `${wpx}px`,
          top: `${y - h / 2}px`, height: `${h}px`,
          background: rgba(color, 0.32), borderRadius: "5px",
        });
      } else {
        Object.assign(bar.style, {
          position: "absolute", left: `${left}px`, width: `${wpx}px`,
          top: `${y + 10}px`, height: `${size}px`,
          background: rgba(color, state.opacity), borderRadius: "999px",
          boxShadow: `0 0 10px ${rgba(color, 0.6)}`,
        });
      }
    }
  }

  function holeBox(cx, cy, w, h, radius) {
    return {
      display: "block", position: "absolute",
      left: `${cx - w / 2}px`, top: `${cy - h / 2}px`,
      width: `${w}px`, height: `${h}px`, borderRadius: radius,
      boxShadow: `0 0 0 9999px rgba(8, 8, 10, ${state.strength})`,
    };
  }

  // ---- Mode cards ----
  const tagText = document.getElementById("tag-text");
  function selectMode(m) {
    state.mode = m;
    state.barStyle = MODES[m].defBar;
    document.querySelectorAll('[data-seg="mode"] .modecard')
      .forEach((c) => c.classList.toggle("on", c.dataset.val === m));
    if (tagText) tagText.textContent = MODES[m].tagline;
    buildBarStyleSeg();
    syncControls();
    render();
  }
  document.querySelectorAll('[data-seg="mode"] .modecard').forEach((c) =>
    c.addEventListener("click", () => selectMode(c.dataset.val)));

  // Reading-bar segmented control, rebuilt per Mode (None + that Mode's styles).
  const barSeg = document.querySelector('[data-seg="barstyle"]');
  const labels = { none: "None", bar: "Bar", highlight: "Highlight", spotlight: "Spotlight" };
  function buildBarStyleSeg() {
    const opts = ["none", ...MODES[state.mode].bars];
    barSeg.innerHTML = opts.map((o) =>
      `<button data-val="${o}" class="${o === state.barStyle ? "on" : ""}">${labels[o]}</button>`).join("");
    barSeg.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        state.barStyle = b.dataset.val;
        barSeg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        syncControls(); render();
      }));
  }

  function bindSeg(name, key, after) {
    const btns = document.querySelectorAll(`[data-seg="${name}"] button`);
    btns.forEach((b) => b.addEventListener("click", () => {
      state[key] = b.dataset.val;
      btns.forEach((x) => x.classList.toggle("on", x === b));
      if (after) after(); render();
    }));
  }
  bindSeg("shape", "shape", syncControls);

  document.querySelectorAll(".swatch").forEach((s) =>
    s.addEventListener("click", () => {
      state.color = s.dataset.color;
      document.querySelectorAll(".swatch").forEach((x) => x.classList.toggle("on", x === s));
      render();
    }));

  document.querySelectorAll('[data-seg="strength"] button').forEach((b) =>
    b.addEventListener("click", () => {
      state.strength = parseFloat(b.dataset.val);
      document.querySelectorAll('[data-seg="strength"] button').forEach((x) => x.classList.toggle("on", x === b));
      render();
    }));

  const centerToggle = document.getElementById("centered");
  if (centerToggle) centerToggle.addEventListener("click", () => {
    state.centered = !state.centered;
    centerToggle.classList.toggle("on", state.centered);
    render();
  });

  function bindRange(id, key, fmt) {
    const el = document.getElementById(id);
    if (!el) return;
    const out = document.getElementById(id + "-val");
    const update = () => { state[key] = parseFloat(el.value); if (out && fmt) out.textContent = fmt(state[key]); render(); };
    el.addEventListener("input", update); update();
  }
  bindRange("opacity", "opacity", (v) => `${Math.round(v * 100)}%`);
  bindRange("size", "size", (v) => `${Math.round(v)} px`);
  bindRange("width", "width", (v) => `${Math.round(v * 100)}%`);
  bindRange("spot", "spot", (v) => `${Math.round(v)} px`);

  function show(id, on) { const el = document.getElementById(id); if (el) el.classList.toggle("hidden", !on); }
  function syncControls() {
    const m = MODES[state.mode];
    const isOff = state.mode === "off";
    const line = state.barStyle === "bar" || state.barStyle === "highlight";
    const spot = state.barStyle === "spotlight";
    show("tagline", !isOff);
    show("customize-head", !isOff);
    show("g-bar", !isOff);
    show("g-color", line);
    show("g-opacity", state.barStyle === "bar");
    show("g-centered", line);
    show("g-size", line);
    show("g-width", line);
    show("g-shape", spot);
    show("g-spot", spot && state.shape !== "bar");
    show("g-tint", m.tint !== "none");          // Screen-tint section
    show("g-strength", m.tint !== "none");
    show("g-nightwash", m.tint === "night");
  }

  // Match panel height to the MacBook; body scrolls if controls overflow.
  const macbook = document.querySelector(".macbook");
  const panel = document.querySelector(".app-panel");
  function syncPanelHeight() {
    if (!macbook || !panel) return;
    if (window.innerWidth <= 760) { panel.style.height = ""; return; }
    panel.style.height = macbook.offsetHeight + "px";
  }
  window.addEventListener("resize", syncPanelHeight);
  if (window.ResizeObserver) new ResizeObserver(syncPanelHeight).observe(macbook);

  const r0 = reader.getBoundingClientRect();
  state.x = r0.width / 2; state.y = r0.height * 0.45;
  selectMode("reading");
  requestAnimationFrame(syncPanelHeight);
})();
