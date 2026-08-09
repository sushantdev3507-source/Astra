

let copiedObject = null;
function copyObject() {

    const active = canvas.getActiveObject();

    if (!active) return;

    active.clone(function(cloned) {

        copiedObject = cloned;

    });

}
function pasteObject() {

    if (!copiedObject) return;

    copiedObject.clone(function(clone) {

        clone.set({

            left: clone.left + 20,

            top: clone.top + 20

        });

        canvas.add(clone);

        canvas.setActiveObject(clone);

        canvas.renderAll();

    });

}
function deleteObject() {

    const active = canvas.getActiveObject();

    if (!active) return;

    canvas.remove(active);

    canvas.renderAll();

}
function duplicateObject() {

    const active = canvas.getActiveObject();

    if (!active) return;

    active.clone(function(clone) {

        clone.set({

            left: clone.left + 25,

            top: clone.top + 25

        });

        canvas.add(clone);

        canvas.setActiveObject(clone);

        canvas.renderAll();

    });

}
function selectAllObjects() {

    const selection = new fabric.ActiveSelection(

        canvas.getObjects(),

        {

            canvas: canvas

        }

    );

    canvas.setActiveObject(selection);

    canvas.renderAll();

}
document.addEventListener("keydown", function(e){

    // Delete
    if(e.key==="Delete"){

        e.preventDefault();

        deleteObject();

    }

    // Ctrl+C
    if(e.ctrlKey && e.key==="c"){

        e.preventDefault();

        copyObject();

    }

    // Ctrl+V
    if(e.ctrlKey && e.key==="v"){

        e.preventDefault();

        pasteObject();

    }

    // Ctrl+D
    if(e.ctrlKey && e.key==="d"){

        e.preventDefault();

        duplicateObject();

    }

    // Ctrl+A
    if(e.ctrlKey && e.key==="a"){

        e.preventDefault();

        selectAllObjects();

    }

});