

const headingBtn=document.getElementById("addHeading");

const paragraphBtn=document.getElementById("addParagraph");
headingBtn.onclick=()=>{

const text=new fabric.IText("Heading",{

left:150,

top:120,

fontSize:48,

fontFamily:"Poppins",

fill:"#000"

});

canvas.add(text);

canvas.setActiveObject(text);

};
paragraphBtn.onclick=()=>{

const text=new fabric.IText(

"Type your paragraph here",

{

left:150,

top:220,

width:400,

fontSize:24,

fontFamily:"Poppins",

fill:"#333"

}

);

canvas.add(text);

canvas.setActiveObject(text);

};
const fontFamily=document.getElementById("fontFamily");

const fontSize=document.getElementById("fontSize");

const fontColor=document.getElementById("fontColor");
fontFamily.onchange=()=>{

const obj=canvas.getActiveObject();

if(!obj || obj.type!=="i-text") return;

obj.set("fontFamily",fontFamily.value);

canvas.renderAll();

};
fontSize.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj || obj.type!=="i-text") return;

obj.set("fontSize",

Number(fontSize.value)

);

canvas.renderAll();

};
fontColor.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj || obj.type!=="i-text") return;

obj.set("fill",

fontColor.value

);

canvas.renderAll();

};
document.getElementById("boldBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.fontWeight=

obj.fontWeight==="bold"

?"normal":"bold";

canvas.renderAll();

};
document.getElementById("italicBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.fontStyle=

obj.fontStyle==="italic"

?"normal":"italic";

canvas.renderAll();

};
document.getElementById("underlineBtn").onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.underline=!obj.underline;

canvas.renderAll();

};
document.getElementById("textAlign").onchange=()=>{

const obj=canvas.getActiveObject();

if(!obj || obj.type!=="i-text") return;

obj.textAlign=

document.getElementById("textAlign").value;

canvas.renderAll();

};
canvas.on("selection:created",syncTextPanel);
canvas.on("selection:updated",syncTextPanel);

function syncTextPanel(){

const obj=canvas.getActiveObject();

if(!obj || obj.type!=="i-text") return;

fontFamily.value=obj.fontFamily;

fontSize.value=obj.fontSize;

fontColor.value=obj.fill;

document.getElementById("textAlign").value=obj.textAlign;

}