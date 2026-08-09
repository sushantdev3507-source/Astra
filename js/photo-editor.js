let cropRect = null;
let cropMode = false;


const canvas = new fabric.Canvas("editorCanvas",{

width:1000,

height:650,

backgroundColor:"#ffffff",

preserveObjectStacking:true

});



const uploadBtn=document.getElementById("uploadImage");

const imageInput=document.getElementById("imageInput");

uploadBtn.onclick=()=>{

imageInput.click();

};

imageInput.onchange=(e)=>{

const file=e.target.files[0];

if(!file)return;

const reader=new FileReader();

reader.onload=(event)=>{

fabric.Image.fromURL(event.target.result,(img)=>{

img.scaleToWidth(500);

canvas.add(img);

canvas.centerObject(img);

canvas.setActiveObject(img);

canvas.renderAll();

});

};

reader.readAsDataURL(file);

};


document.getElementById("addHeading").onclick = () => {

    const text = new fabric.IText("Heading", {

        left: 250,

        top: 150,

        fontSize: 48,

        fontFamily: "Poppins",

        fill: "#000000",

        fontWeight: "bold"

    });

    canvas.add(text);

    canvas.setActiveObject(text);

};



document.getElementById("addParagraph").onclick = () => {

    const text = new fabric.IText("Start typing...", {

        left: 250,

        top: 250,

        width:400,

        fontSize:24,

        fontFamily:"Poppins",

        fill:"#000000"

    });

    canvas.add(text);

    canvas.setActiveObject(text);

};
const fontFamily = document.getElementById("fontFamily");
const fontSize = document.getElementById("fontSize");
const fontColor = document.getElementById("fontColor");

fontFamily.onchange = () => {

    const obj = canvas.getActiveObject();

    if(!obj) return;

    obj.set("fontFamily",fontFamily.value);

    canvas.renderAll();

};

fontSize.oninput = () => {

    const obj = canvas.getActiveObject();

    if(!obj) return;

    obj.set("fontSize",Number(fontSize.value));

    canvas.renderAll();

};

fontColor.oninput = () => {

    const obj = canvas.getActiveObject();

    if(!obj) return;

    obj.set("fill",fontColor.value);

    canvas.renderAll();

};
document.getElementById("boldBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("fontWeight",

obj.fontWeight==="bold"

?"normal"

:"bold");

canvas.renderAll();

};

document.getElementById("italicBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("fontStyle",

obj.fontStyle==="italic"

?"normal"

:"italic");

canvas.renderAll();

};

document.getElementById("underlineBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("underline",

!obj.underline);

canvas.renderAll();

};
document.getElementById("addRectangle").onclick=()=>{

const rect=new fabric.Rect({

left:200,

top:150,

width:220,

height:140,

fill:"#4f46e5",

stroke:"#000",

strokeWidth:2,

rx:12,

ry:12

});

canvas.add(rect);

canvas.setActiveObject(rect);

};
document.getElementById("addCircle").onclick=()=>{

const circle=new fabric.Circle({

left:250,

top:220,

radius:70,

fill:"#06b6d4",

stroke:"#000",

strokeWidth:2

});

canvas.add(circle);

canvas.setActiveObject(circle);

};
document.getElementById("addTriangle").onclick=()=>{

const triangle=new fabric.Triangle({

left:320,

top:180,

width:120,

height:120,

fill:"#f97316",

stroke:"#000",

strokeWidth:2

});

canvas.add(triangle);

canvas.setActiveObject(triangle);

};
document.getElementById("addLine").onclick=()=>{

const line=new fabric.Line(

[50,50,250,50],

{

stroke:"#000",

strokeWidth:4

}

);

canvas.add(line);

canvas.setActiveObject(line);

};
const fillColor=document.getElementById("fillColor");

const strokeColor=document.getElementById("strokeColor");

const strokeWidth=document.getElementById("strokeWidth");
fillColor.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj) return;

obj.set("fill",fillColor.value);

canvas.renderAll();

};
strokeColor.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj) return;

obj.set("stroke",strokeColor.value);

canvas.renderAll();

};
strokeWidth.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj) return;

obj.set("strokeWidth",

Number(strokeWidth.value));

canvas.renderAll();

};
document.getElementById("deleteObject").onclick=()=>{

const active=canvas.getActiveObject();

if(!active) return;

canvas.remove(active);

canvas.discardActiveObject();

canvas.renderAll();

};
canvas.on("selection:created",updateToolbar);
canvas.on("selection:updated",updateToolbar);

function updateToolbar(){

const obj=canvas.getActiveObject();

if(!obj) return;

if(obj.fill){

fillColor.value=obj.fill;

}

if(obj.stroke){

strokeColor.value=obj.stroke;

}

if(obj.strokeWidth!=null){

strokeWidth.value=obj.strokeWidth;

}

if(obj.fontSize){

fontSize.value=obj.fontSize;

}

if(obj.fill){

fontColor.value=obj.fill;

}

}
// =========================
// Layers
// =========================

function refreshLayers(){

const list=document.getElementById("layersList");

list.innerHTML="";

const objects=canvas.getObjects();

objects.slice().reverse().forEach((obj,index)=>{

const item=document.createElement("div");

item.className="layer-item";

item.innerText=

obj.type.toUpperCase()+" "+(objects.length-index);

item.onclick=()=>{

canvas.setActiveObject(obj);

canvas.renderAll();

refreshLayers();

};

if(canvas.getActiveObject()===obj){

item.classList.add("active");

}

list.appendChild(item);

});

}

