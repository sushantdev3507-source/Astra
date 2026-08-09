
const layersList=document.getElementById("layersList");

function refreshLayers(){

layersList.innerHTML="";

const objects=canvas.getObjects();

objects.slice().reverse().forEach((obj,index)=>{

const layer=document.createElement("div");

layer.className="layer-item";

layer.innerHTML=`

<span>${obj.layerName || obj.type.toUpperCase()} ${objects.length-index}</span>

<div>

<button class="lockLayer">

${obj.selectable ? "🔓" : "🔒"}

</button>

<button class="toggleLayer">

${obj.visible ? "👁" : "🚫"}

</button>

</div>

`;

if(canvas.getActiveObject()===obj){

layer.classList.add("active");

}
const toggleBtn=layer.querySelector(".toggleLayer");

toggleBtn.onclick=(e)=>{

e.stopPropagation();

obj.visible=!obj.visible;

canvas.renderAll();

refreshLayers();

};
const lockBtn=layer.querySelector(".lockLayer");

lockBtn.onclick=(e)=>{

e.stopPropagation();

obj.selectable=!obj.selectable;

obj.evented=obj.selectable;

canvas.renderAll();

refreshLayers();

};

layer.onclick=()=>{

canvas.setActiveObject(obj);

canvas.renderAll();

refreshLayers();

};

layersList.appendChild(layer);

});

}
canvas.on("object:added",refreshLayers);

canvas.on("object:removed",refreshLayers);

canvas.on("selection:created",refreshLayers);

canvas.on("selection:updated",refreshLayers);

canvas.on("selection:cleared",refreshLayers);
document.getElementById("layerFront").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

canvas.bringForward(obj);

canvas.renderAll();

refreshLayers();

};
document.getElementById("layerBack").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

canvas.sendBackwards(obj);

canvas.renderAll();

refreshLayers();

};
document.getElementById("layerDuplicate").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.clone((clone)=>{

clone.left+=20;

clone.top+=20;

canvas.add(clone);

canvas.setActiveObject(clone);

canvas.renderAll();

refreshLayers();

});

};
document.getElementById("layerDelete").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

canvas.remove(obj);

canvas.renderAll();

refreshLayers();

};
layer.ondblclick=()=>{

const name=prompt(

"Layer Name",

obj.layerName||obj.type

);

if(name){

obj.layerName=name;

refreshLayers();

}

};