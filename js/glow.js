
const glowBtn=document.getElementById("applyGlow");

const removeGlowBtn=document.getElementById("removeGlow");
glowBtn.onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj){

alert("Select any object");

return;

}
const glow=new fabric.Shadow({

color:

document.getElementById("glowColor").value,

blur:

parseInt(

document.getElementById("glowBlur").value

),

offsetX:0,

offsetY:0

});
obj.set({

shadow:glow

});

canvas.renderAll();
if(typeof saveState==="function"){

saveState();

}

if(typeof autoSaveProject==="function"){

autoSaveProject();

}
removeGlowBtn.onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj) return;

obj.set({

shadow:null

});

canvas.renderAll();

};
[
"glowColor",
"glowBlur"

].forEach(id=>{

document.getElementById(id)

.addEventListener("input",()=>{

if(document.getElementById("enableGlow").checked){

glowBtn.click();

}

});

});
document.getElementById("enableGlow")

.onchange=function(){

if(this.checked){

glowBtn.click();

}else{

removeGlowBtn.click();

}

};
}