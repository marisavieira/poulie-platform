import config from "./config.json" with { type: "json" };

const DEFAULTS = {
  bgColor: "#363A6A",
  textColor: "#BFADFF",
  textTransform: "none",
  bgAlpha: 80,
  borderRadiusPx: 25,
  fontName: "Lexend Deca",
  fontBase: 24,
  iconSize: 26,
  rotateSeconds: 6,
  showSubMonths: true,
  subMonthsSource: "streak",
  subMonthsPrefix: "X",
  showFollower: true,
  showSubscriber: true,
  showTip: true,
  showCheer: true,
  currencySymbol: "$",
  currencyPosition: "before",
  currencySpace: true,
  locale: "pt-BR",
  showCents: false,
  iconFollower: "♥",
  iconSubscriber: "★",
  iconTip: "✦",
  iconCheer: "◆",
  widgetWidthPx: 0,
  widgetHeightPx: 0,
  rtEnabled: true,
  rtSeconds: 3,
  rtSpeed: 3,
  rtHueCycle: true,
  rtHueDeg: 0,
  rtPreset: "poulie",
  rtAngle: 135,
  rtC1: "#363A6A",
  rtC2: "#BFADFF",
  rtC3: "#5C61A6",
  rtC4: "#FFADEB"
};

const PRESETS = {
  poulie: ["#363A6A", "#BFADFF", "#5C61A6", "#FFADEB"],
  berry: ["#7B2FF7", "#F107A3", "#FF6FD8", "#6A5AE0"],
  ocean: ["#2B8CFF", "#00E5FF", "#00C9A7", "#2B8CFF"],
  sunset: ["#FF7A59", "#FFD36E", "#FF4D8D", "#A855F7"],
  aurora: ["#00DBDE", "#FC00FF", "#00C9A7", "#2B8CFF"],
  custom: null
};

const STATE = {
  fieldData: {},
  timer: null,
  index: 0,
  latest: { follower: null, subscriber: null, tip: null, cheer: null },
  rtActive: false,
  rtTimer: null,
  rtHueTimer: null
};

let rootEl;
let iconEl;
let labelEl;
const SETTINGS = { ...DEFAULTS };
let resizeObserver = null;

function initDom() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div id="rotator" role="status" aria-live="polite">
      <span class="icon" aria-hidden="true">★</span>
      <span class="label">Loading...</span>
    </div>
  `;

  rootEl = document.getElementById("rotator");
  iconEl = rootEl?.querySelector(".icon");
  labelEl = rootEl?.querySelector(".label");
}

function parseNum(raw) {
  if (raw === "" || raw == null) return NaN;
  const normalized =
    typeof raw === "string"
      ? raw.trim().replace(",", ".").replace(/\s/g, "")
      : raw;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

function isOn(value) {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1" || value === "Yes" || value === "yes";
}

function hexToRgbaString(hex, alphaPct = 100) {
  const alpha = Math.max(0, Math.min(100, Number(alphaPct || 0))) / 100;
  let safeHex = String(hex || "").trim();
  if (!safeHex) return "";
  if (safeHex.startsWith("#")) safeHex = safeHex.slice(1);
  if (safeHex.length === 3) safeHex = safeHex.split("").map(char => char + char).join("");
  if (safeHex.length !== 6) return "";

  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  if ([r, g, b].some(v => Number.isNaN(v))) return "";
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeFontStack(name) {
  const family = String(name || "Lexend Deca").trim().replace(/["']/g, "\\$&");
  return `'${family}', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`;
}

function addFontLink(href) {
  if (!href) return;
  if (document.querySelector(`link[data-rotator-font="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-rotator-font", href);
  document.head.appendChild(link);
}

function loadGoogleFontFamily(name) {
  const family = String(name || "").trim();
  if (!family) return;
  const query = encodeURIComponent(family).replace(/%20/g, "+");
  addFontLink(`https://fonts.googleapis.com/css2?family=${query}:wght@100..900&display=swap`);
  addFontLink(`https://fonts.googleapis.com/css2?family=${query}&display=swap`);
}

