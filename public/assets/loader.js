function getLoaderScript() {
  return document.querySelector('script[data-widget-id]');
}

function getWidgetId() {
  const meta = document.querySelector('meta[name="widget-id"]');
  if (meta?.getAttribute("content")) {
    return meta.getAttribute("content");
  }

  const script = getLoaderScript();
  if (script?.getAttribute("data-widget-id")) {
    return script.getAttribute("data-widget-id");
  }

  return null;
}

function getMode() {
  const script = getLoaderScript();
  return script?.getAttribute("data-mode") || "auto";
}

function getBaseUrl() {
  const script = getLoaderScript();

  if (script?.src) {
    const url = new URL(script.src);
    return url.origin;
  }

  return window.location.origin;
}

function ensureAppRoot() {
  let root = document.getElementById("app");

  if (!root) {
    root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);
  }

  return root;
}

async function loadWidget() {
  const widgetId = getWidgetId();

  if (!widgetId) {
    console.error("[loader] widget-id não encontrado");
    return;
  }

  try {
    const mode = getMode();
    const isLocal =
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost";

    const enableStreamElements = mode === "streamelements";
    const enableDebug = mode === "streamelements" ? false : true;

    const baseUrl = isLocal ? `${window.location.origin}/public` : getBaseUrl();

    const moduleUrl = `${baseUrl}/widgets/${widgetId}/index.js`;
    const styleUrl = `${baseUrl}/widgets/${widgetId}/style.css`;

    ensureAppRoot();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = styleUrl;
    document.head.appendChild(link);

    const mod = await import(moduleUrl);

    mod.init({
      enableDebug,
      enableStreamElements,
      assetBaseUrl: baseUrl,
    });

    console.log("[loader] widget carregado:", widgetId);
    console.log("[loader] mode:", mode);
    console.log("[loader] enableDebug:", enableDebug);
    console.log("[loader] enableStreamElements:", enableStreamElements);
    console.log("[loader] baseUrl:", baseUrl);
  }
  catch (error) {
    console.error("[loader] erro ao carregar widget:", error);
  }
}

loadWidget();