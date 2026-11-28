const state = {
  color: { r: 74, g: 217, b: 167 },
  format: "hex",
  saved: [],
  installPrompt: null
};

const elements = {
  colorField: document.getElementById("color-field"),
  crosshair: document.getElementById("color-field-crosshair"),
  hueSlider: document.getElementById("hue-slider"),
  hueValue: document.getElementById("hue-value"),
  nativeColor: document.getElementById("native-color"),
  previewHex: document.getElementById("preview-hex"),
  formatControls: document.getElementById("format-controls"),
  formatCaption: document.getElementById("format-caption"),
  formatTabs: [...document.querySelectorAll("[data-format]")],
  contrastPreview: document.getElementById("contrast-preview"),
  contrastRatio: document.getElementById("contrast-ratio"),
  contrastAa: document.getElementById("contrast-aa"),
  contrastAaa: document.getElementById("contrast-aaa"),
  contrastBest: document.getElementById("contrast-best"),
  swatches: document.getElementById("swatches"),
  paletteNote: document.getElementById("palette-note"),
  status: document.getElementById("status"),
  installButton: document.getElementById("install-app")
};

const formatDetails = {
  hex: { caption: "Hexadecimal color notation", channels: [] },
  rgb: { caption: "Red · green · blue light values", channels: ["R", "G", "B"] },
  hsl: { caption: "Hue · saturation · lightness", channels: ["H", "S", "L"] },
  hwb: { caption: "Hue · whiteness · blackness", channels: ["H", "W", "B"] },
  hsv: { caption: "Hue · saturation · value", channels: ["H", "S", "V"] }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toHex(value) {
  return Math.round(value).toString(16).padStart(2, "0").toUpperCase();
}

function hexColor({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = h / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  let rgb;
  if (section < 1) rgb = [chroma, secondary, 0];
  else if (section < 2) rgb = [secondary, chroma, 0];
  else if (section < 3) rgb = [0, chroma, secondary];
  else if (section < 4) rgb = [0, secondary, chroma];
  else if (section < 5) rgb = [secondary, 0, chroma];
  else rgb = [chroma, 0, secondary];
  const offset = l - chroma / 2;
  return { r: (rgb[0] + offset) * 255, g: (rgb[1] + offset) * 255, b: (rgb[2] + offset) * 255 };
}

function rgbToHwb(color) {
  const hsl = rgbToHsl(color);
  const values = [color.r, color.g, color.b];
  return {
    h: hsl.h,
    w: Math.min(...values) / 255 * 100,
    b: (1 - Math.max(...values) / 255) * 100
  };
}

function hwbToRgb(h, w, b) {
  w = clamp(w, 0, 100) / 100;
  b = clamp(b, 0, 100) / 100;
  const total = w + b;
  if (total > 1) {
    w /= total;
    b /= total;
  }
  const pure = hslToRgb(h, 100, 50);
  const scale = 1 - w - b;
  return {
    r: pure.r / 255 * scale * 255 + w * 255,
    g: pure.g / 255 * scale * 255 + w * 255,
    b: pure.b / 255 * scale * 255 + w * 255
  };
}

function rgbToHsv({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb(h, s, v) {
  const chroma = v * s;
  const section = ((h % 360) + 360) % 360 / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  let rgb;
  if (section < 1) rgb = [chroma, secondary, 0];
  else if (section < 2) rgb = [secondary, chroma, 0];
  else if (section < 3) rgb = [0, chroma, secondary];
  else if (section < 4) rgb = [0, secondary, chroma];
  else if (section < 5) rgb = [secondary, 0, chroma];
  else rgb = [chroma, 0, secondary];
  const offset = v - chroma;
  return { r: (rgb[0] + offset) * 255, g: (rgb[1] + offset) * 255, b: (rgb[2] + offset) * 255 };
}

function roundedColor(color) {
  return { r: Math.round(clamp(color.r, 0, 255)), g: Math.round(clamp(color.g, 0, 255)), b: Math.round(clamp(color.b, 0, 255)) };
}

function updateHueUI() {
  const { h } = rgbToHsl(state.color);
  elements.hueSlider.value = String(Math.round(h));
  elements.hueValue.value = `${Math.round(h)}°`;
  elements.hueValue.textContent = `${Math.round(h)}°`;
  elements.colorField.style.setProperty("--hue", `${h}`);
  const hsv = rgbToHsv(state.color);
  elements.crosshair.style.left = `${hsv.s * 100}%`;
  elements.crosshair.style.top = `${(1 - hsv.v) * 100}%`;
}

function luminance({ r, g, b }) {
  const channel = value => {
    value /= 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a, b) {
  const high = Math.max(luminance(a), luminance(b));
  const low = Math.min(luminance(a), luminance(b));
  return (high + 0.05) / (low + 0.05);
}

function updateContrast() {
  const black = { r: 17, g: 19, b: 24 };
  const white = { r: 255, g: 255, b: 255 };
  const blackRatio = contrastRatio(state.color, black);
  const whiteRatio = contrastRatio(state.color, white);
  const best = blackRatio >= whiteRatio ? "dark" : "light";
  const bestColor = best === "dark" ? "#111318" : "#ffffff";
  const ratio = Math.max(blackRatio, whiteRatio);
  elements.contrastPreview.style.backgroundColor = hexColor(state.color);
  elements.contrastPreview.style.color = bestColor;
  elements.contrastRatio.textContent = `${ratio.toFixed(2)}:1`;
  elements.contrastAa.className = blackRatio >= 4.5 || whiteRatio >= 4.5 ? "pass" : "fail";
  elements.contrastAaa.className = blackRatio >= 7 || whiteRatio >= 7 ? "pass" : "fail";
  elements.contrastBest.textContent = `Best text: ${best}`;
}

function syncUI(renderControls = true) {
  state.color = roundedColor(state.color);
  const hex = hexColor(state.color);
  document.documentElement.style.setProperty("--current-color", hex);
  elements.previewHex.textContent = hex;
  elements.nativeColor.value = hex.toLowerCase();
  updateHueUI();
  updateContrast();
  if (renderControls) renderFormat();
  const url = new URL(window.location.href);
  url.searchParams.set("color", hex.slice(1).toLowerCase());
  window.history.replaceState({}, "", url);
  document.title = `${hex} · colorpic`;
}

function makeRange(id, label, value, max, unit = "") {
  const row = document.createElement("div");
  row.className = "channel-row";
  const inputId = `channel-${id.toLowerCase()}`;
  const title = document.createElement("label");
  title.htmlFor = inputId;
  title.textContent = label;
  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = inputId;
  slider.min = "0";
  slider.max = String(max);
  slider.step = "1";
  slider.value = String(Math.round(value));
  slider.setAttribute("aria-label", `${label} value`);
  const number = document.createElement("input");
  number.type = "number";
  number.min = "0";
  number.max = String(max);
  number.step = "1";
  number.value = String(Math.round(value));
  number.setAttribute("aria-label", `${label} numeric value${unit}`);
  const update = raw => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const next = clamp(Math.round(parsed), 0, max);
    slider.value = String(next);
    number.value = String(next);
    if (state.format === "rgb") {
      state.color[label.toLowerCase()] = next;
    } else if (state.format === "hsv") {
      const current = rgbToHsv(state.color);
      const key = label.toLowerCase();
      current[key] = key === "h" ? next : next / 100;
      state.color = hsvToRgb(current.h, current.s, current.v);
    } else {
      const current = state.format === "hsl" ? rgbToHsl(state.color) : rgbToHwb(state.color);
      const key = label.toLowerCase();
      current[key] = next;
      state.color = state.format === "hsl"
        ? hslToRgb(current.h, current.s, current.l)
        : hwbToRgb(current.h, current.w, current.b);
    }
    syncUI(false);
  };
  slider.addEventListener("input", () => update(slider.value));
  number.addEventListener("input", () => update(number.value));
  row.append(title, slider, number);
  return row;
}

function renderFormat() {
  elements.formatTabs.forEach(tab => {
    const selected = tab.dataset.format === state.format;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  elements.formatControls.replaceChildren();
  elements.formatControls.setAttribute("aria-labelledby", `tab-${state.format}`);
  elements.formatCaption.textContent = formatDetails[state.format].caption;

  if (state.format === "hex") {
    const wrapper = document.createElement("div");
    wrapper.className = "hex-control";
    const label = document.createElement("label");
    label.className = "control-label";
    label.htmlFor = "hex-input";
    label.textContent = "Paste any CSS color or enter a HEX value";
    const row = document.createElement("div");
    row.className = "hex-input-row";
    const input = document.createElement("input");
    input.id = "hex-input";
    input.type = "text";
    input.value = hexColor(state.color);
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-describedby", "hex-error");
    const copy = document.createElement("button");
    copy.type = "button";
    copy.setAttribute("aria-label", "Copy HEX value");
    copy.title = "Copy HEX value";
    copy.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
    copy.addEventListener("click", () => copyText(hexColor(state.color), "HEX copied."));
    const error = document.createElement("p");
    error.id = "hex-error";
    error.className = "input-error";
    const applyValue = () => {
      const parsed = parseColor(input.value.trim());
      if (!parsed) {
        error.textContent = "That color value isn’t recognized yet.";
        return;
      }
      error.textContent = "";
      state.color = parsed;
      syncUI();
    };
    input.addEventListener("change", applyValue);
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyValue();
        input.blur();
      }
    });
    row.append(input, copy);
    wrapper.append(label, row, error);
    elements.formatControls.append(wrapper);
    return;
  }

  const values = state.format === "rgb"
    ? state.color
    : state.format === "hsl" ? rgbToHsl(state.color)
      : state.format === "hwb" ? rgbToHwb(state.color)
        : (() => {
          const hsv = rgbToHsv(state.color);
          return { h: hsv.h, s: hsv.s * 100, v: hsv.v * 100 };
        })();
  const keys = formatDetails[state.format].channels;
  const maxes = state.format === "rgb"
    ? { r: 255, g: 255, b: 255 }
    : state.format === "hsv"
      ? { h: 359, s: 100, v: 100 }
      : { h: 359, s: 100, l: 100, w: 100, b: 100 };
  const row = document.createElement("div");
  row.className = "channels";
  keys.forEach(key => row.append(makeRange(key, key, values[key.toLowerCase()], maxes[key.toLowerCase()])));
  elements.formatControls.append(row);
}

function parseColor(value) {
  const hex = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) digits = [...digits].slice(0, 3).map(char => char + char).join("");
    else digits = digits.slice(0, 6);
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16)
    };
  }
  if (!CSS.supports("color", value)) return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#010203";
  context.fillStyle = value;
  if (context.fillStyle === "#010203" && value.toLowerCase() !== "#010203") return null;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
  if (alpha === 0) return null;
  return { r, g, b };
}

