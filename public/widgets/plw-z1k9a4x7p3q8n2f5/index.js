import config from "./config.json" with { type: "json" };

let runtimeConfig = { ...config };

const PRESETS = {
  poulie: ["#363A6A", "#BFADFF", "#5C61A6", "#FFADEB"],
  berry: ["#7B2FF7", "#F107A3", "#FF6FD8", "#6A5AE0"],
  ocean: ["#2B8CFF", "#00E5FF", "#00C9A7", "#2B8CFF"],
  sunset: ["#FF7A59", "#FFD36E", "#FF4D8D", "#A855F7"],
  aurora: ["#00DBDE", "#FC00FF", "#00C9A7", "#2B8CFF"],
  custom: null,
};

const state = {
  timer: null,
  index: 0,
  rtActive: false,
  rtTimer: null,
  rtHueTimer: null,
  latest: {
    follower: null,
    subscriber: null,
    tip: null,
    cheer: null,
  },
};

let rootEl = null;
let iconEl = null;
let labelEl = null;
let resizeObserver = null;

function initDom() {
  const root = document.getElementById("app");
  if (!root) return;

  root.innerHTML = `
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
  return (
    value === true ||
    value === "true" ||
    value === "on" ||
    value === 1 ||
    value === "1" ||
    value === "Yes" ||
    value === "yes"
  );
}

function hexToRgbaString(hex, alphaPct = 100) {
  const alpha = Math.max(0, Math.min(100, Number(alphaPct || 0))) / 100;
  let safeHex = String(hex || "").trim();

  if (!safeHex) return "";
  if (safeHex.startsWith("#")) safeHex = safeHex.slice(1);

  if (safeHex.length === 3) {
    safeHex = safeHex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (safeHex.length !== 6) return "";

  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  if ([r, g, b].some((v) => Number.isNaN(v))) return "";

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

function makeFontStack(name) {
  const family = String(name || "Lexend Deca")
    .trim()
    .replace(/["']/g, "\\$&");

  return `'${family}', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`;
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
    source.amount,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 0;
}

function buildRuntimeConfig(fieldData = {}) {
  return {
    ...config,
    ...fieldData,
    rotateSeconds: Number(fieldData.rotateSeconds ?? config.rotateSeconds),
    realtimeDurationMs: Number(
      fieldData.rtSeconds != null
        ? Number(fieldData.rtSeconds) * 1000
        : config.realtimeDurationMs
    ),
    showFollower:
      fieldData.showFollower === undefined
        ? config.showFollower
        : isOn(fieldData.showFollower),
    showSubscriber:
      fieldData.showSubscriber === undefined
        ? config.showSubscriber
        : isOn(fieldData.showSubscriber),
    showTip:
      fieldData.showTip === undefined
        ? config.showTip
        : isOn(fieldData.showTip),
    showCheer:
      fieldData.showCheer === undefined
        ? config.showCheer
        : isOn(fieldData.showCheer),
    showSubMonths:
      fieldData.showSubMonths === undefined
        ? config.showSubMonths
        : isOn(fieldData.showSubMonths),
    subMonthsSource:
      String(fieldData.subMonthsSource || config.subMonthsSource).toLowerCase() === "months"
        ? "months"
        : "streak",
    subMonthsPrefix: String(fieldData.subMonthsPrefix ?? config.subMonthsPrefix),
    currencySymbol: String(fieldData.currencySymbol ?? config.currencySymbol),
    currencyPosition:
      String(fieldData.currencyPosition || config.currencyPosition).toLowerCase() === "after"
        ? "after"
        : "before",
    currencySpace:
      fieldData.currencySpace === undefined
        ? config.currencySpace
        : isOn(fieldData.currencySpace),
    locale: String(fieldData.locale || config.locale),
    showCents:
      fieldData.showCents === undefined
        ? config.showCents
        : isOn(fieldData.showCents),
    bgColor: String(fieldData.bgColor || config.bgColor),
    textColor: String(fieldData.textColor || config.textColor),
    bgAlpha: Number.isFinite(parseNum(fieldData.bgAlpha))
      ? Math.max(0, Math.min(100, parseNum(fieldData.bgAlpha)))
      : config.bgAlpha,
    borderRadius: Number.isFinite(parseNum(fieldData.borderRadius))
      ? Math.max(0, Math.min(200, parseNum(fieldData.borderRadius)))
      : config.borderRadius,
    fontName: String(fieldData.fontName || config.fontName),
    fontSize: Number.isFinite(parseNum(fieldData.fontSize))
      ? Math.max(8, Math.min(200, parseNum(fieldData.fontSize)))
      : config.fontSize,
    iconSize: Number.isFinite(parseNum(fieldData.iconSize))
      ? Math.max(8, Math.min(240, parseNum(fieldData.iconSize)))
      : config.iconSize,
    textTransform: ["none", "uppercase", "lowercase", "capitalize"].includes(
      String(fieldData.textTransform || config.textTransform).toLowerCase()
    )
      ? String(fieldData.textTransform || config.textTransform).toLowerCase()
      : "none",
    widgetWidth: Number.isFinite(parseNum(fieldData.widgetWidth))
      ? Math.max(0, Math.min(4000, parseNum(fieldData.widgetWidth)))
      : config.widgetWidth,
    widgetHeight: Number.isFinite(parseNum(fieldData.widgetHeight))
      ? Math.max(0, Math.min(4000, parseNum(fieldData.widgetHeight)))
      : config.widgetHeight,
    iconFollower: String(fieldData.iconFollower || config.iconFollower),
    iconSubscriber: String(fieldData.iconSubscriber || config.iconSubscriber),
    iconTip: String(fieldData.iconTip || config.iconTip),
    iconCheer: String(fieldData.iconCheer || config.iconCheer),
    rtEnabled:
      fieldData.rtEnabled === undefined
        ? config.rtEnabled
        : isOn(fieldData.rtEnabled),
    rtSpeed: Number.isFinite(parseNum(fieldData.rtSpeed))
      ? Math.max(1, Math.min(30, parseNum(fieldData.rtSpeed)))
      : config.rtSpeed,
    rtHueCycle:
      fieldData.rtHueCycle === undefined
        ? config.rtHueCycle
        : isOn(fieldData.rtHueCycle),
    rtHueDeg: Number.isFinite(parseNum(fieldData.rtHueDeg))
      ? Math.max(0, Math.min(360, parseNum(fieldData.rtHueDeg)))
      : config.rtHueDeg,
    rtPreset:
      String(fieldData.rtPreset || config.rtPreset).toLowerCase() in PRESETS
        ? String(fieldData.rtPreset || config.rtPreset).toLowerCase()
        : "poulie",
    rtAngle: Number.isFinite(parseNum(fieldData.rtAngle))
      ? Math.max(0, Math.min(360, parseNum(fieldData.rtAngle)))
      : config.rtAngle,
    rtC1: String(fieldData.rtC1 || config.rtC1),
    rtC2: String(fieldData.rtC2 || config.rtC2),
    rtC3: String(fieldData.rtC3 || config.rtC3),
    rtC4: String(fieldData.rtC4 || config.rtC4),
  };
}

function applyRuntimeStyles() {
  document.documentElement.style.setProperty("--bgColor", runtimeConfig.bgColor);
  document.documentElement.style.setProperty("--textColor", runtimeConfig.textColor);
  document.documentElement.style.setProperty("--fontStack", makeFontStack(runtimeConfig.fontName));
  document.documentElement.style.setProperty("--fontBase", String(runtimeConfig.fontSize));
  document.documentElement.style.setProperty("--iconSize", String(runtimeConfig.iconSize));
  document.documentElement.style.setProperty("--textTransform", runtimeConfig.textTransform);
  document.documentElement.style.setProperty("--radiusPx", String(runtimeConfig.borderRadius));
  document.documentElement.style.setProperty(
    "--widgetWidth",
    runtimeConfig.widgetWidth > 0 ? `${runtimeConfig.widgetWidth}px` : "auto"
  );
  document.documentElement.style.setProperty(
    "--widgetHeight",
    runtimeConfig.widgetHeight > 0 ? `${runtimeConfig.widgetHeight}px` : "auto"
  );
  document.documentElement.style.setProperty(
    "--minGuardW",
    runtimeConfig.widgetWidth > 0 ? "0" : "1"
  );
  document.documentElement.style.setProperty(
    "--minGuardH",
    runtimeConfig.widgetHeight > 0 ? "0" : "1"
  );

  const rgba = hexToRgbaString(runtimeConfig.bgColor, runtimeConfig.bgAlpha);

  if (rgba) {
    document.documentElement.style.setProperty("--bgColorRGBA", rgba);
  } else {
    document.documentElement.style.removeProperty("--bgColorRGBA");
  }

  loadGoogleFontFamily(runtimeConfig.fontName);

  if (!state.rtActive) {
    setBgSolid();
  }
}

function setBgSolid() {
  const solid = getComputedStyle(document.documentElement)
    .getPropertyValue("--bgColorRGBA")
    .trim();

  document.documentElement.style.setProperty(
    "--bgFill",
    solid || runtimeConfig.bgColor
  );
}

function buildRealtimeGradient() {
  const colors =
    runtimeConfig.rtPreset === "custom"
      ? [runtimeConfig.rtC1, runtimeConfig.rtC2, runtimeConfig.rtC3, runtimeConfig.rtC4]
      : PRESETS[runtimeConfig.rtPreset] || PRESETS.poulie;

  const rgbaColors = colors
    .map((color) => hexToRgbaString(color, runtimeConfig.bgAlpha) || color)
    .filter(Boolean);

  return `linear-gradient(${runtimeConfig.rtAngle}deg, ${rgbaColors.join(", ")})`;
}

function startHueCycle() {
  clearInterval(state.rtHueTimer);

  if (!runtimeConfig.rtHueCycle) {
    document.documentElement.style.setProperty(
      "--rtHue",
      `${runtimeConfig.rtHueDeg}deg`
    );
    return;
  }

  let hue = 0;
  document.documentElement.style.setProperty("--rtHue", "0deg");

  state.rtHueTimer = setInterval(() => {
    hue = (hue + 6) % 360;
    document.documentElement.style.setProperty("--rtHue", `${hue}deg`);
  }, 80);
}

function stopHueCycle() {
  clearInterval(state.rtHueTimer);
  state.rtHueTimer = null;
  document.documentElement.style.setProperty("--rtHue", "0deg");
}

function iconFor(kind) {
  switch (kind) {
    case "follower":
      return runtimeConfig.iconFollower;
    case "subscriber":
      return runtimeConfig.iconSubscriber;
    case "tip":
      return runtimeConfig.iconTip;
    case "cheer":
      return runtimeConfig.iconCheer;
    default:
      return "✦";
  }
}

function enabledCategories() {
  const categories = [];

  if (runtimeConfig.showFollower) categories.push("follower");
  if (runtimeConfig.showSubscriber) categories.push("subscriber");
  if (runtimeConfig.showTip) categories.push("tip");
  if (runtimeConfig.showCheer) categories.push("cheer");

  return categories;
}

function formatMoney(amount) {
  const amountString = Number(amount).toLocaleString(runtimeConfig.locale || undefined, {
    minimumFractionDigits: runtimeConfig.showCents ? 2 : 0,
    maximumFractionDigits: 2,
  });

  const symbol = runtimeConfig.currencySymbol || "";
  const space = runtimeConfig.currencySpace ? " " : "";

  return runtimeConfig.currencyPosition === "after"
    ? `${amountString}${space}${symbol}`
    : `${symbol}${space}${amountString}`;
}

function formatEntry(kind) {
  switch (kind) {
    case "follower":
      if (!state.latest.follower) return null;
      return {
        icon: iconFor("follower"),
        text: `${state.latest.follower.name}`,
      };

    case "subscriber": {
      if (!state.latest.subscriber) return null;

      const count =
        runtimeConfig.subMonthsSource === "months"
          ? state.latest.subscriber.months || 0
          : state.latest.subscriber.streak || 0;

      const suffix =
        runtimeConfig.showSubMonths && count > 0
          ? ` ${runtimeConfig.subMonthsPrefix}${count}`
          : "";

      return {
        icon: iconFor("subscriber"),
        text: `${state.latest.subscriber.name}${suffix}`,
      };
    }

    case "tip":
      if (!state.latest.tip) return null;
      return {
        icon: iconFor("tip"),
        text: `${state.latest.tip.name} ${formatMoney(state.latest.tip.amount)}`,
      };

    case "cheer":
      if (!state.latest.cheer) return null;
      return {
        icon: iconFor("cheer"),
        text: `${state.latest.cheer.name} ${Number(state.latest.cheer.amount).toLocaleString()} bits`,
      };

    default:
      return null;
  }
}

function currentCycleList() {
  const categories = enabledCategories();
  const list = categories
    .map((kind) => ({ kind, entry: formatEntry(kind) }))
    .filter((item) => item.entry);

  if (list.length === 0 && categories.length > 0) {
    return [
      {
        kind: categories[0],
        entry: {
          icon: iconFor(categories[0]),
          text: "Aguardando eventos…",
        },
      },
    ];
  }

  return list;
}

function renderNormal() {
  if (!rootEl || !iconEl || !labelEl) return;

  const list = currentCycleList();

  if (list.length === 0) {
    iconEl.textContent = "✦";
    labelEl.textContent = "Set at least one category";
    return;
  }

  if (state.index >= list.length) {
    state.index = 0;
  }

  const { entry } = list[state.index];

  labelEl.classList.add("fade-out");

  setTimeout(() => {
    if (!iconEl || !labelEl) return;
    iconEl.textContent = entry.icon;
    labelEl.textContent = entry.text;
    labelEl.classList.remove("fade-out");
  }, 120);
}

function startRotation() {
  clearInterval(state.timer);
  renderNormal();

  const seconds = Math.max(1, Number(runtimeConfig.rotateSeconds || 6));

  state.timer = setInterval(() => {
    if (state.rtActive) return;
    state.index += 1;
    renderNormal();
  }, seconds * 1000);
}

function formatRealtimeMessage(listener, event) {
  const name = event?.name || event?.username || "—";

  if (listener === "follower-latest") {
    return {
      icon: iconFor("follower"),
      text: `${name} just followed!`,
    };
  }

  if (listener === "subscriber-latest") {
    const months = resolveSubMonths(event);
    const suffix =
      runtimeConfig.showSubMonths && months > 0
        ? ` ${runtimeConfig.subMonthsPrefix}${months}`
        : "";

    return {
      icon: iconFor("subscriber"),
      text: `${name} subscribed!${suffix}`,
    };
  }

  if (listener === "tip-latest") {
    return {
      icon: iconFor("tip"),
      text: `${name} donated ${formatMoney(event?.amount ?? 0)}`,
    };
  }

  if (listener === "cheer-latest") {
    const bits = Number(event?.amount ?? 0).toLocaleString();

    return {
      icon: iconFor("cheer"),
      text: `${name} cheered ${bits} bits!`,
    };
  }

  return null;
}

function showRealtimeAlert(entry) {
  if (!runtimeConfig.rtEnabled) return;
  if (!rootEl || !iconEl || !labelEl || !entry) return;

  state.rtActive = true;
  clearTimeout(state.rtTimer);

  document.documentElement.style.setProperty("--rtFill", buildRealtimeGradient());
  document.documentElement.style.setProperty("--rtSpeed", `${runtimeConfig.rtSpeed}s`);

  rootEl.classList.remove("rt");
  void rootEl.offsetWidth;
  rootEl.classList.add("rt");

  startHueCycle();

  iconEl.textContent = entry.icon;
  labelEl.textContent = entry.text;
  labelEl.classList.remove("fade-out");

  const duration = Math.max(
    500,
    Math.min(20000, Number(runtimeConfig.realtimeDurationMs || 3000))
  );

  state.rtTimer = setTimeout(() => {
    state.rtActive = false;
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
  const hasFixedWidth = runtimeConfig.widgetWidth > 0;
  const hasFixedHeight = runtimeConfig.widgetHeight > 0;
  const scale = hasFixedWidth || hasFixedHeight ? 1 : computeScaleFor(rootEl);

  document.documentElement.style.setProperty("--scale", String(scale));
}

function bindResizeObserver() {
  if (!rootEl) return;

  if (window.ResizeObserver) {
    if (resizeObserver) {
      try {
        resizeObserver.disconnect();
      } catch (error) {}
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
    state.latest.follower = {
      name: session["follower-latest"].name || session["follower-latest"].username || "—",
    };
  }

  if (session["subscriber-latest"]) {
    const subscriber = session["subscriber-latest"];
    const months = resolveSubMonths(subscriber);

    state.latest.subscriber = {
      name: subscriber.name || subscriber.username || "—",
      months,
      streak: Number(subscriber.streak) || months,
    };
  }

  if (session["tip-latest"]) {
    const tip = session["tip-latest"];

    state.latest.tip = {
      name: tip.name || tip.username || "Anônimo",
      amount: Number(tip.amount || 0),
    };
  }

  if (session["cheer-latest"]) {
    const cheer = session["cheer-latest"];

    state.latest.cheer = {
      name: cheer.name || cheer.username || "—",
      amount: Number(cheer.amount || 0),
    };
  }
}

function updateLatestFromEvent(listener, event) {
  switch (listener) {
    case "follower-latest":
      state.latest.follower = {
        name: event?.name || event?.username || "—",
      };
      break;

    case "subscriber-latest": {
      const months = resolveSubMonths(event || {});
      state.latest.subscriber = {
        name: event?.name || event?.username || "—",
        months,
        streak: Number(event?.streak) || months,
      };
      break;
    }

    case "tip-latest":
      state.latest.tip = {
        name: event?.name || event?.username || "Anônimo",
        amount: Number(event?.amount || 0),
      };
      break;

    case "cheer-latest":
      state.latest.cheer = {
        name: event?.name || event?.username || "—",
        amount: Number(event?.amount || 0),
      };
      break;

    default:
      return false;
  }

  return true;
}

function bindDebug() {
  window.eventRotatorDebug = {
    state,
    renderNormal,
    startRotation,
    showRealtimeAlert,
    simulate(listener, event) {
      if (!updateLatestFromEvent(listener, event)) return;
      const entry = formatRealtimeMessage(listener, event);
      showRealtimeAlert(entry);
    },
  };

  console.log("[event-rotator] Debug disponível em window.eventRotatorDebug");
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
  runtimeConfig = buildRuntimeConfig(options.fieldData || {});

  const {
    enableDebug = true,
    enableStreamElements = false,
  } = options;

  initDom();
  applyRuntimeStyles();
  bindResizeObserver();

  if (enableDebug) {
    bindDebug();
  }

  if (enableStreamElements) {
    bindStreamElementsEvents();
  } else {
    renderNormal();
    startRotation();
  }

  document.fonts?.ready?.then(() => applyResponsiveScale());
}