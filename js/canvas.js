

const canvas = new fabric.Canvas("editorCanvas", {
    width: 1200,
    height: 700,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true
});

// Canvas State
const canvasState = {
    zoom: 1,
    gridVisible: false
};

// Render
canvas.renderAll();
canvas.on("mouse:wheel", function(opt){

    let delta = opt.e.deltaY;

    let zoom = canvas.getZoom();

    zoom *= 0.999 ** delta;

    if(zoom > 4) zoom = 4;

    if(zoom < 0.2) zoom = 0.2;

    canvas.zoomToPoint(
        {
            x: opt.e.offsetX,
            y: opt.e.offsetY
        },
        zoom
    );

    canvasState.zoom = zoom;

    opt.e.preventDefault();
    opt.e.stopPropagation();

});
const zoomValue=document.getElementById("zoomValue");

document.getElementById("zoomInBtn").onclick=()=>{

    canvasState.zoom+=0.1;

    canvas.setZoom(canvasState.zoom);

    zoomValue.innerHTML=Math.round(canvasState.zoom*100)+"%";

};

document.getElementById("zoomOutBtn").onclick=()=>{

    canvasState.zoom-=0.1;

    if(canvasState.zoom<0.2){

        canvasState.zoom=0.2;

    }

    canvas.setZoom(canvasState.zoom);

    zoomValue.innerHTML=Math.round(canvasState.zoom*100)+"%";

};
function resizeCanvas(){

    const workspace=document.querySelector(".workspace");

    canvas.setDimensions({

        width:workspace.clientWidth-80,

        height:workspace.clientHeight-80

    });

    canvas.renderAll();

}

window.addEventListener("resize",resizeCanvas);

resizeCanvas();
document.getElementById("toggleGrid").onclick=()=>{

    canvasState.gridVisible=!canvasState.gridVisible;

    canvas.backgroundColor=

        canvasState.gridVisible

        ? "#f8fafc"

        : "#ffffff";

    canvas.renderAll();

};
let isPanning=false;

document.addEventListener("keydown",(e)=>{

    if(e.code==="Space"){

        isPanning=true;

        canvas.defaultCursor="grab";

    }

});

document.addEventListener("keyup",()=>{

    isPanning=false;

    canvas.defaultCursor="default";

});

canvas.on("mouse:down",(opt)=>{

    if(!isPanning)return;

    canvas.isDragging=true;

    canvas.lastPosX=opt.e.clientX;

    canvas.lastPosY=opt.e.clientY;

});

canvas.on("mouse:move",(opt)=>{

    if(!canvas.isDragging)return;

    const e=opt.e;

    const vpt=canvas.viewportTransform;

    vpt[4]+=e.clientX-canvas.lastPosX;

    vpt[5]+=e.clientY-canvas.lastPosY;

    canvas.requestRenderAll();

    canvas.lastPosX=e.clientX;

    canvas.lastPosY=e.clientY;

});

canvas.on("mouse:up",()=>{

    canvas.isDragging=false;

});
window.addEventListener("load",()=>{

    saveHistory();

});