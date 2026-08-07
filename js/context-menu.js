const menu = document.getElementById("contextMenu");

canvas.upperCanvasEl.addEventListener("contextmenu",(e)=>{

    e.preventDefault();

    menu.style.display="flex";

    menu.style.left=e.pageX+"px";

    menu.style.top=e.pageY+"px";

});
document.addEventListener("click",()=>{

    menu.style.display="none";

});
document.getElementById("ctxCopy").onclick = copyObject;

document.getElementById("ctxPaste").onclick = pasteObject;

document.getElementById("ctxDuplicate").onclick = duplicateObject;

document.getElementById("ctxDelete").onclick = deleteObject;
document.getElementById("ctxFront").onclick=()=>{

    const obj=canvas.getActiveObject();

    if(!obj) return;

    canvas.bringToFront(obj);

    canvas.renderAll();

};
document.getElementById("ctxBack").onclick=()=>{

    const obj=canvas.getActiveObject();

    if(!obj) return;

    canvas.sendToBack(obj);

    canvas.renderAll();

};