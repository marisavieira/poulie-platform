const widgetID = document.querySelector('meta[name="widget-id"')?.content;

if(!widgetID){
    console.error("No ID widget found");
}
else{
    console.log("Loading widget:", widgetID);

    const widgetPath = `../widgets/${widgetID}/index.js`;

    import(widgetPath).then((module) => {
        if(module.init){
            module.init();
        }
        else{
            console.error("Widget has no init function");
        }
    })
    .catch((err) =>{
        console.error("Erros loading widget", err);
    })
}