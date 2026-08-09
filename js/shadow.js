

const applyShadowBtn=document.getElementById("applyShadow");

const removeShadowBtn=document.getElementById("removeShadow");
applyShadowBtn.onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj){

alert("Select an object first");

return;

}
const shadow=new fabric.Shadow({

color:

document.getElementById("shadowColor").value,

blur:

parseInt(

document.getElementById("shadowBlur").value

),

offsetX:

parseInt(

document.getElementById("shadowOffsetX").value

),

offsetY:

parseInt(

document.getElementById("shadowOffsetY").value

)

});
obj.set({

shadow:shadow

});

canvas.renderAll();
if(typeof saveState==="function"){

saveState();

}

if(typeof autoSaveProject==="function"){

autoSaveProject();

}
removeShadowBtn.onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj) return;

obj.set({

shadow:null

});

canvas.renderAll();

};
[
"shadowColor",
"shadowBlur",
"shadowOffsetX",
"shadowOffsetY"

].forEach(id=>{

document.getElementById(id)

.addEventListener("input",()=>{

if(document.getElementById("enableShadow").checked){

applyShadowBtn.click();

}

});

});
document.getElementById("enableShadow")

.onchange=function(){

if(this.checked){

applyShadowBtn.click();

}else{

removeShadowBtn.click();

}

};
}