async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    announce(successMessage);
  } catch (error) {
    console.error("Could not copy color value:", error);
    announce("Clipboard access is unavailable. Select and copy the color value.");
  }
}

function announce(message) {
  elements.status.textContent = "";
  window.setTimeout(() => { elements.status.textContent = message; }, 20);
}

function renderSwatches() {
  elements.swatches.replaceChildren();
  if (!state.saved.length) {
    const empty = document.createElement("span");
    empty.className = "swatch-empty";
    empty.textContent = "No saved colors yet — tap the heart to keep one.";
    elements.swatches.append(empty);
    return;
  }
  state.saved.forEach(color => {
    const item = document.createElement("div");
    item.className = "swatch-item";
    const button = document.createElement("button");
    button.className = "swatch-button";
    button.type = "button";
    button.style.setProperty("--swatch", color);
    button.title = `${color} · click to use`;
    button.setAttribute("aria-label", `Use saved color ${color}`);
    button.addEventListener("click", () => {
      state.color = parseColor(color);
      syncUI();
    });
    const remove = document.createElement("button");
    remove.className = "swatch-remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove saved color ${color}`);
    remove.addEventListener("click", () => {
      state.saved = state.saved.filter(saved => saved !== color);
      persistColors();
      renderSwatches();
      elements.paletteNote.textContent = `${color} removed from your palette.`;
    });
    item.append(button, remove);
    elements.swatches.append(item);
  });
}

