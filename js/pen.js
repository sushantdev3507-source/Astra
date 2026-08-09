
let penMode = false;

let penPoints = [];

let tempLines = [];
document.getElementById("penTool").onclick = () => {

    penMode = true;

    penPoints = [];

    tempLines.forEach(line => canvas.remove(line));

    tempLines = [];

};
canvas.on("mouse:down", function(opt){

    if(!penMode) return;

    const pointer = canvas.getPointer(opt.e);

    penPoints.push({

        x:pointer.x,

        y:pointer.y

    });

});
canvas.on("mouse:down", function(opt){

    if(!penMode) return;

    if(penPoints.length<2) return;

    const p1 = penPoints[penPoints.length-2];

    const p2 = penPoints[penPoints.length-1];

    const line = new fabric.Line(

        [

            p1.x,

            p1.y,

            p2.x,

            p2.y

        ],

        {

            stroke:"#4f8cff",

            strokeWidth:2,

            selectable:false,

            evented:false

        }

    );

    tempLines.push(line);

    canvas.add(line);

});
document.getElementById("finishPen")

.onclick = finishPenPath;

function finishPenPath(){

    if(penPoints.length<2){

        penMode=false;

        return;

    }

    const poly = new fabric.Polyline(

        penPoints,

        {

            fill:"",

            stroke:"#000",

            strokeWidth:2

        }

    );

    tempLines.forEach(line=>canvas.remove(line));

    tempLines=[];

    canvas.add(poly);

    canvas.renderAll();

    penPoints=[];

    penMode=false;

}
canvas.upperCanvasEl.addEventListener(

"dblclick",

finishPenPath

);
canvas.on("object:added",()=>{

if(typeof autoSaveProject==="function"){

autoSaveProject();

}

});