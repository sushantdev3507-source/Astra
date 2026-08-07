// ============================
// ASTRA Brush Tool
// ============================

const brushBtn=document.getElementById("brushTool");

brushBtn.onclick=()=>{

canvas.isDrawingMode=true;

canvas.freeDrawingBrush.color=

document.getElementById("brushColor").value;

canvas.freeDrawingBrush.width=

parseInt(

document.getElementById("brushSize").value

);

};
document.getElementById("brushColor")

.oninput=function(){

canvas.freeDrawingBrush.color=this.value;

};
document.getElementById("brushSize")

.oninput=function(){

canvas.freeDrawingBrush.width=

parseInt(this.value);

};
document.getElementById("disableBrush")

.onclick=()=>{

canvas.isDrawingMode=false;

};
document.getElementById("eraserTool")

.onclick=()=>{

canvas.isDrawingMode=true;

canvas.freeDrawingBrush.color="#ffffff";

canvas.freeDrawingBrush.width=25;

};