function persistColors() {
  try {
    localStorage.setItem("colorpic-palette", JSON.stringify(state.saved));
  } catch (error) {
    console.error("Could not save your palette:", error);
    elements.paletteNote.textContent = "Could not save palette in this browser.";
  }
}

function setFromField(event) {
  const bounds = elements.colorField.getBoundingClientRect();
  const saturation = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
  const value = 1 - clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
  state.color = hsvToRgb(Number(elements.hueSlider.value), saturation, value);
  syncUI();
}

elements.formatTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    state.format = tab.dataset.format;
    renderFormat();
  });
  tab.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const current = elements.formatTabs.indexOf(tab);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = elements.formatTabs[(current + offset + elements.formatTabs.length) % elements.formatTabs.length];
    next.focus();
    next.click();
  });
});

elements.colorField.addEventListener("pointerdown", event => {
  elements.colorField.setPointerCapture(event.pointerId);
  setFromField(event);
});
elements.colorField.addEventListener("pointermove", event => {
  if (event.buttons === 1 || event.pressure > 0) setFromField(event);
});
elements.colorField.addEventListener("keydown", event => {
  const directions = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, 1],
    ArrowDown: [0, -1]
  };
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  const hsv = rgbToHsv(state.color);
  const step = event.shiftKey ? 0.05 : 0.01;
  state.color = hsvToRgb(
    Number(elements.hueSlider.value),
    clamp(hsv.s + direction[0] * step, 0, 1),
    clamp(hsv.v + direction[1] * step, 0, 1)
  );
  syncUI();
});
elements.hueSlider.addEventListener("input", () => {
  const hsv = rgbToHsv(state.color);
  state.color = hsvToRgb(Number(elements.hueSlider.value), hsv.s, hsv.v);
  syncUI();
});
elements.nativeColor.addEventListener("input", () => {
  state.color = parseColor(elements.nativeColor.value);
  syncUI();
});
document.getElementById("copy-hex").addEventListener("click", () => copyText(hexColor(state.color), "HEX copied."));
document.getElementById("copy-css").addEventListener("click", () => {
  const color = state.color;
  const value = state.format === "hex" ? hexColor(color) : state.format === "rgb"
    ? `rgb(${color.r} ${color.g} ${color.b})`
    : state.format === "hsv" ? `rgb(${color.r} ${color.g} ${color.b})`
      : state.format === "hsl" ? (() => {
      const { h, s, l } = rgbToHsl(color);
      return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
    })()
      : (() => {
        const { h, w, b } = rgbToHwb(color);
        return `hwb(${Math.round(h)} ${Math.round(w)}% ${Math.round(b)}%)`;
      })();
  copyText(value, state.format === "hsv" ? "Equivalent RGB CSS value copied." : `${state.format.toUpperCase()} value copied.`);
});

