

const gradientBtn = document.getElementById("applyGradient");
gradientBtn.onclick = function(){

const object = canvas.getActiveObject();

if(!object){

alert("Select any object");

return;

}

const type=document.getElementById("gradientType").value;

const c1=document.getElementById("gradientColor1").value;

const c2=document.getElementById("gradientColor2").value;

const angle=parseInt(

document.getElementById("gradientAngle").value

);
let gradient;

if(type==="linear"){

gradient=new fabric.Gradient({

type:"linear",

gradientUnits:"pixels",

coords:{

x1:0,

y1:0,

x2:Math.cos(angle*Math.PI/180)*300,

y2:Math.sin(angle*Math.PI/180)*300

},

colorStops:[

{

offset:0,

color:c1

},

{

offset:1,

color:c2

}

]

});

}
let gradient;

if(type==="linear"){

gradient=new fabric.Gradient({

type:"linear",

gradientUnits:"pixels",

coords:{

x1:0,

y1:0,

x2:Math.cos(angle*Math.PI/180)*300,

y2:Math.sin(angle*Math.PI/180)*300

},

colorStops:[

{

offset:0,

color:c1

},

{

offset:1,

color:c2

}

]

});

}
else{

gradient=new fabric.Gradient({

type:"radial",

coords:{

x1:150,

y1:150,

r1:0,

x2:150,

y2:150,

r2:180

},

colorStops:[

{

offset:0,

color:c1

},

{

offset:1,

color:c2

}

]

});

}object.set({

fill:gradient

});

canvas.renderAll();

};
if(typeof saveState==="function"){

saveState();

}

if(typeof autoSaveProject==="function"){

autoSaveProject();

}