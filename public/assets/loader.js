function getWidgetId() {
  const meta = document.querySelector('meta[name="widget-id"]');
  if (meta?.getAttribute("content")) {
    return meta.getAttribute("content");
  }

  const script = document.querySelector('script[data-widget-id]');
  if (script?.getAttribute("data-widget-id")) {
    return script.getAttribute("data-widget-id");
  }

  return null;
}

async function loadWidget() {
  const widgetId = getWidgetId();

  if (!widgetId) {
    console.error("[loader] widget-id não encontrado");
    return;
  }

  try {
    const isLocal =
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost";

    const hasStreamElementsContext =
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function" &&
      window.location.hostname.includes("streamelements");

    const basePath = isLocal ? "/public" : "";

    const moduleUrl = `${basePath}/widgets/${widgetId}/index.js`;
    const styleUrl = `${basePath}/widgets/${widgetId}/style.css`;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = styleUrl;
    document.head.appendChild(link);

    const mod = await import(moduleUrl);

    mod.init({
      enableDebug: !hasStreamElementsContext,
      enableStreamElements: hasStreamElementsContext,
    });

    console.log("[loader] widget carregado:", widgetId);
  }
  catch (error) {
    console.error("[loader] erro ao carregar widget:", error);
  }
}

loadWidget();