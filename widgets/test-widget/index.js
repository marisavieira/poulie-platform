export function init(){
    const el = document.createElement("div");
    el.innerText = "Widget loaded";
    el.style.color = "white";
    el.style.fontSize = "32px";
    document.body.appendChild(el);
}