

let eyeDropperMode = false;
document.getElementById("eyedropperTool")

.onclick = () => {

    eyeDropperMode = true;

};
canvas.on("mouse:down", function(opt){

    if(!eyeDropperMode) return;

    const pointer = canvas.getPointer(opt.e);

    const ctx = canvas.getContext("2d");

    const pixel = ctx.getImageData(

        pointer.x,

        pointer.y,

        1,

        1

    ).data;

    const color =

    "#" +

    [pixel[0],pixel[1],pixel[2]]

    .map(x=>x.toString(16).padStart(2,"0"))

    .join("");

    document.getElementById("pickedColor").value = color;

    eyeDropperMode = false;

});
document.getElementById("applyPickedColor")

.onclick = function(){

    const obj = canvas.getActiveObject();

    if(!obj) return;

    obj.set({

        fill:document.getElementById("pickedColor").value

    });

    canvas.renderAll();

};
document.getElementById("pickedColor")

.oninput = function(){

    document.getElementById("fillColor").value = this.value;

};
canvas.on("object:modified",()=>{

if(typeof autoSaveProject==="function"){

autoSaveProject();

}

});