function resolveSubMonths(source = {}) {
  const candidates = [
    source.months,
    source.streak,
    source.cumulativeMonths,
    source.streakMonths,
    source.totalMonths,
    source.multiMonthDuration,
    source.giftDuration,
    source.amount
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 0;
}

function buildRuntimeConfig(fieldData = {}) {
  return { ...config, ...DEFAULTS, ...fieldData };
}

function applyFields(fields = {}) {
  const merged = buildRuntimeConfig(fields);

  SETTINGS.bgColor = String(merged.bgColor || DEFAULTS.bgColor);
  SETTINGS.textColor = String(merged.textColor || DEFAULTS.textColor);
  SETTINGS.bgAlpha = Number.isFinite(parseNum(merged.bgAlpha)) ? Math.max(0, Math.min(100, parseNum(merged.bgAlpha))) : DEFAULTS.bgAlpha;
  SETTINGS.borderRadiusPx = Number.isFinite(parseNum(merged.borderRadius)) ? Math.max(0, Math.min(200, parseNum(merged.borderRadius))) : DEFAULTS.borderRadiusPx;
  SETTINGS.fontName = String(merged.fontName || DEFAULTS.fontName);
  SETTINGS.fontBase = Number.isFinite(parseNum(merged.fontSize)) ? Math.max(8, Math.min(200, parseNum(merged.fontSize))) : DEFAULTS.fontBase;
  SETTINGS.iconSize = Number.isFinite(parseNum(merged.iconSize)) ? Math.max(8, Math.min(240, parseNum(merged.iconSize))) : DEFAULTS.iconSize;

  SETTINGS.textTransform = ["none", "uppercase", "lowercase", "capitalize"].includes(
    String(merged.textTransform || "none").toLowerCase()
  )
    ? String(merged.textTransform || "none").toLowerCase()
    : "none";

  SETTINGS.showSubMonths = isOn(merged.showSubMonths);
  SETTINGS.subMonthsSource = String(merged.subMonthsSource || "streak").toLowerCase() === "months" ? "months" : "streak";
  SETTINGS.subMonthsPrefix = String(merged.subMonthsPrefix ?? "X");

  SETTINGS.currencySymbol = String(merged.currencySymbol ?? "$");
  SETTINGS.currencyPosition = String(merged.currencyPosition || "before").toLowerCase() === "after" ? "after" : "before";
  SETTINGS.currencySpace = isOn(merged.currencySpace);
  SETTINGS.locale = String(merged.locale || "pt-BR");
  SETTINGS.showCents = isOn(merged.showCents);

  SETTINGS.showFollower = merged.showFollower === undefined ? true : isOn(merged.showFollower);
  SETTINGS.showSubscriber = merged.showSubscriber === undefined ? true : isOn(merged.showSubscriber);
  SETTINGS.showTip = merged.showTip === undefined ? true : isOn(merged.showTip);
  SETTINGS.showCheer = merged.showCheer === undefined ? true : isOn(merged.showCheer);

  SETTINGS.iconFollower = String(merged.iconFollower || DEFAULTS.iconFollower);
  SETTINGS.iconSubscriber = String(merged.iconSubscriber || DEFAULTS.iconSubscriber);
  SETTINGS.iconTip = String(merged.iconTip || DEFAULTS.iconTip);
  SETTINGS.iconCheer = String(merged.iconCheer || DEFAULTS.iconCheer);

  SETTINGS.rotateSeconds = Number.isFinite(parseNum(merged.rotateSeconds)) ? Math.max(1, Math.min(999, parseNum(merged.rotateSeconds))) : DEFAULTS.rotateSeconds;

  SETTINGS.widgetWidthPx =
    Number.isFinite(parseNum(merged.widgetWidth)) && parseNum(merged.widgetWidth) > 0
      ? Math.min(4000, Math.max(1, parseNum(merged.widgetWidth)))
      : 0;

  SETTINGS.widgetHeightPx =
    Number.isFinite(parseNum(merged.widgetHeight)) && parseNum(merged.widgetHeight) > 0
      ? Math.min(4000, Math.max(1, parseNum(merged.widgetHeight)))
      : 0;

  SETTINGS.rtEnabled = merged.rtEnabled === undefined ? true : isOn(merged.rtEnabled);
  SETTINGS.rtSeconds = Number.isFinite(parseNum(merged.rtSeconds)) ? Math.max(1, Math.min(20, parseNum(merged.rtSeconds))) : DEFAULTS.rtSeconds;
  SETTINGS.rtSpeed = Number.isFinite(parseNum(merged.rtSpeed)) ? Math.max(1, Math.min(30, parseNum(merged.rtSpeed))) : DEFAULTS.rtSpeed;
  SETTINGS.rtHueCycle = merged.rtHueCycle === undefined ? true : isOn(merged.rtHueCycle);
  SETTINGS.rtHueDeg = Number.isFinite(parseNum(merged.rtHueDeg)) ? Math.max(0, Math.min(360, parseNum(merged.rtHueDeg))) : DEFAULTS.rtHueDeg;
  SETTINGS.rtPreset = String(merged.rtPreset || "poulie").toLowerCase() in PRESETS ? String(merged.rtPreset || "poulie").toLowerCase() : "poulie";
  SETTINGS.rtAngle = Number.isFinite(parseNum(merged.rtAngle)) ? Math.max(0, Math.min(360, parseNum(merged.rtAngle))) : DEFAULTS.rtAngle;
  SETTINGS.rtC1 = String(merged.rtC1 || DEFAULTS.rtC1);
  SETTINGS.rtC2 = String(merged.rtC2 || DEFAULTS.rtC2);
  SETTINGS.rtC3 = String(merged.rtC3 || DEFAULTS.rtC3);
  SETTINGS.rtC4 = String(merged.rtC4 || DEFAULTS.rtC4);

  document.documentElement.style.setProperty("--bgColor", SETTINGS.bgColor);
  document.documentElement.style.setProperty("--textColor", SETTINGS.textColor);
  document.documentElement.style.setProperty("--fontStack", makeFontStack(SETTINGS.fontName));
  document.documentElement.style.setProperty("--fontBase", String(SETTINGS.fontBase));
  document.documentElement.style.setProperty("--textTransform", SETTINGS.textTransform);
  document.documentElement.style.setProperty("--iconSize", String(SETTINGS.iconSize));
  document.documentElement.style.setProperty("--radiusPx", String(SETTINGS.borderRadiusPx));
  document.documentElement.style.setProperty("--widgetWidth", SETTINGS.widgetWidthPx > 0 ? `${SETTINGS.widgetWidthPx}px` : "auto");
  document.documentElement.style.setProperty("--widgetHeight", SETTINGS.widgetHeightPx > 0 ? `${SETTINGS.widgetHeightPx}px` : "auto");
  document.documentElement.style.setProperty("--minGuardW", SETTINGS.widgetWidthPx > 0 ? "0" : "1");
  document.documentElement.style.setProperty("--minGuardH", SETTINGS.widgetHeightPx > 0 ? "0" : "1");

  const rgba = hexToRgbaString(SETTINGS.bgColor, SETTINGS.bgAlpha);
  if (rgba) document.documentElement.style.setProperty("--bgColorRGBA", rgba);
  else document.documentElement.style.removeProperty("--bgColorRGBA");

  loadGoogleFontFamily(SETTINGS.fontName);

  if (!STATE.rtActive) setBgSolid();
}

function setBgSolid() {
  const solid = getComputedStyle(document.documentElement).getPropertyValue("--bgColorRGBA").trim();
  document.documentElement.style.setProperty("--bgFill", solid || SETTINGS.bgColor);
}

function buildRealtimeGradient() {
  const alpha = SETTINGS.bgAlpha;
  const colors = SETTINGS.rtPreset === "custom"
    ? [SETTINGS.rtC1, SETTINGS.rtC2, SETTINGS.rtC3, SETTINGS.rtC4]
    : (PRESETS[SETTINGS.rtPreset] || PRESETS.poulie);

  const rgba = colors.map(color => hexToRgbaString(color, alpha) || color).filter(Boolean);
  const angle = Math.max(0, Math.min(360, Number(SETTINGS.rtAngle || 135)));
  return `linear-gradient(${angle}deg, ${rgba.join(", ")})`;
}

function startHueCycle() {
  clearInterval(STATE.rtHueTimer);

  if (!SETTINGS.rtHueCycle) {
    document.documentElement.style.setProperty("--rtHue", `${Math.max(0, Math.min(360, SETTINGS.rtHueDeg || 0))}deg`);
    return;
  }

  let hue = 0;
  document.documentElement.style.setProperty("--rtHue", "0deg");
  STATE.rtHueTimer = setInterval(() => {
    hue = (hue + 6) % 360;
    document.documentElement.style.setProperty("--rtHue", `${hue}deg`);
  }, 80);
}

function stopHueCycle() {
  clearInterval(STATE.rtHueTimer);
  STATE.rtHueTimer = null;
  document.documentElement.style.setProperty("--rtHue", "0deg");
}

function enabledCategories() {
  const categories = [];
  if (SETTINGS.showFollower) categories.push("follower");
  if (SETTINGS.showSubscriber) categories.push("subscriber");
  if (SETTINGS.showTip) categories.push("tip");
  if (SETTINGS.showCheer) categories.push("cheer");
  return categories;
}

function iconFor(kind) {
  switch (kind) {
    case "follower": return SETTINGS.iconFollower;
    case "subscriber": return SETTINGS.iconSubscriber;
    case "tip": return SETTINGS.iconTip;
    case "cheer": return SETTINGS.iconCheer;
    default: return "✦";
  }
}

function formatEntry(kind) {
  switch (kind) {
    case "follower":
      if (!STATE.latest.follower) return null;
      return { icon: iconFor("follower"), text: `${STATE.latest.follower.name}` };

    case "subscriber": {
      if (!STATE.latest.subscriber) return null;
      const subscriber = STATE.latest.subscriber;
      const count = SETTINGS.subMonthsSource === "months" ? (subscriber.months || 0) : (subscriber.streak || 0);
      const suffix = SETTINGS.showSubMonths && count > 0 ? ` ${SETTINGS.subMonthsPrefix}${count}` : "";
      return { icon: iconFor("subscriber"), text: `${subscriber.name}${suffix}` };
    }

    case "tip": {
      if (!STATE.latest.tip) return null;
      const tip = STATE.latest.tip;
      const amountString = tip.amount != null
        ? Number(tip.amount).toLocaleString(SETTINGS.locale || undefined, {
            minimumFractionDigits: SETTINGS.showCents ? 2 : 0,
            maximumFractionDigits: 2
          })
        : "?";
      const symbol = SETTINGS.currencySymbol || "";
      const space = SETTINGS.currencySpace ? " " : "";
      const valueText = SETTINGS.currencyPosition === "after"
        ? `${amountString}${space}${symbol}`
        : `${symbol}${space}${amountString}`;
      return { icon: iconFor("tip"), text: `${tip.name} ${valueText}` };
    }

    case "cheer": {
      if (!STATE.latest.cheer) return null;
      const cheer = STATE.latest.cheer;
      const bits = cheer.amount != null ? Number(cheer.amount).toLocaleString() : "?";
      return { icon: iconFor("cheer"), text: `${cheer.name} ${bits} bits` };
    }

    default:
      return null;
  }
}

function currentCycleList() {
  const categories = enabledCategories();
  const list = categories.map(kind => ({ kind, entry: formatEntry(kind) })).filter(item => item.entry);

  if (list.length === 0 && categories.length) {
    return [{ kind: categories[0], entry: { icon: iconFor(categories[0]), text: "Aguardando eventos…" } }];
  }

  return list;
}

function renderNormal() {
  if (!rootEl || !iconEl || !labelEl) return;

  const list = currentCycleList();

  if (list.length === 0) {
    iconEl.textContent = "✦";
    labelEl.textContent = "Aguardando eventos…";
    return;
  }

  if (STATE.index >= list.length) STATE.index = 0;
  const { entry } = list[STATE.index];

  labelEl.classList.add("fade-out");
  setTimeout(() => {
    if (!iconEl || !labelEl) return;
    iconEl.textContent = entry.icon;
    labelEl.textContent = entry.text;
    labelEl.classList.remove("fade-out");
  }, 120);
}

function startRotation() {
  clearInterval(STATE.timer);
  renderNormal();
  const seconds = Math.max(1, Number(SETTINGS.rotateSeconds || 6));
  STATE.timer = setInterval(() => {
    if (STATE.rtActive) return;
    STATE.index += 1;
    renderNormal();
  }, seconds * 1000);
}

function formatRealtimeMessage(listener, event) {
  const name = event?.name || event?.username || "—";

  if (listener === "follower-latest") {
    return { icon: iconFor("follower"), text: `${name} just followed!` };
  }

  if (listener === "subscriber-latest") {
    const months = resolveSubMonths(event);
    const suffix = SETTINGS.showSubMonths && months > 0 ? ` ${SETTINGS.subMonthsPrefix}${months}` : "";
    return { icon: iconFor("subscriber"), text: `${name} subscribed!${suffix}` };
  }

  if (listener === "tip-latest") {
    const amountString = event?.amount != null
      ? Number(event.amount).toLocaleString(SETTINGS.locale || undefined, {
          minimumFractionDigits: SETTINGS.showCents ? 2 : 0,
          maximumFractionDigits: 2
        })
      : "?";
    const symbol = SETTINGS.currencySymbol || "";
    const space = SETTINGS.currencySpace ? " " : "";
    const valueText = SETTINGS.currencyPosition === "after"
      ? `${amountString}${space}${symbol}`
      : `${symbol}${space}${amountString}`;
    return { icon: iconFor("tip"), text: `${name} donated ${valueText}` };
  }

  if (listener === "cheer-latest") {
    const bits = event?.amount != null ? Number(event.amount).toLocaleString() : "?";
    return { icon: iconFor("cheer"), text: `${name} cheered ${bits} bits!` };
  }

  return null;
}

function showRealtimeAlert(entry) {
  if (!SETTINGS.rtEnabled || !rootEl || !iconEl || !labelEl || !entry) return;

  STATE.rtActive = true;
  clearTimeout(STATE.rtTimer);

  document.documentElement.style.setProperty("--rtFill", buildRealtimeGradient());
  document.documentElement.style.setProperty("--rtSpeed", `${Math.max(1, Math.min(30, Number(SETTINGS.rtSpeed || 3)))}s`);

  rootEl.classList.remove("rt");
  void rootEl.offsetWidth;
  rootEl.classList.add("rt");

  startHueCycle();

  iconEl.textContent = entry.icon;
  labelEl.textContent = entry.text;
  labelEl.classList.remove("fade-out");

  const duration = Math.max(500, Math.min(20000, Number(SETTINGS.rtSeconds || 3) * 1000));
  STATE.rtTimer = setTimeout(() => {
    STATE.rtActive = false;
    stopHueCycle();
    rootEl.classList.remove("rt");
    setBgSolid();
    renderNormal();
    startRotation();
  }, duration);
}

function computeScaleFor(element) {
  if (!element) return 1;
  const parent = element.parentElement || document.body;
  const width = Math.max(1, parent.clientWidth || window.innerWidth);
  const height = Math.max(1, parent.clientHeight || window.innerHeight);
  const styles = getComputedStyle(document.documentElement);
  const baseWidth = Number(styles.getPropertyValue("--baseW") || 420) || 420;
  const baseHeight = Number(styles.getPropertyValue("--baseH") || 84) || 84;
  const scale = Math.min(width / baseWidth, height / baseHeight);
  return Math.max(0.1, Math.min(5, scale));
}

function applyResponsiveScale() {
  const hasFixedWidth = SETTINGS.widgetWidthPx > 0;
  const hasFixedHeight = SETTINGS.widgetHeightPx > 0;
  const scale = (hasFixedWidth || hasFixedHeight) ? 1 : computeScaleFor(rootEl);
  document.documentElement.style.setProperty("--scale", String(scale));
}

function bindResizeObserver() {
  if (!rootEl) return;

  if (window.ResizeObserver) {
    if (resizeObserver) {
      try { resizeObserver.disconnect(); } catch (error) {}
    }

    resizeObserver = new ResizeObserver(() => applyResponsiveScale());
    resizeObserver.observe(rootEl);
  } else {
    window.addEventListener("resize", () => {
      clearTimeout(window.__rotatorResizeTimeout);
      window.__rotatorResizeTimeout = setTimeout(applyResponsiveScale, 50);
    });
  }

  applyResponsiveScale();
}

function syncSessionData(session = {}) {
  if (session["follower-latest"]) {
    STATE.latest.follower = {
      name: session["follower-latest"].name || session["follower-latest"].username || "—"
    };
  }

  if (session["subscriber-latest"]) {
    const subscriber = session["subscriber-latest"];
    const months = resolveSubMonths(subscriber);
    STATE.latest.subscriber = {
      name: subscriber.name || subscriber.username || "—",
      tier: subscriber.tier || subscriber.plan || "",
      months,
      streak: (Number(subscriber.streak) || 0) || months
    };
  }

  if (session["tip-latest"]) {
    const tip = session["tip-latest"];
    STATE.latest.tip = {
      name: tip.name || tip.username || "Anônimo",
      amount: tip.amount,
      currency: tip.currency || ""
    };
  }

  if (session["cheer-latest"]) {
    const cheer = session["cheer-latest"];
    STATE.latest.cheer = {
      name: cheer.name || cheer.username || "—",
      amount: cheer.amount
    };
  }
}

function updateLatestFromEvent(listener, event) {
  switch (listener) {
    case "follower-latest":
      STATE.latest.follower = { name: event?.name || event?.username || "—" };
      break;

    case "subscriber-latest": {
      const months = resolveSubMonths(event || {});
      STATE.latest.subscriber = {
        name: event?.name || event?.username || "—",
        tier: event?.tier || event?.plan || "",
        months,
        streak: (Number(event?.streak) || 0) || months
      };
      break;
    }

    case "tip-latest":
      STATE.latest.tip = {
        name: event?.name || event?.username || "Anônimo",
        amount: event?.amount,
        currency: event?.currency || ""
      };
      break;

    case "cheer-latest":
      STATE.latest.cheer = {
        name: event?.name || event?.username || "—",
        amount: event?.amount
      };
      break;

    default:
      return false;
  }

  return true;
}

function bindStreamElementsEvents() {
  window.addEventListener("onWidgetLoad", (obj) => {
    const session = obj?.detail?.session?.data || {};
    syncSessionData(session);
    renderNormal();
    startRotation();
  });

  window.addEventListener("onEventReceived", (obj) => {
    const listener = obj?.detail?.listener;
    const event = obj?.detail?.event;

    if (!listener || !event) return;

    const accepted = updateLatestFromEvent(listener, event);
    if (!accepted) return;

    const entry = formatRealtimeMessage(listener, event);
    showRealtimeAlert(entry);
  });
}

export function init(options = {}) {
  initDom();

  const {
    enableStreamElements = false,
    fieldData = {}
  } = options;

  STATE.fieldData = fieldData;
  applyFields(fieldData);
  bindResizeObserver();

  if (enableStreamElements) {
    bindStreamElementsEvents();
  } else {
    renderNormal();
    startRotation();
  }

  document.fonts?.ready?.then(() => applyResponsiveScale());
}