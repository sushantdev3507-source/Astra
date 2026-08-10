let copiedObject = null;


function isKeyboardCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getActiveObject ===
            "function"
    );

}



function isTypingTarget(element) {

    if (!element) {
        return false;
    }

    const tagName =
        element.tagName
            ? element.tagName.toLowerCase()
            : "";

    if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
    ) {
        return true;
    }

    if (
        element.isContentEditable
    ) {
        return true;
    }

    if (
        isKeyboardCanvasReady() &&
        typeof canvas.getActiveObject ===
            "function"
    ) {

        const active =
            canvas.getActiveObject();

        if (
            active &&
            active.isEditing
        ) {
            return true;
        }

    }

    return false;

}


function copyObject() {

    if (
        !isKeyboardCanvasReady()
    ) {
        return;
    }

    const active =
        canvas.getActiveObject();

    if (!active) {
        return;
    }

    active.clone(
        function (cloned) {

            copiedObject =
                cloned;

        }
    );

}


function pasteObject() {

    if (
        !isKeyboardCanvasReady() ||
        !copiedObject
    ) {
        return;
    }

    copiedObject.clone(

        function (clone) {

            const left =
                Number(
                    clone.left
                ) || 0;

            const top =
                Number(
                    clone.top
                ) || 0;

            clone.set({

                left:
                    left + 20,

                top:
                    top + 20,

                evented: true,

                selectable: true

            });

            canvas.add(
                clone
            );

            canvas.setActiveObject(
                clone
            );

            canvas.requestRenderAll();

            if (
                typeof saveHistory ===
                "function"
            ) {
                saveHistory();
            }

            if (
                typeof autoSaveProject ===
                "function"
            ) {
                autoSaveProject();
            }

        }
    );

}


function deleteObject() {

    if (
        !isKeyboardCanvasReady()
    ) {
        return;
    }

    const active =
        canvas.getActiveObject();

    if (!active) {
        return;
    }

    if (
        active.type ===
        "activeSelection"
    ) {

        const objects =
            active.getObjects();

        canvas.discardActiveObject();

        objects.forEach(
            function (object) {

                canvas.remove(
                    object
                );

            }
        );

    } else {

        canvas.remove(
            active
        );

    }

    canvas.discardActiveObject();

    canvas.requestRenderAll();

    if (
        typeof saveHistory ===
        "function"
    ) {
        saveHistory();
    }

    if (
        typeof autoSaveProject ===
        "function"
    ) {
        autoSaveProject();
    }

}


function duplicateObject() {

    if (
        !isKeyboardCanvasReady()
    ) {
        return;
    }

    const active =
        canvas.getActiveObject();

    if (!active) {
        return;
    }

    active.clone(

        function (clone) {

            const left =
                Number(
                    clone.left
                ) || 0;

            const top =
                Number(
                    clone.top
                ) || 0;

            clone.set({

                left:
                    left + 25,

                top:
                    top + 25,

                evented: true,

                selectable: true

            });

            canvas.add(
                clone
            );

            canvas.setActiveObject(
                clone
            );

            canvas.requestRenderAll();

            if (
                typeof saveHistory ===
                "function"
            ) {
                saveHistory();
            }

            if (
                typeof autoSaveProject ===
                "function"
            ) {
                autoSaveProject();
            }

        }
    );

}



function selectAllObjects() {

    if (
        !isKeyboardCanvasReady()
    ) {
        return;
    }

    const objects =
        canvas.getObjects();

    if (
        !objects ||
        objects.length === 0
    ) {
        return;
    }

    const selectableObjects =
        objects.filter(
            function (object) {

                return (
                    object.selectable !== false &&
                    object.evented !== false
                );

            }
        );

    if (
        selectableObjects.length === 0
    ) {
        return;
    }

    if (
        selectableObjects.length === 1
    ) {

        canvas.setActiveObject(
            selectableObjects[0]
        );

    } else {

        const selection =
            new fabric.ActiveSelection(

                selectableObjects,

                {
                    canvas: canvas
                }

            );

        canvas.setActiveObject(
            selection
        );

    }

    canvas.requestRenderAll();

}



function escapeSelection() {

    if (
        !isKeyboardCanvasReady()
    ) {
        return;
    }

    const active =
        canvas.getActiveObject();

    if (
        active &&
        active.isEditing
    ) {

        active.exitEditing();

        canvas.requestRenderAll();

        return;

    }

    canvas.discardActiveObject();

    canvas.requestRenderAll();

}



document.addEventListener(
    "keydown",
    function (event) {

        if (
            isTypingTarget(
                event.target
            )
        ) {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }

        }

        if (
            event.key ===
            "Delete"
        ) {

            event.preventDefault();

            deleteObject();

            return;

        }

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            event.key.toLowerCase() ===
                "c"
        ) {

            event.preventDefault();

            copyObject();

            return;

        }

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            event.key.toLowerCase() ===
                "v"
        ) {

            event.preventDefault();

            pasteObject();

            return;

        }

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            event.key.toLowerCase() ===
                "d"
        ) {

            event.preventDefault();

            duplicateObject();

            return;

        }

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            event.key.toLowerCase() ===
                "a"
        ) {

            event.preventDefault();

            selectAllObjects();

            return;

        }

        if (
            event.key ===
            "Escape"
        ) {

            event.preventDefault();

            escapeSelection();

        }

    }
);



window.copyObject =
    copyObject;

window.pasteObject =
    pasteObject;

window.deleteObject =
    deleteObject;

window.duplicateObject =
    duplicateObject;

window.selectAllObjects =
    selectAllObjects;

window.escapeSelection =
    escapeSelection;

console.log(
    "ASTRA: Keyboard Shortcuts Loaded Successfully."
);