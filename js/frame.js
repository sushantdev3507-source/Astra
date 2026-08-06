const framePanel=document.getElementById("framePanel");

document.getElementById("frameTool").onclick=()=>{

framePanel.classList.add("active");

};

document.getElementById("closeFramePanel").onclick=()=>{

framePanel.classList.remove("active");

};
document.querySelectorAll(".frame-btn")

.forEach(btn=>{

btn.onclick=()=>{

const type=btn.dataset.frame;

createFrame(type);

};

});
function createFrame(type){

let frame;

switch(type){

case "rectangle":

frame=new fabric.Rect({

width:250,

height:180,

fill:"transparent",

stroke:"#2563eb",

strokeDashArray:[8,8]

});

break;

case "circle":

frame=new fabric.Circle({

radius:100,

fill:"transparent",

stroke:"#2563eb",

strokeDashArray:[8,8]

});

break;

case "rounded":

frame=new fabric.Rect({

width:250,

height:180,

rx:20,

ry:20,

fill:"transparent",

stroke:"#2563eb",

strokeDashArray:[8,8]

});

break;

}

frame.isFrame=true;

canvas.add(frame);

canvas.setActiveObject(frame);

canvas.renderAll();

}
document.getElementById("replaceImage")

.onclick=()=>{

const obj=canvas.getActiveObject();

if(!obj || !obj.isFrame){

alert("Select Frame");

return;

}

document.getElementById("imageInput").click();

};