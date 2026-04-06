const widgetId = document.querySelector('meta[name="widget-id"]')?.content;

if (!widgetId) {
  console.error("No widget-id found");
}
else {
  console.log("Loading widget:", widgetId);

  const basePath = `/widgets/${widgetId}`;
  const cssPath = `${basePath}/style.css`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssPath;
  document.head.appendChild(link);

  const jsPath = `${basePath}/index.js`;

  import(jsPath)
    .then((module) => {
      if (module.init) {
        module.init();
      }
      else {
        console.error("Widget has no init function");
      }
    })
    .catch((err) => {
      console.error("Error loading widget:", err);
    });
}