canvas.on("object:added",refreshLayers);

canvas.on("object:removed",refreshLayers);

canvas.on("selection:created",refreshLayers);

canvas.on("selection:updated",refreshLayers);

canvas.on("selection:cleared",refreshLayers);
document.getElementById("bringFront").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

canvas.bringForward(obj);

canvas.renderAll();

refreshLayers();

};
document.getElementById("sendBack").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

canvas.sendBackwards(obj);

canvas.renderAll();

refreshLayers();

};
document.getElementById("duplicateLayer").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.clone((clone)=>{

clone.set({

left:obj.left+20,

top:obj.top+20

});

canvas.add(clone);

canvas.setActiveObject(clone);

canvas.renderAll();

});

};
let zoomLevel=1;

const zoomValue=document.getElementById("zoomValue");

document.getElementById("zoomInBtn").onclick=()=>{

zoomLevel+=0.1;

canvas.setZoom(zoomLevel);

zoomValue.innerText=Math.round(zoomLevel*100)+"%";

};

document.getElementById("zoomOutBtn").onclick=()=>{

zoomLevel=Math.max(.2,zoomLevel-.1);

canvas.setZoom(zoomLevel);

zoomValue.innerText=Math.round(zoomLevel*100)+"%";

};
document.getElementById("exportImage").onclick=()=>{

const link=document.createElement("a");

link.download="astra-design.png";

link.href=canvas.toDataURL({

format:"png",

quality:1

});

link.click();

};
document.getElementById("saveProject").onclick=()=>{

const json=JSON.stringify(canvas.toJSON());

localStorage.setItem("astra-project",json);

alert("Project Saved Successfully!");

};
const themeBtn=document.getElementById("themeBtn");

let dark=true;

themeBtn.onclick=()=>{

dark=!dark;

document.body.classList.toggle("light-mode");

themeBtn.innerHTML=dark?"🌙":"☀️";

};
const fillColor=document.getElementById("fillColor");
const strokeColor=document.getElementById("strokeColor");
const strokeWidth=document.getElementById("strokeWidth");
const opacity=document.getElementById("opacity");
const rotation=document.getElementById("rotation");
fillColor.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("fill",fillColor.value);

canvas.renderAll();

};
strokeColor.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("stroke",strokeColor.value);

canvas.renderAll();

};
strokeWidth.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("strokeWidth",

Number(strokeWidth.value));

canvas.renderAll();

};
opacity.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("opacity",

opacity.value/100);

canvas.renderAll();

};
rotation.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.rotate(

Number(rotation.value)

);

canvas.renderAll();

};
document.getElementById("duplicateBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.clone((clone)=>{

clone.left+=20;

clone.top+=20;

canvas.add(clone);

canvas.setActiveObject(clone);

canvas.renderAll();

});

};
document.getElementById("deleteBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

canvas.remove(obj);

canvas.renderAll();

};
canvas.on("selection:created",syncProperties);
canvas.on("selection:updated",syncProperties);

function syncProperties(){

const obj=canvas.getActiveObject();

if(!obj)return;

fillColor.value=obj.fill||"#000000";

strokeColor.value=obj.stroke||"#000000";

strokeWidth.value=obj.strokeWidth||0;

opacity.value=Math.round(

(obj.opacity??1)*100

);

rotation.value=Math.round(

obj.angle||0

);

}
document.getElementById("cropTool").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj || obj.type!=="image"){

alert("Please select an image.");

return;

}

cropMode=true;

cropRect=new fabric.Rect({

left:obj.left+40,

top:obj.top+40,

width:250,

height:250,

fill:"rgba(0,0,0,.15)",

stroke:"#00A8FF",

strokeWidth:2,

strokeDashArray:[6,6],

transparentCorners:false

});

canvas.add(cropRect);

canvas.setActiveObject(cropRect);

};
document.getElementById("applyCrop").onclick=()=>{

if(!cropMode)return;

alert("Crop feature coming in Part 3.");

};
function applyFilters(){

const obj=canvas.getActiveObject();

if(!obj || obj.type!=="image") return;

obj.filters=[];

obj.filters.push(

new fabric.Image.filters.Brightness({

brightness:Number(brightness.value)

})

);

obj.filters.push(

new fabric.Image.filters.Contrast({

contrast:Number(contrast.value)

})

);

obj.filters.push(

new fabric.Image.filters.Saturation({

saturation:Number(saturation.value)

})

);

obj.filters.push(

new fabric.Image.filters.Blur({

blur:Number(blur.value)

})

);

obj.applyFilters();

canvas.renderAll();

}
const brightness=document.getElementById("brightness");
const contrast=document.getElementById("contrast");
const saturation=document.getElementById("saturation");
const blur=document.getElementById("blur");

brightness.oninput=applyFilters;
contrast.oninput=applyFilters;
saturation.oninput=applyFilters;
blur.oninput=applyFilters;
document.getElementById("grayBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.filters=[

new fabric.Image.filters.Grayscale()

];

obj.applyFilters();

canvas.renderAll();

};
document.getElementById("sepiaBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.filters=[

new fabric.Image.filters.Sepia()

];

obj.applyFilters();

canvas.renderAll();

};
document.getElementById("invertBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.filters=[

new fabric.Image.filters.Invert()

];

obj.applyFilters();

canvas.renderAll();

};
document.getElementById("resetFilters").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.filters=[];

obj.applyFilters();

canvas.renderAll();

brightness.value=0;
contrast.value=0;
saturation.value=0;
blur.value=0;

};