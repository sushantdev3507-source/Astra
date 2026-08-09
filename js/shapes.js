

function addShape(shape){

    canvas.add(shape);

    canvas.setActiveObject(shape);

    canvas.renderAll();

}
document.getElementById("addRectangle").onclick=()=>{

addShape(new fabric.Rect({

left:200,

top:150,

width:220,

height:130,

fill:"#4f46e5",

stroke:"#111",

strokeWidth:2

}));

};
document.getElementById("addCircle").onclick=()=>{

addShape(new fabric.Circle({

left:250,

top:200,

radius:70,

fill:"#06b6d4",

stroke:"#111",

strokeWidth:2

}));

};
document.getElementById("addTriangle").onclick=()=>{

addShape(new fabric.Triangle({

left:300,

top:170,

width:120,

height:120,

fill:"#f97316",

stroke:"#111",

strokeWidth:2

}));

};
document.getElementById("addLine").onclick=()=>{

addShape(new fabric.Line([50,50,250,50],{

stroke:"#111",

strokeWidth:4

}));

};
document.getElementById("addRoundedRect").onclick=()=>{

addShape(new fabric.Rect({

left:220,

top:180,

width:240,

height:120,

rx:20,

ry:20,

fill:"#10b981",

stroke:"#111",

strokeWidth:2

}));

};
document.getElementById("addStar").onclick=()=>{

const points=[
{x:50,y:0},
{x:61,y:35},
{x:98,y:35},
{x:68,y:57},
{x:79,y:91},
{x:50,y:70},
{x:21,y:91},
{x:32,y:57},
{x:2,y:35},
{x:39,y:35}
];

addShape(new fabric.Polygon(points,{

left:250,

top:150,

fill:"#facc15",

stroke:"#111",

strokeWidth:2,

scaleX:2,

scaleY:2

}));

};
document.getElementById("addArrow").onclick=()=>{

const group=new fabric.Group([

new fabric.Line([0,10,120,10],{

stroke:"#111",

strokeWidth:4

}),

new fabric.Triangle({

left:120,

top:10,

originX:"center",

originY:"center",

angle:90,

width:20,

height:20,

fill:"#111"

})

],{

left:200,

top:200

});

addShape(group);

};
const shapeFill=document.getElementById("shapeFill");

const shapeStroke=document.getElementById("shapeStroke");

const shapeStrokeWidth=document.getElementById("shapeStrokeWidth");
shapeFill.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("fill",shapeFill.value);

canvas.renderAll();

};
shapeStroke.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("stroke",shapeStroke.value);

canvas.renderAll();

};
shapeStroke.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("stroke",shapeStroke.value);

canvas.renderAll();

};
shapeStrokeWidth.oninput=()=>{

const obj=canvas.getActiveObject();

if(!obj)return;

obj.set("strokeWidth",

Number(shapeStrokeWidth.value)

);

canvas.renderAll();

};