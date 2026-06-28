/* Focusline live demo.
 *
 * Recreates the macOS app's real behaviour in the browser: a reading guide that
 * follows the pointer, in each of the four Modes, with the same customisation
 * the app exposes — guide style, spotlight shape, follow-vs-centred, colour,
 * opacity, thickness, width, vertical offset, and dim strength.
 *
 * The dim/spotlight uses the classic "hole" trick: a small shape with a huge
 * box-shadow spread paints everything around it, leaving the shape clear. The
 * reader clips the overflow, so it reads exactly like the app dimming the screen
 * around a clear region.
 */
(function () {
  const reader = document.getElementById("reader");
  const band = document.getElementById("band");
  const bar = document.getElementById("bar");
  const dim = document.getElementById("dim");
  const hole = document.getElementById("hole");
  if (!reader) return;

  const state = {
    mode: "reading",          // reading | focus | spotlight | night
    style: "bar",             // bar | highlight (line modes)
    shape: "round",           // round | rectangle | square | bar (spotlight)
    position: "follow",       // follow | centered (line modes)
    color: "#ffd15c",
    opacity: 0.9,             // bar/band opacity
    size: 6,                  // bar thickness / band height (px)
    width: 0.8,               // guide width, fraction of the page
    offsetY: 10,              // how far below the pointer line the bar sits
    spot: 150,                // spotlight radius (px)
    strength: 0.55,           // dim strength
    x: 0,
    y: 0,
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
    state.x = r.width / 2;
    state.y = r.height * 0.45;
    render();
  });

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function render() {
    const { mode, style, x, y, color, size, width, offsetY } = state;
    const R = reader.getBoundingClientRect();
    band.style.cssText = "";
    bar.style.cssText = "";
    dim.style.cssText = "";
    dim.className = "layer";
    hole.style.cssText = "display:none";

    const lineMode = mode === "reading" || mode === "focus" || mode === "night";

    // --- Reading guide (bar or highlight) ---
    if (lineMode) {
      const wpx = Math.max(40, R.width * width);
      const left = state.position === "centered"
        ? (R.width - wpx) / 2
        : Math.max(0, Math.min(R.width - wpx, x - wpx / 2));
      if (style === "highlight") {
        const h = Math.max(18, size * 4);
        Object.assign(band.style, {
          position: "absolute", left: `${left}px`, width: `${wpx}px`,
          top: `${y - h / 2}px`, height: `${h}px`,
          background: rgba(color, 0.32), borderRadius: "5px",
        });
      } else {
        Object.assign(bar.style, {
          position: "absolute", left: `${left}px`, width: `${wpx}px`,
          top: `${y + offsetY}px`, height: `${size}px`,
          background: rgba(color, state.opacity), borderRadius: "999px",
          boxShadow: `0 0 10px ${rgba(color, 0.6)}`,
        });
      }
    }

    // --- Dim / spotlight ---
    if (mode === "night") {
      // Warm dark wash over the whole page (multiply); the guide still shows.
      dim.classList.add("night");
      dim.style.background = rgba("#281600", 0.35 + state.strength * 0.5);
    } else if (mode === "focus" || mode === "spotlight") {
      const dimColor = `rgba(8, 8, 10, ${state.strength})`;
      let w, h, radius;
      if (mode === "focus" || state.shape === "bar") {
        w = R.width + 40; h = 64; radius = "8px";          // clear horizontal band
      } else if (state.shape === "rectangle") {
        w = state.spot * 1.9; h = state.spot * 0.78; radius = "16px";
      } else if (state.shape === "square") {
        w = state.spot; h = state.spot; radius = "18px";
      } else {                                              // round
        w = state.spot; h = state.spot; radius = "50%";
      }
      const cx = (mode === "focus" || state.shape === "bar") ? R.width / 2 : x;
      const cy = y;
      Object.assign(hole.style, {
        display: "block", position: "absolute",
        left: `${cx - w / 2}px`, top: `${cy - h / 2}px`,
        width: `${w}px`, height: `${h}px`, borderRadius: radius,
        boxShadow: `0 0 0 9999px ${dimColor}`,
      });
    }
  }

  // ---- Controls ----
  function bindSeg(name, key, after) {
    const btns = document.querySelectorAll(`[data-seg="${name}"] button`);
    btns.forEach((b) => b.addEventListener("click", () => {
      state[key] = b.dataset.val;
      btns.forEach((x) => x.classList.toggle("on", x === b));
      if (after) after();
      render();
    }));
  }
  bindSeg("mode", "mode", syncControls);
  bindSeg("style", "style", syncControls);
  bindSeg("shape", "shape", syncControls);
  bindSeg("position", "position");

  document.querySelectorAll(".swatch").forEach((s) => {
    s.addEventListener("click", () => {
      state.color = s.dataset.color;
      document.querySelectorAll(".swatch").forEach((x) => x.classList.toggle("on", x === s));
      render();
    });
  });

  // Dim-strength presets (Light / Medium / Strong), like the app's tint presets.
  document.querySelectorAll('[data-seg="strength"] button').forEach((b) => {
    b.addEventListener("click", () => {
      state.strength = parseFloat(b.dataset.val);
      document.querySelectorAll('[data-seg="strength"] button')
        .forEach((x) => x.classList.toggle("on", x === b));
      render();
    });
  });

  function bindRange(id, key, fmt) {
    const el = document.getElementById(id);
    if (!el) return;
    const out = document.getElementById(id + "-val");
    const update = () => {
      state[key] = parseFloat(el.value);
      if (out && fmt) out.textContent = fmt(state[key]);
      render();
    };
    el.addEventListener("input", update);
    update();
  }
  bindRange("opacity", "opacity", (v) => `${Math.round(v * 100)}%`);
  bindRange("size", "size", (v) => `${Math.round(v)} px`);
  bindRange("width", "width", (v) => `${Math.round(v * 100)}%`);
  bindRange("spot", "spot", (v) => `${Math.round(v)} px`);

  function show(id, on) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !on);
  }
  function syncControls() {
    const line = state.mode === "reading" || state.mode === "focus" || state.mode === "night";
    const spot = state.mode === "spotlight";
    show("g-style", line);
    show("g-position", line);
    show("g-color", line);
    show("g-opacity", line && state.style === "bar");
    show("g-size", line);
    show("g-width", line);
    show("g-shape", spot);
    show("g-spot", spot && state.shape !== "bar");
    show("g-strength", state.mode !== "reading");
  }

  const r0 = reader.getBoundingClientRect();
  state.x = r0.width / 2;
  state.y = r0.height * 0.45;
  syncControls();
  render();
})();
