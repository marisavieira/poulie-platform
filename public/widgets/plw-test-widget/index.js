export function init(){
    const el = document.createElement("div");
    el.innerText = "Widget loaded";
    el.className = "plw-test-widget";
    document.body.appendChild(el);
}