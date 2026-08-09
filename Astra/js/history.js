// ==============================
// ASTRA History Manager
// ==============================

const history = {
    undoStack: [],
    redoStack: []
};
function saveHistory(){

    history.undoStack.push(

        JSON.stringify(canvas.toJSON())

    );

    if(history.undoStack.length > 50){

        history.undoStack.shift();

    }

    history.redoStack=[];

}
canvas.on("object:added",saveHistory);

canvas.on("object:modified",saveHistory);

canvas.on("object:removed",saveHistory);
function undo(){

    if(history.undoStack.length<=1) return;

    history.redoStack.push(

        history.undoStack.pop()

    );

    const previous=

        history.undoStack[history.undoStack.length-1];

    canvas.loadFromJSON(previous,()=>{

        canvas.renderAll();

    });

}
function redo(){

    if(history.redoStack.length===0) return;

    const next=

        history.redoStack.pop();

    history.undoStack.push(next);

    canvas.loadFromJSON(next,()=>{

        canvas.renderAll();

    });

}
document.getElementById("undoBtn").onclick=undo;

document.getElementById("redoBtn").onclick=redo;
document.addEventListener("keydown",(e)=>{

    if(e.ctrlKey && e.key==="z"){

        e.preventDefault();

        undo();

    }

    if(

        e.ctrlKey &&

        e.shiftKey &&

        e.key==="Z"

    ){

        e.preventDefault();

        redo();

    }

});
function clearHistory(){

    history.undoStack=[];

    history.redoStack=[];

    saveHistory();

}