document.getElementById("eyedropper").addEventListener("click", async () => {
  if (!window.EyeDropper) {
    announce("Screen color picking isn’t supported in this browser. Try the system picker instead.");
    return;
  }
  try {
    const result = await new EyeDropper().open();
    const pickedColor = parseColor(result.sRGBHex);
    if (!pickedColor) throw new Error("Screen picker returned an invalid color.");
    state.color = pickedColor;
    syncUI();
    announce(`${result.sRGBHex.toUpperCase()} picked from screen.`);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Could not open screen color picker:", error);
      announce("Could not open the screen color picker.");
    }
  }
});

document.getElementById("save-color").addEventListener("click", () => {
  const color = hexColor(state.color);
  if (state.saved.includes(color)) {
    elements.paletteNote.textContent = `${color} is already in your palette. Right-click a swatch to remove it.`;
    return;
  }
  if (state.saved.length >= 24) {
    elements.paletteNote.textContent = "Your palette is full. Right-click a swatch to make room.";
    return;
  }
  state.saved.unshift(color);
  persistColors();
  renderSwatches();
  elements.paletteNote.textContent = `${color} saved. Right-click a swatch to remove it.`;
});

document.getElementById("share-color").addEventListener("click", async () => {
  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set("color", hexColor(state.color).slice(1).toLowerCase());
  if (navigator.share) {
    try {
      await navigator.share({ title: "A color from colorpic", text: hexColor(state.color), url: shareUrl.href });
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Could not share color:", error);
        copyText(shareUrl.href, "Color link copied.");
      }
    }
  } else {
    copyText(shareUrl.href, "Color link copied.");
  }
});

elements.installButton.addEventListener("click", async () => {
  if (state.installPrompt) {
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    elements.installButton.hidden = true;
  } else {
    announce("Use your browser’s menu and choose Install app or Add to Home Screen.");
  }
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  state.installPrompt = event;
  elements.installButton.hidden = false;
});
window.addEventListener("appinstalled", () => {
  elements.installButton.hidden = true;
  announce("colorpic installed.");
});

try {
  const saved = JSON.parse(localStorage.getItem("colorpic-palette") || "[]");
  if (Array.isArray(saved)) state.saved = saved.filter(color => typeof color === "string" && /^#[\da-f]{6}$/i.test(color)).slice(0, 24);
} catch (error) {
  console.error("Could not load your palette:", error);
}
renderSwatches();

const initialColor = new URLSearchParams(window.location.search).get("color");
if (initialColor) {
  const parsedColor = parseColor(initialColor);
  if (parsedColor) state.color = parsedColor;
}
syncUI();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/colorpic/serviceWorker.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}
